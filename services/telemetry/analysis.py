# services/telemetry/analysis.py — technical metrics over `telemetry_events`.
#
# Every metric follows the same pipeline, so they are easy to read side by side:
#
#   1. LOAD    — one SQL query that brings ONLY the rows the metric needs:
#                `event_type = …` / `event_type IN (…)` + the time window
#                (`timestamp >= start AND timestamp < end`). Never the whole table.
#   2. REFINE  — Pandas pulls the needed fields out of `tags` (JSONB) and drops
#                rows whose grouping dimension is missing.
#   3. TIME    — `pd.to_datetime(..., utc=True)` before grouping by day.
#   4. GROUP   — `groupby(...)` + `.count()` / `.sum()` / `.mean()`: no loops.
#   5. RETURN  — `.reset_index().to_dict(orient="records")`: JSON-ready rows.
#
# The functions are independent and side-effect free: they only SELECT, never
# write, never cache, never touch global state. Each one receives the same
# window (start inclusive, end exclusive, both UTC) so the report is coherent.
#
# They are operational metrics — volume, error rate, latency, availability of
# auth — not business ones (orders, stock, revenue live elsewhere).
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable

import pandas as pd
from sqlalchemy import JSON, DateTime, Numeric, Text, column, select, table
from sqlalchemy.engine import Engine

# Lightweight description of the table (no dependency on the API's models):
# only the columns the metrics read. The real DDL lives in
# services/api/migrations/001_telemetry_events.sql.
_events = table(
    "telemetry_events",
    column("timestamp", DateTime(timezone=True)),
    column("service", Text),
    column("event_type", Text),
    column("level", Text),
    column("value", Numeric(asdecimal=False)),
    column("tags", JSON),
)

# Technical events of the contract (docs/telemetry/event-schemas.json).
TECHNICAL_EVENTS = (
    "page_load_recorded",
    "api_latency_recorded",
    "slow_query_detected",
    "frontend_error_occurred",
    "api_error_occurred",
    "session_expired",
    "permission_denied",
    "telemetry_event_rejected",
)
ERROR_EVENTS = ("frontend_error_occurred", "api_error_occurred")
AUTH_EVENTS = ("login_succeeded", "login_failed")


# ------------------------------------------------------------------ helpers
def utc(value: datetime) -> datetime:
    """Naive datetimes are read as UTC; aware ones are converted to UTC."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _default_engine() -> Engine:
    # Imported lazily so this module has no import-time side effects and can
    # be used with any engine (tests pass their own).
    from database import engine

    return engine


def _load(
    event_types: Iterable[str] | str,
    start_date: datetime,
    end_date: datetime,
    columns: Iterable[str],
    engine: Engine | None,
) -> pd.DataFrame:
    """LOAD step: event_type filter + time window, executed in the database."""
    cols = [_events.c[name] for name in columns]
    if isinstance(event_types, str):
        type_filter = _events.c.event_type == event_types
    else:
        type_filter = _events.c.event_type.in_(tuple(event_types))
    query = select(*cols).where(
        type_filter,
        _events.c.timestamp >= utc(start_date),
        _events.c.timestamp < utc(end_date),
    )
    with (engine or _default_engine()).connect() as conn:
        rows = conn.execute(query).mappings().all()
    return pd.DataFrame(rows, columns=list(columns))


def _with_day(df: pd.DataFrame) -> pd.DataFrame:
    """TIME step: UTC timestamps, then the calendar day (UTC) as YYYY-MM-DD."""
    df = df.assign(timestamp=pd.to_datetime(df["timestamp"], utc=True))
    return df.assign(day=df["timestamp"].dt.strftime("%Y-%m-%d"))


def _tag_fields(df: pd.DataFrame, fields: Iterable[str]) -> pd.DataFrame:
    """REFINE step: copy fields out of the `tags` JSON into real columns."""
    tags = pd.json_normalize(df["tags"].tolist()).reindex(columns=list(fields))
    tags.index = df.index
    return df.drop(columns="tags").join(tags)


def _records(df: pd.DataFrame) -> list[dict[str, Any]]:
    """RETURN step. NaN (e.g. a mean over zero rows) becomes None for JSON."""
    out = df.reset_index().round(4)
    return out.astype(object).where(out.notna(), None).to_dict(orient="records")


# ------------------------------------------------------------------ metrics
def events_per_day(start_date: datetime, end_date: datetime, *, engine: Engine | None = None) -> list[dict]:
    """VOLUME — How many technical events does each service emit per day, and
    of which type? A sudden drop means a source stopped reporting; a spike in
    one type points at the problem before anyone opens a ticket."""
    df = _load(TECHNICAL_EVENTS, start_date, end_date, ["timestamp", "service", "event_type"], engine)
    if df.empty:
        return []
    df = _with_day(df).dropna(subset=["service", "event_type"])
    grouped = df.groupby(["day", "service", "event_type"])["timestamp"].count().rename("events")
    return _records(grouped)


def error_rate_by_type(start_date: datetime, end_date: datetime, *, engine: Engine | None = None) -> list[dict]:
    """ERROR RATE — Which errors happen, where, and how often? Frontend and API
    errors per day, grouped by error type (`error_name` / `error_class`) and
    section/route. `occurrences` sums the client-side dedup counter, so 1 row
    can stand for several identical crashes."""
    df = _load(ERROR_EVENTS, start_date, end_date, ["timestamp", "service", "event_type", "value", "tags"], engine)
    if df.empty:
        return []
    df = _tag_fields(_with_day(df), ["error_name", "error_class", "section", "route_template"])
    # One "error_type" and one "where" column for both sources.
    df = df.assign(
        error_type=df["error_name"].fillna(df["error_class"]),
        location=df["section"].fillna(df["route_template"]),
        occurrences=df["value"].fillna(1),
    ).dropna(subset=["error_type", "location"])
    grouped = df.groupby(["day", "service", "error_type", "location"]).agg(
        events=("timestamp", "count"), occurrences=("occurrences", "sum")
    )
    return _records(grouped)


def error_share_per_day(start_date: datetime, end_date: datetime, *, engine: Engine | None = None) -> list[dict]:
    """ERROR RATE (relative) — Out of all technical events a service sent that
    day, what fraction were errors (`level = 'error'`) and warnings? A rate is
    comparable across days with different traffic; a raw count is not."""
    df = _load(TECHNICAL_EVENTS, start_date, end_date, ["timestamp", "service", "level"], engine)
    if df.empty:
        return []
    df = _with_day(df).dropna(subset=["service", "level"])
    df = df.assign(is_error=(df["level"] == "error").astype(int), is_warn=(df["level"] == "warn").astype(int))
    grouped = df.groupby(["day", "service"]).agg(
        events=("timestamp", "count"),
        errors=("is_error", "sum"),
        warnings=("is_warn", "sum"),
        error_rate=("is_error", "mean"),
    )
    return _records(grouped)


def web_vitals_by_section(start_date: datetime, end_date: datetime, *, engine: Engine | None = None) -> list[dict]:
    """LATENCY — How fast do backoffice pages load for real users? Core Web
    Vitals (LCP, INP, TTFB in ms; CLS unitless) per day, metric and section:
    number of samples, mean, max and the share rated "good" by the browser."""
    df = _load("page_load_recorded", start_date, end_date, ["timestamp", "value", "tags"], engine)
    if df.empty:
        return []
    df = _tag_fields(_with_day(df), ["metric", "section", "rating"])
    df = df.dropna(subset=["metric", "section", "value"])
    df = df.assign(is_good=(df["rating"] == "good").astype(int))
    grouped = df.groupby(["day", "metric", "section"]).agg(
        samples=("value", "count"),
        mean=("value", "mean"),
        max=("value", "max"),
        good_rate=("is_good", "mean"),
    )
    return _records(grouped)


def auth_failure_rate(start_date: datetime, end_date: datetime, *, engine: Engine | None = None) -> list[dict]:
    """AVAILABILITY OF LOGIN — Of all login attempts each day, what fraction
    failed? login_failed / (login_failed + login_succeeded). A jump means a
    broken login flow or a credential-stuffing attempt."""
    df = _load(AUTH_EVENTS, start_date, end_date, ["timestamp", "event_type"], engine)
    if df.empty:
        return []
    df = _with_day(df).dropna(subset=["event_type"])
    df = df.assign(failed=(df["event_type"] == "login_failed").astype(int))
    grouped = df.groupby("day").agg(
        attempts=("failed", "count"), failed=("failed", "sum"), failure_rate=("failed", "mean")
    )
    return _records(grouped)


# Order = order in the report. Each entry is (name, function).
METRICS = (
    ("events_per_day", events_per_day),
    ("error_share_per_day", error_share_per_day),
    ("error_rate_by_type", error_rate_by_type),
    ("web_vitals_by_section", web_vitals_by_section),
    ("auth_failure_rate", auth_failure_rate),
)
