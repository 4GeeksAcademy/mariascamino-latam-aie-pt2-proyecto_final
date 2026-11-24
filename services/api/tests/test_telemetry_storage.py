"""POST /telemetry/events — real collector (Phase 3).

Per-event validation (envelope with the unchanged TelemetryEvent model +
the event's JSON Schema from event-schemas.json), partial acceptance, one
bulk INSERT per batch into the append-only `telemetry_events` table.
"""

import copy
import re
import importlib
import json
import logging
import uuid
from pathlib import Path

import pytest
from sqlalchemy import event as sa_event
from sqlalchemy import func, select
from sqlmodel import Session, SQLModel

import database
import telemetry_config
from telemetry_schemas import MAX_EVENTS_PER_BATCH, TelemetryEvent
from telemetry_store import level_for, telemetry_events

API_DIR = Path(__file__).resolve().parents[1]
SCHEMAS = API_DIR.parents[1] / "docs" / "telemetry" / "event-schemas.json"
EXAMPLES = {
    name: definition["examples"][0]
    for name, definition in json.loads(SCHEMAS.read_text())["definitions"].items()
    if name != "envelope"
}


@pytest.fixture
def telemetry_db():
    database.init_db()
    yield
    SQLModel.metadata.drop_all(database.engine)


def _event(kind="outbound_order_created", **overrides):
    event = copy.deepcopy(EXAMPLES[kind])
    event["eventId"] = str(uuid.uuid4())
    event.update(overrides)
    return event


def _rows():
    with Session(database.engine) as s:
        return [dict(r._mapping) for r in s.execute(select(telemetry_events)).all()]


def _count():
    with Session(database.engine) as s:
        return s.execute(select(func.count()).select_from(telemetry_events)).scalar_one()


# ------------------------------------------------------------ partial acceptance
def test_mixed_batch_stores_the_valid_events_and_rejects_the_rest(client, telemetry_db):
    batch = [
        _event("outbound_order_created"),
        _event("page_viewed"),
        _event("outbound_order_created", eventId="not-a-uuid"),  # broken envelope
        _event("page_viewed", properties={**EXAMPLES["page_viewed"]["properties"], "patient_name": "x"}),  # outside allowlist
        _event("page_viewed", event_type="stock_level_snapshot"),  # unknown event_type
    ]

    response = client.post("/telemetry/events", json={"events": batch})

    assert response.status_code == 200
    assert response.json() == {"received": 5, "stored": 2, "rejected": 3}
    assert sorted(r["event_type"] for r in _rows()) == ["outbound_order_created", "page_viewed"]


def test_a_batch_of_only_invalid_events_is_still_a_200(client, telemetry_db):
    response = client.post("/telemetry/events", json={"events": [{"foo": 1}, "text", 42]})

    assert response.status_code == 200
    assert response.json() == {"received": 3, "stored": 0, "rejected": 3}
    assert _count() == 0


@pytest.mark.parametrize("event_type", sorted(EXAMPLES))
def test_every_event_of_the_approved_contract_is_stored(client, telemetry_db, event_type):
    response = client.post("/telemetry/events", json={"events": [_event(event_type)]})

    assert response.json() == {"received": 1, "stored": 1, "rejected": 0}
    assert _rows()[0]["event_type"] == event_type


@pytest.mark.parametrize(
    "mutate",
    [
        lambda e: e.update(timestamp="2026-11-23 14:03:12"),               # not ISO 8601 UTC with ms
        lambda e: e.update(actorType="user", userId=None),                  # user without userId
        lambda e: e.update(email="maria@example.com"),                      # field outside the envelope
        lambda e: e["properties"].pop("department"),                        # required property missing
        lambda e: e["properties"].update(department="patient_42"),          # value outside the enum
        lambda e: e["properties"].update(quantity="40"),                    # wrong type
        lambda e: e.update(schemaVersion="2.0.0"),                          # version not in the contract
    ],
)
def test_each_contract_violation_rejects_only_that_event(client, telemetry_db, mutate):
    bad = _event()
    mutate(bad)

    response = client.post("/telemetry/events", json={"events": [bad, _event()]})

    assert response.json() == {"received": 2, "stored": 1, "rejected": 1}


# ------------------------------------------------------------ mapping to the table
def test_row_mapping_follows_the_contract(client, telemetry_db):
    sent = _event("outbound_order_created")
    client.post("/telemetry/events", json={"events": [sent]})

    [row] = _rows()
    assert str(row["id"]) == sent["eventId"]
    assert row["timestamp"].isoformat().startswith(sent["timestamp"][:19])
    assert row["service"] == "api"  # envelope source of this example
    assert row["event_type"] == "outbound_order_created"
    assert row["level"] == "info"
    assert row["value"] == sent["properties"]["quantity"]
    assert row["message"].startswith("outbound_order_created · quantity=")
    # tags = allowlisted properties (BRIEFING dimensions intact) + envelope ids
    assert {k: row["tags"][k] for k in sent["properties"]} == sent["properties"]
    for key in ("sessionId", "userId", "actorType", "requestId", "schemaVersion", "environment"):
        assert row["tags"][key] == sent[key]
    assert {"clinic_id", "country", "region", "department", "product_category"} <= set(row["tags"])


def test_country_and_region_are_derived_by_the_server(client, telemetry_db):
    lying = _event("outbound_order_created")
    lying["properties"].update(clinic_id=10, country="US", region="TX")  # clinic 10 is London

    client.post("/telemetry/events", json={"events": [lying]})

    tags = _rows()[0]["tags"]
    assert (tags["country"], tags["region"]) == ("UK", "LND")


@pytest.mark.parametrize(
    "event_type,level",
    [
        ("frontend_error_occurred", "error"),
        ("api_error_occurred", "error"),
        ("direct_stock_edit_rejected", "warn"),
        ("login_failed", "warn"),
        ("stock_threshold_triggered", "warn"),
        ("page_viewed", "info"),
        ("inbound_order_created", "info"),
    ],
)
def test_level_is_derived_from_the_event_type(event_type, level):
    assert level_for(event_type) == level


def test_message_never_contains_free_text(client, telemetry_db):
    sent = _event("inbound_order_created")
    client.post("/telemetry/events", json={"events": [sent]})

    assert sent["properties"]["vendor_name"] not in _rows()[0]["message"]


# ------------------------------------------------------------ bulk + idempotency
def test_the_whole_batch_is_one_insert_statement(client, telemetry_db):
    inserts = []

    def count(conn, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("INSERT INTO TELEMETRY_EVENTS"):
            inserts.append(executemany)

    sa_event.listen(database.engine, "before_cursor_execute", count)
    try:
        batch = [_event("page_viewed") for _ in range(20)]
        assert client.post("/telemetry/events", json={"events": batch}).json()["stored"] == 20
    finally:
        sa_event.remove(database.engine, "before_cursor_execute", count)

    assert inserts == [False]  # exactly one statement, not executemany / one per event
    assert _count() == 20


def test_a_resent_batch_is_stored_once(client, telemetry_db):
    batch = {"events": [_event("page_viewed"), _event("form_started")]}

    first = client.post("/telemetry/events", json=batch).json()
    again = client.post("/telemetry/events", json=batch).json()  # retry / sendBeacon duplicate

    assert first == again == {"received": 2, "stored": 2, "rejected": 0}
    assert _count() == 2


def test_the_store_never_updates_or_deletes():
    for name in ("telemetry_store.py", "routers/telemetry.py"):
        code = (API_DIR / name).read_text()
        assert not re.search(r"\b(update|delete)\s*\(", code)        # sqlalchemy update()/delete()
        assert not re.search(r"\b(UPDATE|DELETE FROM|TRUNCATE)\b", code)  # raw SQL
        assert "on_conflict_do_update" not in code


def test_migration_defines_columns_indexes_and_append_only_guard():
    sql = (API_DIR / "migrations" / "001_telemetry_events.sql").read_text().lower()
    for column in ("id          uuid", '"timestamp" timestamptz not null', "service     text        not null",
                   "event_type  text        not null", "level       text        not null default 'info'",
                   "value       numeric", "message     text", "tags        jsonb       not null default '{}'"):
        assert column in sql
    assert "default gen_random_uuid()" in sql
    assert 'on public.telemetry_events ("timestamp")' in sql
    assert "on public.telemetry_events (event_type)" in sql
    assert "using gin (tags)" in sql
    assert "before update or delete" in sql and "before truncate" in sql


# ------------------------------------------------------------ same contract as the stub
def test_accepts_text_plain_body_sent_by_send_beacon(client, telemetry_db):
    body = json.dumps({"events": [_event("page_viewed")]})
    response = client.post("/telemetry/events", content=body, headers={"Content-Type": "text/plain;charset=UTF-8"})

    assert response.json() == {"received": 1, "stored": 1, "rejected": 0}


def test_does_not_require_authentication(client, telemetry_db):
    assert client.post("/telemetry/events", json={"events": [_event("page_viewed")]}).status_code == 200


def test_empty_batch_is_a_no_op(client, telemetry_db):
    assert client.post("/telemetry/events", json={"events": []}).json() == {"received": 0, "stored": 0, "rejected": 0}


@pytest.mark.parametrize("body", [{}, [{"a": 1}], {"events": "nope"}])
def test_an_unreadable_envelope_is_a_422(client, telemetry_db, body):
    assert client.post("/telemetry/events", json=body).status_code == 422


def test_invalid_json_and_oversized_batches_are_refused(client, telemetry_db):
    assert client.post("/telemetry/events", content="{not json").status_code == 422
    too_many = {"events": [_event("page_viewed") for _ in range(MAX_EVENTS_PER_BATCH + 1)]}
    assert client.post("/telemetry/events", json=too_many).status_code == 422
    assert _count() == 0


def test_rejections_are_logged_without_values(client, telemetry_db, caplog):
    bad = _event("page_viewed", email="maria@example.com")
    with caplog.at_level(logging.INFO, logger="uvicorn.error.telemetry"):
        response = client.post("/telemetry/events", json={"events": [bad]})

    log = "\n".join(r.getMessage() for r in caplog.records)
    assert "received=1 stored=0 rejected=1" in log
    assert "maria@example.com" not in log + response.text


def test_telemetry_event_model_is_the_phase_2_contract():
    assert list(TelemetryEvent.model_fields) == [
        "eventId", "timestamp", "sessionId", "userId", "actorType", "event_type",
        "schemaVersion", "requestId", "source", "environment", "appVersion", "properties",
    ]
    assert TelemetryEvent.model_config["extra"] == "forbid"


def test_endpoint_url_comes_from_the_environment(monkeypatch):
    monkeypatch.setenv("TELEMETRY_ENDPOINT", "https://collector.example.com/telemetry/events")
    assert importlib.reload(telemetry_config).TELEMETRY_ENDPOINT == "https://collector.example.com/telemetry/events"
    monkeypatch.delenv("TELEMETRY_ENDPOINT")
    assert importlib.reload(telemetry_config).TELEMETRY_ENDPOINT == telemetry_config.DEFAULT_TELEMETRY_ENDPOINT


def test_request_id_is_kept_when_valid_and_generated_otherwise(client):
    rid = str(uuid.uuid4())
    assert client.get("/", headers={"X-Request-ID": rid}).headers["X-Request-ID"] == rid
    generated = client.get("/", headers={"X-Request-ID": "<script>"}).headers["X-Request-ID"]
    assert str(uuid.UUID(generated)) == generated
