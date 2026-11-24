"""POST /telemetry/events — Phase 2 stub (validates the envelope, logs, 200).

The fixtures in docs/telemetry/event-schemas.json are the approved contract:
every example event in that file must be accepted by the TelemetryEvent model.
"""

import json
import logging
import uuid
from pathlib import Path

import pytest

import telemetry_config
from telemetry_schemas import MAX_EVENTS_PER_BATCH, TelemetryEvent

SCHEMAS = Path(__file__).resolve().parents[3] / "docs" / "telemetry" / "event-schemas.json"


def _event(**overrides):
    event = {
        "eventId": str(uuid.uuid4()),
        "timestamp": "2026-11-23T14:03:12.481Z",
        "sessionId": str(uuid.uuid4()),
        "userId": str(uuid.uuid4()),
        "actorType": "user",
        "event_type": "page_viewed",
        "schemaVersion": "1.0.0",
        "requestId": str(uuid.uuid4()),
        "source": "backoffice",
        "environment": "development",
        "properties": {"section": "inventory_products", "route_template": "/inventory/products",
                       "referrer_section": None, "actor_role": "user"},
    }
    event.update(overrides)
    return event


def _schema_examples():
    data = json.loads(SCHEMAS.read_text())
    return [
        (name, example)
        for name, definition in data["definitions"].items()
        if name != "envelope"
        for example in definition.get("examples", [])
    ]


def test_accepts_a_batch_and_returns_the_count(client):
    response = client.post("/telemetry/events", json={"events": [_event(), _event(event_type="form_started")]})

    assert response.status_code == 200
    assert response.json() == {"received": 2}


def test_logs_count_and_event_types(client, caplog):
    with caplog.at_level(logging.INFO, logger="uvicorn.error.telemetry"):
        client.post("/telemetry/events", json={"events": [_event(), _event(event_type="outbound_order_created")]})

    line = next(r.getMessage() for r in caplog.records if "telemetry batch received" in r.getMessage())
    assert "2 event(s)" in line
    assert "page_viewed, outbound_order_created" in line


def test_accepts_text_plain_body_sent_by_send_beacon(client):
    body = json.dumps({"events": [_event()]})
    response = client.post(
        "/telemetry/events", content=body, headers={"Content-Type": "text/plain;charset=UTF-8"}
    )

    assert response.status_code == 200
    assert response.json() == {"received": 1}


def test_does_not_require_authentication(client):
    # sendBeacon cannot send an Authorization header.
    assert client.post("/telemetry/events", json={"events": [_event()]}).status_code == 200


@pytest.mark.parametrize("name,example", _schema_examples(), ids=lambda v: v if isinstance(v, str) else "")
def test_every_example_of_the_approved_contract_is_accepted(client, name, example):
    TelemetryEvent.model_validate(example)
    assert client.post("/telemetry/events", json={"events": [example]}).json() == {"received": 1}


@pytest.mark.parametrize(
    "body",
    [
        {},                                          # no events key
        {"events": []},                              # empty batch
        [_event()],                                  # bare array instead of {events: [...]}
        {"events": [_event()], "extra": 1},          # unknown top-level key
    ],
)
def test_rejects_a_malformed_batch(client, body):
    assert client.post("/telemetry/events", json=body).status_code == 422


@pytest.mark.parametrize(
    "overrides",
    [
        {"eventId": "not-a-uuid"},
        {"timestamp": "2026-11-23 14:03:12"},             # not ISO 8601 UTC with ms
        {"timestamp": "2026-11-23T09:03:12.481-05:00"},   # local time, not Z
        {"event_type": "PageViewed"},                      # not entity_action snake_case
        {"schemaVersion": "1"},
        {"source": "website"},
        {"environment": "prod"},
        {"actorType": "user", "userId": None},             # user without userId
        {"actorType": "anonymous"},                        # anonymous WITH userId
        {"actorType": "system", "userId": None},           # system event inside a session
        {"email": "maria@example.com"},                    # field outside the envelope
        {"properties": None},
    ],
)
def test_rejects_an_event_that_breaks_the_envelope(client, overrides):
    response = client.post("/telemetry/events", json={"events": [_event(**overrides)]})

    assert response.status_code == 422


def test_missing_envelope_field_is_rejected(client):
    event = _event()
    del event["requestId"]
    assert client.post("/telemetry/events", json={"events": [event]}).status_code == 422


def test_validation_errors_never_echo_the_submitted_values(client):
    response = client.post(
        "/telemetry/events", json={"events": [_event(email="maria@example.com", eventId="secret-value")]}
    )

    assert response.status_code == 422
    assert "maria@example.com" not in response.text
    assert "secret-value" not in response.text


def test_rejects_invalid_json_and_oversized_batches(client):
    assert client.post("/telemetry/events", content="{not json").status_code == 422
    too_many = {"events": [_event() for _ in range(MAX_EVENTS_PER_BATCH + 1)]}
    assert client.post("/telemetry/events", json=too_many).status_code == 422


def test_endpoint_url_comes_from_the_environment(monkeypatch):
    import importlib

    monkeypatch.setenv("TELEMETRY_ENDPOINT", "https://collector.example.com/telemetry/events")
    assert importlib.reload(telemetry_config).TELEMETRY_ENDPOINT == "https://collector.example.com/telemetry/events"
    monkeypatch.delenv("TELEMETRY_ENDPOINT")
    assert importlib.reload(telemetry_config).TELEMETRY_ENDPOINT == telemetry_config.DEFAULT_TELEMETRY_ENDPOINT


def test_request_id_is_kept_when_valid_and_generated_otherwise(client):
    rid = str(uuid.uuid4())
    assert client.get("/", headers={"X-Request-ID": rid}).headers["X-Request-ID"] == rid

    generated = client.get("/", headers={"X-Request-ID": "<script>"}).headers["X-Request-ID"]
    assert str(uuid.UUID(generated)) == generated
