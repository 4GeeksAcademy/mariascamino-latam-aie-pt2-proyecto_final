# telemetry_store.py — validation against the Phase 1 contract and
# append-only, bulk persistence of telemetry events in `telemetry_events`.
#
# Per event: (1) the envelope with the unchanged TelemetryEvent Pydantic model,
# (2) the event's own JSON Schema from docs/telemetry/event-schemas.json
# (known event_type, closed property allowlist, types, enums, PII-safe
# patterns). Valid events of a batch are written with ONE INSERT statement.
# This module only ever inserts: there is no update or delete path.
import json
import os
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator
from sqlalchemy import JSON, Column, DateTime, Index, Numeric, Table, Text, Uuid, text
from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Session, SQLModel

from clinics import clinic_info
from telemetry_schemas import TelemetryEvent

# ---------------------------------------------------------------- table
# Mirrors migrations/001_telemetry_events.sql, which is the source of truth
# on PostgreSQL (it adds gen_random_uuid(), the CHECK, the GIN index and the
# append-only triggers). This definition lets the code and the SQLite test
# database use the same table.
telemetry_events = Table(
    "telemetry_events",
    SQLModel.metadata,
    Column("id", Uuid, primary_key=True),
    Column("timestamp", DateTime(timezone=True), nullable=False),
    Column("service", Text, nullable=False),
    Column("event_type", Text, nullable=False),
    Column("level", Text, nullable=False, server_default=text("'info'")),
    Column("value", Numeric(asdecimal=False), nullable=True),
    Column("message", Text, nullable=True),
    Column("tags", JSON().with_variant(JSONB(), "postgresql"), nullable=False, server_default=text("'{}'")),
    Index("ix_telemetry_events_timestamp", "timestamp"),
    Index("ix_telemetry_events_event_type", "event_type"),
    Index("ix_telemetry_events_tags", "tags", postgresql_using="gin"),
)

MIGRATION_SQL = Path(__file__).parent / "migrations" / "001_telemetry_events.sql"

# ---------------------------------------------------------------- contract
DEFAULT_SCHEMA_PATH = Path(__file__).resolve().parents[2] / "docs" / "telemetry" / "event-schemas.json"


@lru_cache(maxsize=1)
def _validators() -> dict[str, Draft7Validator]:
    path = Path(os.getenv("TELEMETRY_SCHEMA_PATH") or DEFAULT_SCHEMA_PATH)
    schema = json.loads(path.read_text(encoding="utf-8"))
    definitions = schema["definitions"]
    return {
        name: Draft7Validator({"$ref": f"#/definitions/{name}", "definitions": definitions})
        for name in definitions
        if name != "envelope"
    }


def load_contract() -> int:
    """Load event-schemas.json once (fails fast at startup if it is missing)."""
    return len(_validators())


def contract_errors(raw: dict[str, Any]) -> list[str]:
    """Where the event breaks its event_type schema — paths only, never values."""
    validator = _validators().get(raw.get("event_type"))
    if validator is None:
        return ["event_type: unknown event type"]
    return sorted(
        {"/".join(str(p) for p in error.absolute_path) + f": {error.validator}" for error in validator.iter_errors(raw)}
    )


# ---------------------------------------------------------------- mapping
# level: technical errors are `error`; rejections, failures, threshold
# alerts and similar warnings are `warn`; everything else is `info`.
_ERROR_EVENTS = {"frontend_error_occurred", "api_error_occurred", "scheduled_job_failed", "email_delivery_failed"}
_WARN_EVENTS = {
    "stock_threshold_triggered",
    "stock_depleted",
    "supply_expiry_flagged",
    "session_expired",
    "slow_query_detected",
    "permission_denied",
}

# value: the main numeric measure of each event (the one a chart would plot).
VALUE_FIELDS = {
    "inbound_order_created": "quantity",
    "outbound_order_created": "quantity",
    "outbound_order_rejected": "quantity",
    "direct_stock_edit_rejected": "quantity",
    "stock_threshold_triggered": "deficit",
    "stock_threshold_recovered": "minutes_below_threshold",
    "supply_expiry_flagged": "days_to_expiry",
    "product_created": "min_stock",
    "login_succeeded": "failed_attempts_before",
    "session_expired": "session_age_minutes",
    "supplier_rate_changed": "change_pct",
    "incident_status_changed": "hours_in_previous_status",
    "form_submitted": "time_to_submit_ms",
    "form_abandoned": "time_spent_ms",
    "page_load_recorded": "value",
    "api_latency_recorded": "duration_ms",
    "slow_query_detected": "duration_ms",
    "api_error_occurred": "occurrence_count",
    "frontend_error_occurred": "occurrence_count",
    "email_delivery_failed": "occurrence_count",
    "scheduled_job_completed": "duration_ms",
    "telemetry_event_rejected": "occurrence_count",
}

# Envelope fields kept in tags for analytics (plan §12). eventId is the row id.
ENVELOPE_TAGS = ("sessionId", "userId", "actorType", "requestId", "schemaVersion", "environment", "appVersion")


def level_for(event_type: str) -> str:
    if event_type in _ERROR_EVENTS:
        return "error"
    if event_type in _WARN_EVENTS or event_type.endswith(("_rejected", "_failed")):
        return "warn"
    return "info"


def value_for(event_type: str, properties: dict[str, Any]) -> float | None:
    raw = properties.get(VALUE_FIELDS.get(event_type, ""))
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        return None
    return raw


def message_for(event_type: str, properties: dict[str, Any], value: float | None) -> str:
    """Readable one-liner built ONLY from ids, enums and numbers (never free text)."""
    parts = [event_type]
    if value is not None:
        parts.append(f"{VALUE_FIELDS[event_type]}={value:g}")
    if isinstance(properties.get("product_id"), int):
        parts.append(f"product {properties['product_id']}")
    if isinstance(properties.get("clinic_id"), int):
        parts.append(f"clinic {properties['clinic_id']}")
    for key in ("metric", "section", "form_id", "reason", "failure_reason", "exit_type", "expiry_bucket"):
        if isinstance(properties.get(key), str):
            parts.append(f"{key}={properties[key]}")
    return " · ".join(parts)


def _server_derived(properties: dict[str, Any]) -> dict[str, Any]:
    """country/region come from the server's clinic registry, not the client (plan §5.3).
    Only keys the event already carries are overwritten, so the allowlist holds."""
    info = clinic_info(properties.get("clinic_id"))
    if info is None:
        return properties
    fixed = dict(properties)
    for key in ("country", "region"):
        if key in fixed:
            fixed[key] = info[key]
    return fixed


def to_row(event: TelemetryEvent) -> dict[str, Any]:
    properties = _server_derived(event.properties)
    value = value_for(event.event_type, properties)
    envelope = event.model_dump(mode="json", include=set(ENVELOPE_TAGS))
    return {
        "id": event.eventId,
        "timestamp": datetime.fromisoformat(event.timestamp.replace("Z", "+00:00")),
        "service": event.source,
        "event_type": event.event_type,
        "level": level_for(event.event_type),
        "value": value,
        "message": message_for(event.event_type, properties, value),
        # Property keys are snake_case and envelope keys camelCase: they cannot collide.
        "tags": {**properties, **envelope},
    }


# ---------------------------------------------------------------- write
def bulk_insert(db: Session, rows: list[dict[str, Any]]) -> None:
    """Every valid event of the batch in ONE INSERT ... VALUES (...), (...).

    ON CONFLICT (id) DO NOTHING makes the write idempotent: delivery is
    at-least-once (fetch retries + sendBeacon), and a re-sent event has the
    same eventId, so it is stored once.
    """
    if not rows:
        return
    unique = list({row["id"]: row for row in rows}.values())
    dialect = db.get_bind().dialect.name
    insert = postgresql.insert if dialect == "postgresql" else sqlite.insert
    statement = insert(telemetry_events).values(unique).on_conflict_do_nothing(index_elements=["id"])
    db.execute(statement)
    db.commit()
