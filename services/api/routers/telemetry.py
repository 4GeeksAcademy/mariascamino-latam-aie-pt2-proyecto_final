# routers/telemetry.py — POST /telemetry/events: the real collector.
#
# Same URL and same request envelope as the Phase 2 stub, so the backoffice
# does not change. What happens inside:
#   1. the body is parsed LOOSELY ({"events": [raw, raw, ...]});
#   2. each raw event is validated on its own: envelope with the unchanged
#      TelemetryEvent model, then its event_type schema (allowlist) from
#      docs/telemetry/event-schemas.json;
#   3. invalid events are counted as rejected — the rest of the batch goes on;
#   4. all valid events are written to telemetry_events in ONE bulk INSERT.
# Answer: {"received": N, "stored": M, "rejected": R}, 200 whenever the
# envelope itself is readable. The backoffice only looks at the status code.
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import ValidationError
from sqlmodel import Session

from database import get_db
from telemetry_schemas import TelemetryEnvelope, TelemetryEvent, TelemetryReceipt
from telemetry_store import bulk_insert, contract_errors, load_contract, to_row

logger = logging.getLogger("uvicorn.error.telemetry")

# No auth dependency on purpose: navigator.sendBeacon cannot send an
# Authorization header, and anonymous pages (login) also emit events.
router = APIRouter(prefix="/telemetry", tags=["telemetry"])

# Bigger than any legitimate batch (100 events × ~1 KB); protects the parser.
MAX_BODY_BYTES = 256 * 1024

# Fail at import (= API startup) if event-schemas.json cannot be read.
load_contract()


def _envelope_errors(exc: ValidationError) -> list[str]:
    # Field paths and error types only — never the submitted values.
    return sorted({"/".join(str(p) for p in e["loc"]) + f": {e['type']}" for e in exc.errors()})


@router.post("/events", response_model=TelemetryReceipt)
async def receive_events(request: Request, db: Session = Depends(get_db)) -> TelemetryReceipt:
    # Read by hand: sendBeacon posts text/plain (CORS-safelisted, no
    # preflight while the tab closes) and FastAPI only parses JSON bodies.
    raw = await request.body()
    if len(raw) > MAX_BODY_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Batch too large")
    try:
        envelope = TelemetryEnvelope.model_validate(json.loads(raw))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=422, detail=[{"loc": ["body"], "msg": "Body is not valid JSON"}])
    except ValidationError as exc:
        # The ENVELOPE is unreadable (no `events` array, too many events):
        # nothing in it can be trusted, so the whole request is refused.
        detail = [{"loc": ["body", *(str(p) for p in e["loc"])], "msg": e["type"]} for e in exc.errors()]
        raise HTTPException(status_code=422, detail=detail)

    rows: list[dict[str, Any]] = []
    rejections: list[str] = []
    for index, item in enumerate(envelope.events):
        try:
            event = TelemetryEvent.model_validate(item)
        except ValidationError as exc:
            rejections.append(f"#{index} envelope {_envelope_errors(exc)[:3]}")
            continue
        errors = contract_errors(item)
        if errors:
            rejections.append(f"#{index} {event.event_type} {errors[:3]}")
            continue
        rows.append(to_row(event))

    bulk_insert(db, rows)

    receipt = TelemetryReceipt(received=len(envelope.events), stored=len(rows), rejected=len(rejections))
    logger.info(
        "telemetry batch: received=%d stored=%d rejected=%d → %s",
        receipt.received,
        receipt.stored,
        receipt.rejected,
        ", ".join(row["event_type"] for row in rows) or "-",
    )
    for reason in rejections:
        logger.warning("telemetry event rejected %s", reason)
    return receipt

