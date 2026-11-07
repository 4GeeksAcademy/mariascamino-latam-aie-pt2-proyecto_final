from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import JSONResponse

import shared_path  # noqa: F401  (adds packages/shared to sys.path)
import incident_rules
from database import incidents_table

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_response(doc) -> dict:
    data = dict(doc)
    data["id"] = doc.doc_id
    return data


def _validation_error(errors: dict) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Some fields are not valid.",
            "errors": [{"field": field, "message": message} for field, message in errors.items()],
        },
    )


@router.post("", status_code=201)
def create_incident(payload: dict = Body(...)):
    errors = incident_rules.validate_new_incident(payload)
    if errors:
        return _validation_error(errors)

    data = incident_rules.normalize_new_incident(payload)
    now = _now()
    data["created_at"] = now
    data["updated_at"] = now
    new_id = incidents_table.insert(data)
    return _to_response(incidents_table.get(doc_id=new_id))


@router.get("")
def list_incidents(
    status: str | None = Query(default=None),
    origin: str | None = Query(default=None),
    branch: str | None = Query(default=None),
    category: str | None = Query(default=None),
):
    filters = {"status": status, "origin": origin, "branch": branch, "category": category}
    errors = incident_rules.validate_filters(filters)
    if errors:
        return _validation_error(errors)

    docs = incidents_table.all()
    for field, value in filters.items():
        if value:
            docs = [d for d in docs if d.get(field) == value]

    docs.sort(key=lambda d: (d.get("created_at", ""), d.doc_id), reverse=True)
    return [_to_response(d) for d in docs]


# NOTE: /summary must be declared BEFORE /{incident_id}, otherwise "summary"
# would be treated as an id.
@router.get("/summary")
def get_summary():
    docs = incidents_table.all()

    def count(field: str, allowed: list[str]) -> dict:
        counter = Counter(d.get(field) for d in docs)
        return {value: counter.get(value, 0) for value in allowed}

    return {
        "total": len(docs),
        "by_status": count("status", incident_rules.STATUSES),
        "by_category": count("category", incident_rules.CATEGORIES),
        "by_origin": count("origin", incident_rules.ORIGINS),
        "by_branch": count("branch", list(incident_rules.BRANCHES)),
    }


@router.get("/{incident_id}")
def get_incident(incident_id: int):
    doc = incidents_table.get(doc_id=incident_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return _to_response(doc)


@router.patch("/{incident_id}/status")
def update_incident_status(incident_id: int, payload: dict = Body(...)):
    doc = incidents_table.get(doc_id=incident_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Incident not found.")

    new_status = payload.get("status") if isinstance(payload, dict) else None
    errors = incident_rules.validate_status_change(doc["status"], new_status)
    if errors:
        return _validation_error(errors)

    incidents_table.update({"status": new_status, "updated_at": _now()}, doc_ids=[incident_id])
    return _to_response(incidents_table.get(doc_id=incident_id))
