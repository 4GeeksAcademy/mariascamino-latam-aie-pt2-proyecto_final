"""
routers/reporting.py — Business reporting endpoints for HealthCore.

Three endpoints, all under /reporting/, separate from /telemetry/:

  GET  /reporting/monthly-clinic-supply-performance
       Returns the KPI rows from reporting.monthly_clinic_supply_performance.
       This is what the Part 3 dashboard will consume.

  GET  /reporting/pipeline-runs/latest
       Returns metadata of the most recent pipeline run.

  POST /reporting/pipeline-runs
       Triggers a manual pipeline run asynchronously (202 Accepted).

No ETL logic lives here. All orchestration is imported from data/pipelines/pipeline.py.
"""
from __future__ import annotations

import sys
import threading
from datetime import date
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text

from database import engine
from security import get_current_user

# ---------------------------------------------------------------------------
# Add data/pipelines/ to sys.path so we can import the Prefect flow + helpers.
# Path: routers/ → api/ → services/ → (repo root) → data/pipelines/
# ---------------------------------------------------------------------------
_REPO_ROOT = Path(__file__).resolve().parents[3]
_PIPELINES_DIR = _REPO_ROOT / "data" / "pipelines"
if str(_PIPELINES_DIR) not in sys.path:
    sys.path.insert(0, str(_PIPELINES_DIR))

from pipeline import (  # noqa: E402
    ensure_reporting_tables,
    monthly_clinic_supply_performance_flow,
    _previous_month_start,
)

router = APIRouter(
    prefix="/reporting",
    tags=["reporting"],
    dependencies=[Depends(get_current_user)],  # same auth as /telemetry/report
)


def _init_tables() -> None:
    """Ensure reporting schema + tables exist (idempotent, called on first use)."""
    ensure_reporting_tables(engine)


# ---------------------------------------------------------------------------
# GET /reporting/monthly-clinic-supply-performance
# ---------------------------------------------------------------------------

@router.get("/monthly-clinic-supply-performance")
def get_monthly_clinic_supply_performance(
    month_start: date = Query(
        default=None,
        description="First day of the month (YYYY-MM-01). Defaults to the most recently computed month.",
    ),
) -> dict[str, Any]:
    """
    Returns the four KPIs for every clinic for the requested month:
      - total_supply_cost          (Supply Cost per Clinic)
      - supply_consumption_count   (Supply Consumption Volume)
      - critical_stockout_count    (Critical Stockout Frequency)
      - expiry_risk_count          (Expiry Risk Count)

    Response shape matches the contract in company-BRIEFING.md §6.
    This is the endpoint the Part 3 dashboard consumes.
    """
    _init_tables()

    # Resolve default month: most recently computed in the reporting table
    if month_start is None:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT MAX(month_start) FROM reporting.monthly_clinic_supply_performance")
            ).fetchone()
        if row and row[0]:
            month_start = row[0]
        else:
            month_start = _previous_month_start()

    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT clinic_id, country, month_start,
                       total_supply_cost, supply_consumption_count,
                       critical_stockout_count, expiry_risk_count, currency
                FROM   reporting.monthly_clinic_supply_performance
                WHERE  month_start = :month_start
                ORDER  BY country, clinic_id
            """),
            {"month_start": month_start},
        ).fetchall()

    return {
        "month_start": month_start.isoformat() if hasattr(month_start, "isoformat") else str(month_start),
        "clinics": [
            {
                "clinic_id": r.clinic_id,
                "country": r.country,
                "total_supply_cost": float(r.total_supply_cost),
                "supply_consumption_count": int(r.supply_consumption_count),
                "critical_stockout_count": int(r.critical_stockout_count),
                "expiry_risk_count": int(r.expiry_risk_count),
                "currency": r.currency,
            }
            for r in rows
        ],
    }


# ---------------------------------------------------------------------------
# GET /reporting/pipeline-runs/latest
# ---------------------------------------------------------------------------

@router.get("/pipeline-runs/latest")
def get_latest_pipeline_run() -> dict[str, Any]:
    """
    Returns the metadata of the most recent pipeline run from reporting.pipeline_runs.
    Fields: run_id, flow_name, month_start, started_at, ended_at, status,
            records_read, records_written, clinics_processed, error_message.
    """
    _init_tables()

    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT run_id, flow_name, month_start, started_at, ended_at,
                       status, records_read, records_written, clinics_processed,
                       error_message
                FROM   reporting.pipeline_runs
                ORDER  BY started_at DESC
                LIMIT  1
            """)
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="No pipeline runs found.")

    return {
        "run_id": str(row.run_id),
        "flow_name": row.flow_name,
        "month_start": row.month_start.isoformat() if row.month_start else None,
        "started_at": row.started_at.isoformat() if row.started_at else None,
        "ended_at": row.ended_at.isoformat() if row.ended_at else None,
        "status": row.status,
        "records_read": row.records_read,
        "records_written": row.records_written,
        "clinics_processed": row.clinics_processed,
        "error_message": row.error_message,
    }


# ---------------------------------------------------------------------------
# POST /reporting/pipeline-runs
# ---------------------------------------------------------------------------

def _run_pipeline_in_background(month_start: date) -> None:
    """Target for the background thread — calls the Prefect flow directly."""
    try:
        monthly_clinic_supply_performance_flow(month_start=month_start)
    except Exception as exc:
        # Errors are already logged to reporting.pipeline_runs by the flow's
        # finally block; swallow here so the daemon thread exits cleanly.
        print(f"[reporting] background pipeline run failed: {exc}")


@router.post("/pipeline-runs", status_code=202)
def trigger_pipeline_run(
    month_start: date = Query(
        default=None,
        description="First day of the month to process (YYYY-MM-01). Defaults to the previous calendar month.",
    ),
) -> dict[str, Any]:
    """
    Triggers a manual pipeline run asynchronously.

    Returns 202 Accepted immediately. The run executes in a background thread;
    poll GET /reporting/pipeline-runs/latest to track progress and final status.

    Use this endpoint to recompute a past month after late-arriving events.
    """
    _init_tables()

    if month_start is None:
        month_start = _previous_month_start()

    # Spawn a daemon thread so the HTTP response is not blocked.
    thread = threading.Thread(
        target=_run_pipeline_in_background,
        kwargs={"month_start": month_start},
        daemon=True,
    )
    thread.start()

    return {
        "accepted": True,
        "month_start": month_start.isoformat(),
        "message": (
            "Pipeline run started. "
            "Poll GET /reporting/pipeline-runs/latest to track progress."
        ),
    }
