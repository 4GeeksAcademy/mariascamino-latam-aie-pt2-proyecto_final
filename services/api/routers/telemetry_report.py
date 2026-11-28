# routers/telemetry_report.py — GET /telemetry/report: the technical report.
#
# Resolves the time window ONCE (default: the last 7 days, UTC), passes the
# SAME window to every metric in services/telemetry/analysis.py and returns
#   {"period": {"from": ..., "to": ...}, "metrics": {"<name>": [records], ...}}
# The whole response is cached in memory for 60 s, keyed by the window.
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from cache import TELEMETRY_REPORT, TELEMETRY_REPORT_TTL, cache
from database import engine
from security import get_current_user

# services/telemetry lives next to services/api: put services/ on sys.path.
SERVICES_DIR = Path(__file__).resolve().parents[2]
if str(SERVICES_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICES_DIR))

from telemetry import analysis  # noqa: E402

DEFAULT_WINDOW = timedelta(days=7)
# Guard so a single request can never scan the table's whole history.
MAX_WINDOW = timedelta(days=90)

router = APIRouter(
    prefix="/telemetry",
    tags=["telemetry"],
    dependencies=[Depends(get_current_user)],  # operational data: logged-in users only
)


def resolve_period(start_date: datetime | None, end_date: datetime | None, now: datetime) -> tuple[datetime, datetime]:
    """[start, end) in UTC. Missing end → now; missing start → end - 7 days."""
    end = analysis.utc(end_date) if end_date else now
    start = analysis.utc(start_date) if start_date else end - DEFAULT_WINDOW
    if start >= end:
        raise HTTPException(status_code=422, detail=[{"loc": ["query", "start_date"], "msg": "start_date must be before end_date."}])
    if end - start > MAX_WINDOW:
        raise HTTPException(status_code=422, detail=[{"loc": ["query", "start_date"], "msg": "The window can be at most 90 days."}])
    return start, end


def _iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def build_report(start: datetime, end: datetime) -> dict:
    return {
        "period": {"from": _iso(start), "to": _iso(end)},
        "metrics": {name: fn(start, end, engine=engine) for name, fn in analysis.METRICS},
    }


@router.get("/report")
def telemetry_report(
    response: Response,
    start_date: datetime | None = Query(None, description="ISO 8601, inclusive. Default: end_date - 7 days."),
    end_date: datetime | None = Query(None, description="ISO 8601, exclusive. Default: now (UTC)."),
) -> dict:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    start, end = resolve_period(start_date, end_date, now)
    # The default window moves every request ("now"), so it gets its own key:
    # repeated default calls within 60 s share one result (and one period).
    key = ("default",) if start_date is None and end_date is None else (_iso(start), _iso(end))
    report, hit = cache.get_or_set(
        TELEMETRY_REPORT, *key, ttl=TELEMETRY_REPORT_TTL, compute=lambda: build_report(start, end)
    )
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return report
