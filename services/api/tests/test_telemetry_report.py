"""GET /telemetry/report and the metric functions in services/telemetry/analysis.py."""

import copy
import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from sqlalchemy import event as sa_event
from sqlmodel import Session, SQLModel

import database
from cache import cache
from routers.telemetry_report import resolve_period
from telemetry import analysis
from telemetry_schemas import TelemetryEvent
from telemetry_store import bulk_insert, to_row

SCHEMAS = Path(__file__).resolve().parents[3] / "docs" / "telemetry" / "event-schemas.json"
EXAMPLES = {
    name: d["examples"][0] for name, d in json.loads(SCHEMAS.read_text())["definitions"].items() if name != "envelope"
}

START = datetime(2026, 11, 10, tzinfo=timezone.utc)
END = datetime(2026, 11, 12, tzinfo=timezone.utc)


@pytest.fixture
def telemetry_db():
    database.init_db()
    yield
    SQLModel.metadata.drop_all(database.engine)


def _store(kind: str, when: datetime, **props):
    raw = copy.deepcopy(EXAMPLES[kind])
    raw["eventId"] = str(uuid.uuid4())
    raw["timestamp"] = when.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    raw["properties"].update(props)
    with Session(database.engine) as s:
        bulk_insert(s, [to_row(TelemetryEvent.model_validate(raw))])


def _at(day: int, hour: int = 12) -> datetime:
    return datetime(2026, 11, day, hour, tzinfo=timezone.utc)


@pytest.fixture
def seeded(telemetry_db):
    # Inside the window (Nov 10 and 11).
    _store("page_load_recorded", _at(10), metric="LCP", section="home", value=1000, rating="good")
    _store("page_load_recorded", _at(10, 13), metric="LCP", section="home", value=3000, rating="poor")
    _store("page_load_recorded", _at(11), metric="TTFB", section="suppliers", value=200, rating="good")
    _store("frontend_error_occurred", _at(11), section="home", error_name="TypeError", occurrence_count=3)
    _store("login_succeeded", _at(10))
    _store("login_failed", _at(10, 9))
    _store("login_failed", _at(10, 10))
    # Edges and outside the window: must never be counted.
    _store("page_load_recorded", START, metric="CLS", section="home", value=0.05, rating="good")  # inclusive start
    _store("page_load_recorded", END, metric="LCP", section="home", value=9999, rating="poor")  # exclusive end
    _store("page_load_recorded", _at(1), metric="LCP", section="home", value=9999, rating="poor")
    # A non-technical event inside the window: not part of the technical volume.
    _store("outbound_order_created", _at(10))


# ---------------------------------------------------------------- metrics
def test_events_per_day_counts_technical_events_inside_the_window(seeded):
    rows = analysis.events_per_day(START, END, engine=database.engine)
    by_key = {(r["day"], r["event_type"]): r["events"] for r in rows}
    assert by_key == {
        ("2026-11-10", "page_load_recorded"): 3,  # includes the event exactly at START
        ("2026-11-11", "page_load_recorded"): 1,
        ("2026-11-11", "frontend_error_occurred"): 1,
    }
    assert {r["service"] for r in rows} == {"backoffice"}


def test_web_vitals_groups_by_day_metric_and_section(seeded):
    rows = analysis.web_vitals_by_section(START, END, engine=database.engine)
    lcp = next(r for r in rows if r["day"] == "2026-11-10" and r["metric"] == "LCP")
    assert lcp == {
        "day": "2026-11-10", "metric": "LCP", "section": "home",
        "samples": 2, "mean": 2000.0, "max": 3000.0, "good_rate": 0.5,
    }
    assert all(r["max"] < 9999 for r in rows)  # outside-window rows never loaded


def test_error_rate_by_type_sums_occurrences(seeded):
    assert analysis.error_rate_by_type(START, END, engine=database.engine) == [
        {"day": "2026-11-11", "service": "backoffice", "error_type": "TypeError", "location": "home",
         "events": 1, "occurrences": 3.0}
    ]


def test_error_share_per_day_is_errors_over_all_technical_events(seeded):
    rows = analysis.error_share_per_day(START, END, engine=database.engine)
    nov11 = next(r for r in rows if r["day"] == "2026-11-11")
    assert (nov11["events"], nov11["errors"], nov11["error_rate"]) == (2, 1, 0.5)


def test_auth_failure_rate(seeded):
    assert analysis.auth_failure_rate(START, END, engine=database.engine) == [
        {"day": "2026-11-10", "attempts": 3, "failed": 2, "failure_rate": 0.6667}
    ]


@pytest.mark.parametrize("name,fn", analysis.METRICS)
def test_every_metric_returns_an_empty_list_on_an_empty_window(telemetry_db, name, fn):
    assert fn(START, END, engine=database.engine) == []


def test_metrics_filter_in_sql_not_in_pandas(seeded):
    """The LOAD step sends event_type and the time range to the database."""
    statements = []
    listener = lambda conn, cursor, statement, params, context, many: statements.append(statement)  # noqa: E731
    sa_event.listen(database.engine, "before_cursor_execute", listener)
    try:
        for _, fn in analysis.METRICS:
            fn(START, END, engine=database.engine)
    finally:
        sa_event.remove(database.engine, "before_cursor_execute", listener)
    selects = [s for s in statements if s.lstrip().upper().startswith("SELECT")]
    assert len(selects) == len(analysis.METRICS)
    for sql in selects:
        assert "event_type" in sql and ("IN (" in sql or "event_type = " in sql)
        assert "timestamp >= " in sql and "timestamp < " in sql


def test_naive_dates_are_treated_as_utc(seeded):
    naive = analysis.events_per_day(START.replace(tzinfo=None), END.replace(tzinfo=None), engine=database.engine)
    assert naive == analysis.events_per_day(START, END, engine=database.engine)


# ---------------------------------------------------------------- period
def test_default_period_is_last_seven_days():
    now = datetime(2026, 11, 23, 15, tzinfo=timezone.utc)
    assert resolve_period(None, None, now) == (now - timedelta(days=7), now)


def test_period_converts_offsets_to_utc():
    start = datetime(2026, 11, 10, 0, tzinfo=timezone(timedelta(hours=-5)))
    s, _ = resolve_period(start, datetime(2026, 11, 12, tzinfo=timezone.utc), datetime.now(timezone.utc))
    assert s == datetime(2026, 11, 10, 5, tzinfo=timezone.utc)


# ---------------------------------------------------------------- endpoint
def test_report_requires_login(client, telemetry_db):
    assert client.get("/telemetry/report").status_code == 401


def test_report_shape_and_values(client, seeded, user, auth_headers):
    res = client.get(
        "/telemetry/report",
        params={"start_date": "2026-11-10T00:00:00Z", "end_date": "2026-11-12T00:00:00Z"},
        headers=auth_headers(user),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["period"] == {"from": "2026-11-10T00:00:00Z", "to": "2026-11-12T00:00:00Z"}
    assert list(body["metrics"]) == [name for name, _ in analysis.METRICS]
    assert sum(r["events"] for r in body["metrics"]["events_per_day"]) == 5


def test_report_default_window_is_cached_for_60_seconds(client, telemetry_db, user, auth_headers):
    first = client.get("/telemetry/report", headers=auth_headers(user))
    second = client.get("/telemetry/report", headers=auth_headers(user))
    assert (first.headers["X-Cache"], second.headers["X-Cache"]) == ("MISS", "HIT")
    assert first.json()["period"] == second.json()["period"]
    period = first.json()["period"]
    span = datetime.fromisoformat(period["to"]) - datetime.fromisoformat(period["from"])
    assert span == timedelta(days=7)


def test_report_cache_is_keyed_by_window_and_expires(client, seeded, user, auth_headers, monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(cache, "_clock", lambda: clock[0])
    a = {"start_date": "2026-11-10T00:00:00Z", "end_date": "2026-11-12T00:00:00Z"}
    b = {"start_date": "2026-11-11T00:00:00Z", "end_date": "2026-11-12T00:00:00Z"}
    h = auth_headers(user)
    assert client.get("/telemetry/report", params=a, headers=h).headers["X-Cache"] == "MISS"
    assert client.get("/telemetry/report", params=b, headers=h).headers["X-Cache"] == "MISS"
    assert client.get("/telemetry/report", params=a, headers=h).headers["X-Cache"] == "HIT"
    clock[0] += 61
    assert client.get("/telemetry/report", params=a, headers=h).headers["X-Cache"] == "MISS"


@pytest.mark.parametrize(
    "params",
    [
        {"start_date": "2026-11-12T00:00:00Z", "end_date": "2026-11-10T00:00:00Z"},  # reversed
        {"start_date": "2026-01-01T00:00:00Z", "end_date": "2026-11-10T00:00:00Z"},  # > 90 days
        {"start_date": "not-a-date"},
    ],
)
def test_report_rejects_bad_windows(client, telemetry_db, user, auth_headers, params):
    assert client.get("/telemetry/report", params=params, headers=auth_headers(user)).status_code == 422
