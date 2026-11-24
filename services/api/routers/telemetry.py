# routers/telemetry.py — POST /telemetry/events (TEMPORARY STUB).
#
# Phase 2 of the telemetry project: it only checks that the batches sent by
# the backoffice have the right shape, logs them and answers 200. Nothing is
# persisted. Phase 3 replaces the body of `receive_events` with the real
# collector (per-event allowlist validation against event-schemas.json and
# persistence in Supabase); the TelemetryEvent model and the URL stay.
import json
import logging

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import ValidationError

from telemetry_config import TELEMETRY_ENDPOINT
from telemetry_schemas import TelemetryBatch, TelemetryReceipt

logger = logging.getLogger("uvicorn.error.telemetry")

# No auth dependency on purpose: navigator.sendBeacon cannot send an
# Authorization header, and anonymous pages (login, forgot-password) also
# emit events. Phase 3 overwrites userId from the token when there is one
# (telemetry-plan.md §5.3) — the stub only inspects the shape.
router = APIRouter(prefix="/telemetry", tags=["telemetry"])

# Bigger than any legitimate batch (100 events × ~1 KB); protects the parser.
MAX_BODY_BYTES = 256 * 1024


@router.post("/events", response_model=TelemetryReceipt)
async def receive_events(request: Request) -> TelemetryReceipt:
    # The body is read by hand instead of declaring `batch: TelemetryBatch`:
    # sendBeacon sends it as text/plain (a CORS-safelisted type, so the
    # browser does not need a preflight while the tab is closing), and
    # FastAPI would only parse a JSON body when the content type is JSON.
    raw = await request.body()
    if len(raw) > MAX_BODY_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Batch too large")
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=422,
            detail=[{"loc": ["body"], "msg": "Body is not valid JSON"}],
        )

    try:
        batch = TelemetryBatch.model_validate(data)
    except ValidationError as exc:
        # Only where and what kind of error — never the submitted values.
        detail = [{"loc": [str(p) for p in e["loc"]], "msg": e["type"]} for e in exc.errors()]
        logger.warning("telemetry batch rejected: %d error(s) %s", len(detail), detail[:5])
        raise HTTPException(status_code=422, detail=detail)

    event_types = [e.event_type for e in batch.events]
    logger.info(
        "telemetry batch received: %d event(s) → %s (collector: %s)",
        len(batch.events),
        ", ".join(event_types),
        TELEMETRY_ENDPOINT,
    )
    return TelemetryReceipt(received=len(batch.events))
