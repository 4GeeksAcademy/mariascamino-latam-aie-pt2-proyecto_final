"""
data/pipelines/pipeline.py — Monthly Clinic Supply Performance Pipeline
HealthCore · Business Performance Data Pipeline (Part 2 of 3)

Reads from:  public.telemetry_events  (read-only, never written to)
Writes to:   reporting.monthly_clinic_supply_performance
             reporting.pipeline_runs

Schedule:    CronSchedule("0 6 1 * *") — 06:00 UTC on the 1st of each month.
Run command: python data/pipelines/pipeline.py [--month YYYY-MM-DD]
             (activate the API venv first: source services/api/.venv/bin/activate)
"""
from __future__ import annotations

import argparse
import os
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv
from prefect import flow, task
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import NullPool

# ---------------------------------------------------------------------------
# Environment — load DATABASE_URL from services/api/.env
# ---------------------------------------------------------------------------
_REPO_ROOT = Path(__file__).resolve().parents[2]
_ENV_PATH = _REPO_ROOT / "services" / "api" / ".env"
load_dotenv(_ENV_PATH)

_RAW_DB_URL = os.getenv("DATABASE_URL", "")
if not _RAW_DB_URL:
    raise RuntimeError(
        "DATABASE_URL not found. Make sure services/api/.env exists and is populated."
    )

DATABASE_URL = (
    _RAW_DB_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
    if _RAW_DB_URL.startswith("postgresql://")
    else _RAW_DB_URL
)


def _get_engine() -> Engine:
    """Create a fresh SQLAlchemy engine (NullPool: no persistent connections)."""
    return create_engine(DATABASE_URL, poolclass=NullPool, pool_pre_ping=True)


# ---------------------------------------------------------------------------
# DDL — reporting schema + tables (idempotent)
# ---------------------------------------------------------------------------

_REPORTING_DDL = """
CREATE SCHEMA IF NOT EXISTS reporting;

CREATE TABLE IF NOT EXISTS reporting.monthly_clinic_supply_performance (
    id                       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id                text         NOT NULL,
    country                  text         NOT NULL,
    month_start              date         NOT NULL,
    total_supply_cost        numeric      NOT NULL DEFAULT 0,
    supply_consumption_count integer      NOT NULL DEFAULT 0,
    critical_stockout_count  integer      NOT NULL DEFAULT 0,
    expiry_risk_count        integer      NOT NULL DEFAULT 0,
    currency                 text         NOT NULL,
    computed_at              timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (clinic_id, month_start)
);

CREATE TABLE IF NOT EXISTS reporting.pipeline_runs (
    run_id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_name            text         NOT NULL,
    month_start          date         NOT NULL,
    started_at           timestamptz  NOT NULL,
    ended_at             timestamptz,
    status               text         NOT NULL
                         CHECK (status IN ('running', 'completed', 'failed')),
    records_read         integer,
    records_written      integer,
    clinics_processed    integer,
    error_message        text,
    prefect_flow_run_id  text
);
"""


def ensure_reporting_tables(engine: Engine) -> None:
    """Create the reporting schema and tables if they do not already exist."""
    with engine.begin() as conn:
        conn.execute(text(_REPORTING_DDL))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _month_window(month_start: date) -> tuple[datetime, datetime]:
    """Return [start, end) as timezone-aware UTC datetimes for a calendar month."""
    start = datetime(month_start.year, month_start.month, 1, tzinfo=timezone.utc)
    if month_start.month == 12:
        end = datetime(month_start.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(month_start.year, month_start.month + 1, 1, tzinfo=timezone.utc)
    return start, end


def _previous_month_start() -> date:
    """Return the first day of the previous calendar month."""
    today = date.today()
    first_of_this_month = today.replace(day=1)
    last_day_prev = first_of_this_month - timedelta(days=1)
    return last_day_prev.replace(day=1)


def _upsert_run_log(
    engine: Engine,
    run_id: str,
    month_start: date,
    started_at: datetime,
    ended_at: datetime | None,
    status: str,
    records_read: int,
    records_written: int,
    clinics_processed: int,
    error_message: str | None,
) -> None:
    """Write or overwrite a row in reporting.pipeline_runs."""
    sql = text("""
        INSERT INTO reporting.pipeline_runs (
            run_id, flow_name, month_start, started_at, ended_at,
            status, records_read, records_written, clinics_processed, error_message
        ) VALUES (
            :run_id, :flow_name, :month_start, :started_at, :ended_at,
            :status, :records_read, :records_written, :clinics_processed, :error_message
        )
        ON CONFLICT (run_id) DO UPDATE SET
            ended_at          = EXCLUDED.ended_at,
            status            = EXCLUDED.status,
            records_read      = EXCLUDED.records_read,
            records_written   = EXCLUDED.records_written,
            clinics_processed = EXCLUDED.clinics_processed,
            error_message     = EXCLUDED.error_message
    """)
    with engine.begin() as conn:
        conn.execute(sql, {
            "run_id": run_id,
            "flow_name": "monthly_clinic_supply_performance_flow",
            "month_start": month_start,
            "started_at": started_at,
            "ended_at": ended_at,
            "status": status,
            "records_read": records_read,
            "records_written": records_written,
            "clinics_processed": clinics_processed,
            "error_message": error_message,
        })


# ---------------------------------------------------------------------------
# Cache key — by month, not by DataFrame contents (DataFrames are not hashable)
# ---------------------------------------------------------------------------

def _month_transform_cache_key(context, parameters: dict) -> str:
    """
    Cache key for the transform task: month_start only.

    Rationale: for a given calendar month the telemetry source is immutable
    (append-only table, no updates). Two runs for the same month produce the
    same aggregates. Valid for 1 hour — long enough to cover a cron + manual
    trigger overlap without recomputing, short enough to pick up late events on
    a same-day recompute.
    """
    month_start = parameters.get("month_start", "unknown")
    return f"supply-transform-{month_start}"


# ---------------------------------------------------------------------------
# TASKS
# ---------------------------------------------------------------------------

@task(
    name="extract_telemetry_events",
    # 3 retries: Supabase transaction pooler drops connections transiently;
    # 3 attempts at 10-second intervals resolve the vast majority of such drops
    # without human intervention.
    retries=3,
    retry_delay_seconds=10,
    description="SELECT the 4 business event types from telemetry_events for the given month.",
)
def extract_telemetry_events(month_start: date) -> dict[str, pd.DataFrame]:
    """
    EXTRACT — 4 filtered SELECT queries, one per mandatory business event type.
    Returns a dict mapping event_type -> DataFrame.
    Source: public.telemetry_events (read-only).
    """
    engine = _get_engine()
    start_dt, end_dt = _month_window(month_start)

    event_types = [
        "inbound_order_created",
        "outbound_order_created",
        "stock_threshold_triggered",
        "supply_expiry_flagged",
    ]

    frames: dict[str, pd.DataFrame] = {}
    for etype in event_types:
        query = text("""
            SELECT
                "timestamp",
                event_type,
                tags->>'clinic_id'   AS clinic_id,
                tags->>'country'     AS country,
                tags->>'total_cost'  AS total_cost,
                tags->>'currency'    AS currency
            FROM public.telemetry_events
            WHERE event_type  = :etype
              AND "timestamp" >= :start_dt
              AND "timestamp" <  :end_dt
        """)
        with engine.connect() as conn:
            df = pd.read_sql(query, conn, params={
                "etype": etype,
                "start_dt": start_dt,
                "end_dt": end_dt,
            })
        frames[etype] = df

    return frames


@task(
    name="transform_to_clinic_monthly_aggregates",
    # Cache by month_start for 1 hour (see _month_transform_cache_key docstring).
    cache_key_fn=_month_transform_cache_key,
    cache_expiration=timedelta(hours=1),
    description="Normalize JSONB tags, group by clinic×country, aggregate the 4 KPIs.",
)
def transform_to_clinic_monthly_aggregates(
    raw_frames: dict[str, pd.DataFrame],
    month_start: date,
) -> pd.DataFrame:
    """
    TRANSFORM — produces one row per clinic for the given month with:
      total_supply_cost        (inbound_order_created · sum of total_cost)
      supply_consumption_count (outbound_order_created · row count)
      critical_stockout_count  (stock_threshold_triggered · row count)
      expiry_risk_count        (supply_expiry_flagged · row count)
    """

    def _count_agg(df: pd.DataFrame, col_name: str) -> pd.DataFrame:
        if df.empty or "clinic_id" not in df.columns:
            return pd.DataFrame(columns=["clinic_id", "country", col_name])
        df = df.dropna(subset=["clinic_id"])
        return (
            df.groupby(["clinic_id", "country"], as_index=False)
            .agg(**{col_name: ("clinic_id", "count")})
        )

    # --- Supply cost (inbound_order_created) ---
    inbound = raw_frames.get("inbound_order_created", pd.DataFrame())
    if not inbound.empty and "clinic_id" in inbound.columns:
        inbound = inbound.dropna(subset=["clinic_id"])
        inbound["total_cost"] = pd.to_numeric(inbound["total_cost"], errors="coerce").fillna(0)
        cost_df = (
            inbound.groupby(["clinic_id", "country"], as_index=False)
            .agg(total_supply_cost=("total_cost", "sum"), currency=("currency", "first"))
        )
    else:
        cost_df = pd.DataFrame(columns=["clinic_id", "country", "total_supply_cost", "currency"])

    consumption_df = _count_agg(
        raw_frames.get("outbound_order_created", pd.DataFrame()),
        "supply_consumption_count",
    )
    stockout_df = _count_agg(
        raw_frames.get("stock_threshold_triggered", pd.DataFrame()),
        "critical_stockout_count",
    )
    expiry_df = _count_agg(
        raw_frames.get("supply_expiry_flagged", pd.DataFrame()),
        "expiry_risk_count",
    )

    # Build the full clinic grid from the union of all clinic_ids seen
    clinic_frames = [
        df[["clinic_id", "country"]]
        for df in [cost_df, consumption_df, stockout_df, expiry_df]
        if not df.empty and "clinic_id" in df.columns
    ]
    if not clinic_frames:
        return pd.DataFrame(columns=[
            "clinic_id", "country", "month_start",
            "total_supply_cost", "supply_consumption_count",
            "critical_stockout_count", "expiry_risk_count",
            "currency", "computed_at",
        ])

    merged = pd.concat(clinic_frames).drop_duplicates(subset=["clinic_id"]).reset_index(drop=True)

    for agg_df, kpi_cols in [
        (cost_df, ["total_supply_cost", "currency"]),
        (consumption_df, ["supply_consumption_count"]),
        (stockout_df, ["critical_stockout_count"]),
        (expiry_df, ["expiry_risk_count"]),
    ]:
        if not agg_df.empty and "clinic_id" in agg_df.columns:
            merged = merged.merge(agg_df[["clinic_id"] + kpi_cols], on="clinic_id", how="left")

    # Fill nulls
    for col in ["total_supply_cost"]:
        if col not in merged.columns:
            merged[col] = 0.0
        else:
            merged[col] = merged[col].fillna(0.0)

    for col in ["supply_consumption_count", "critical_stockout_count", "expiry_risk_count"]:
        if col not in merged.columns:
            merged[col] = 0
        else:
            merged[col] = merged[col].fillna(0).astype(int)

    # Currency: derived from country, never mixed (USD ≠ GBP per BRIEFING)
    merged["currency"] = merged["country"].map({"US": "USD", "UK": "GBP"}).fillna("USD")

    merged["month_start"] = month_start
    merged["computed_at"] = datetime.now(timezone.utc)

    return merged


@task(
    name="load_to_reporting_table",
    # 3 retries: idempotent UPSERT means retrying is always safe; 15-second delay
    # lets a Supabase pgbouncer timeout clear before we try again.
    retries=3,
    retry_delay_seconds=15,
    description="UPSERT clinic aggregates into reporting.monthly_clinic_supply_performance.",
)
def load_to_reporting_table(aggregated: pd.DataFrame) -> int:
    """
    LOAD — idempotent UPSERT keyed on (clinic_id, month_start).
    Running twice over the same data produces the same result — no duplicates.
    Returns the number of rows written.
    """
    if aggregated.empty:
        return 0

    engine = _get_engine()
    upsert_sql = text("""
        INSERT INTO reporting.monthly_clinic_supply_performance (
            clinic_id, country, month_start,
            total_supply_cost, supply_consumption_count,
            critical_stockout_count, expiry_risk_count,
            currency, computed_at
        ) VALUES (
            :clinic_id, :country, :month_start,
            :total_supply_cost, :supply_consumption_count,
            :critical_stockout_count, :expiry_risk_count,
            :currency, :computed_at
        )
        ON CONFLICT (clinic_id, month_start)
        DO UPDATE SET
            total_supply_cost        = EXCLUDED.total_supply_cost,
            supply_consumption_count = EXCLUDED.supply_consumption_count,
            critical_stockout_count  = EXCLUDED.critical_stockout_count,
            expiry_risk_count        = EXCLUDED.expiry_risk_count,
            currency                 = EXCLUDED.currency,
            computed_at              = EXCLUDED.computed_at
    """)

    rows = aggregated.to_dict(orient="records")
    with engine.begin() as conn:
        for row in rows:
            conn.execute(upsert_sql, {
                "clinic_id": str(row["clinic_id"]),
                "country": str(row.get("country", "US")),
                "month_start": row["month_start"],
                "total_supply_cost": float(row.get("total_supply_cost", 0)),
                "supply_consumption_count": int(row.get("supply_consumption_count", 0)),
                "critical_stockout_count": int(row.get("critical_stockout_count", 0)),
                "expiry_risk_count": int(row.get("expiry_risk_count", 0)),
                "currency": str(row.get("currency", "USD")),
                "computed_at": row.get("computed_at", datetime.now(timezone.utc)),
            })

    return len(rows)


@task(
    name="save_eval_snapshot",
    description="[Optional] Write a CSV snapshot of aggregated data to data/eval/ for QA.",
)
def save_eval_snapshot(aggregated: pd.DataFrame, month_start: date) -> None:
    """
    OPTIONAL — saves a CSV snapshot to data/eval/ for manual quality assurance.
    Invoked with return_state=True so a failure does not abort the main ETL flow.
    """
    eval_dir = _REPO_ROOT / "data" / "eval"
    eval_dir.mkdir(parents=True, exist_ok=True)
    output_path = eval_dir / f"supply_performance_{month_start.isoformat()}.csv"
    aggregated.to_csv(output_path, index=False)
    print(f"[eval] snapshot saved → {output_path}")


# ---------------------------------------------------------------------------
# FLOW
# ---------------------------------------------------------------------------

@flow(
    name="monthly_clinic_supply_performance_flow",
    description=(
        "Monthly ETL: telemetry_events → reporting.monthly_clinic_supply_performance. "
        "Produces the Monthly Clinic Supply Performance Report for Dr. Okonkwo's board pack."
    ),
)
def monthly_clinic_supply_performance_flow(month_start: date | None = None) -> dict[str, Any]:
    """
    Main flow — extract → transform → load → optional eval snapshot.

    Args:
        month_start: First day of the month to process (YYYY-MM-01).
                     Defaults to the previous calendar month.

    Schedule: CronSchedule("0 6 1 * *") — 06:00 UTC on the 1st of each month.
    Run command: python data/pipelines/pipeline.py [--month YYYY-MM-DD]
    """
    if month_start is None:
        month_start = _previous_month_start()

    run_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc)
    engine = _get_engine()

    ensure_reporting_tables(engine)

    # Write "running" status at the start so the endpoint shows activity immediately
    _upsert_run_log(
        engine, run_id, month_start, started_at,
        None, "running", 0, 0, 0, None,
    )

    records_read = 0
    records_written = 0
    clinics_processed = 0
    error_message = None
    status = "failed"

    try:
        # --- EXTRACT ---
        raw_frames = extract_telemetry_events(month_start)
        records_read = sum(len(df) for df in raw_frames.values())

        # --- TRANSFORM ---
        aggregated = transform_to_clinic_monthly_aggregates(raw_frames, month_start)
        clinics_processed = len(aggregated)

        # --- LOAD ---
        records_written = load_to_reporting_table(aggregated)

        # --- OPTIONAL: eval snapshot (non-critical) ---
        # return_state=True means a failure here returns a Failed state object
        # instead of raising — the flow continues and the failure is logged below.
        snapshot_state = save_eval_snapshot(aggregated, month_start, return_state=True)
        if snapshot_state.is_failed():
            print(
                f"[WARN] eval snapshot failed (non-critical): "
                f"{snapshot_state.result(raise_on_failure=False)}"
            )

        status = "completed"

    except Exception as exc:
        error_message = str(exc)
        status = "failed"
        raise  # re-raise so Prefect marks the flow as Failed

    finally:
        # Always write the final log entry — even if the flow is about to raise
        _upsert_run_log(
            engine, run_id, month_start, started_at,
            datetime.now(timezone.utc), status,
            records_read, records_written, clinics_processed, error_message,
        )

    return {
        "run_id": run_id,
        "month_start": month_start.isoformat(),
        "status": status,
        "records_read": records_read,
        "records_written": records_written,
        "clinics_processed": clinics_processed,
    }


# ---------------------------------------------------------------------------
# CLI ENTRY POINT
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="HealthCore Monthly Clinic Supply Performance Pipeline",
        epilog="Example: python data/pipelines/pipeline.py --month 2026-07-01",
    )
    parser.add_argument(
        "--month",
        type=date.fromisoformat,
        default=None,
        metavar="YYYY-MM-DD",
        help="First day of the month to process (default: previous calendar month).",
    )
    args = parser.parse_args()
    result = monthly_clinic_supply_performance_flow(month_start=args.month)
    print("\n=== Pipeline result ===")
    for k, v in result.items():
        print(f"  {k}: {v}")
