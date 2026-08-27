"""
services/api/routers/incidents.py — Incident Analyzer endpoints.

Reuses the exact same validation and metric logic as scripts/analyze.py via
shared/incident_analysis.py — no duplicated business logic.

Compliance note (HIPAA / UK GDPR): `patient_id` values are never included in
any response, log, or error message from this router.
"""

import csv
import io

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from shared.incident_analysis import (
    REQUIRED_FIELDS,
    analyze,
    build_export_rows,
    results_to_dict,
)

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

# In-memory store for "the last analysis" — enough for this milestone
# (single-process dev server, no persistence requirement yet).
_last_results = None
_last_source_file = None


@router.post("/analyze")
async def analyze_incidents(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="The file is not valid UTF-8 text.")

    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="Could not parse a CSV header row.")

    missing_fields = [f for f in REQUIRED_FIELDS if f not in reader.fieldnames]
    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {', '.join(missing_fields)}",
        )

    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="The CSV file has no data rows.")

    results = analyze(rows)

    global _last_results, _last_source_file
    _last_results = results
    _last_source_file = file.filename

    return results_to_dict(results, source_file=file.filename)


@router.get("/results/export")
async def export_results():
    if _last_results is None:
        raise HTTPException(
            status_code=404,
            detail="No analysis has been run yet. Call POST /api/incidents/analyze first.",
        )

    rows = build_export_rows(_last_results)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["metric", "value", "percentage"])
    writer.writerows(rows)
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=results.csv"},
    )