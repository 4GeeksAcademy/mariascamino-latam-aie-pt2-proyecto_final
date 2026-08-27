"""
services/api/main.py — HealthCore Digital API

FastAPI application exposing the Incident Analyzer endpoints for the
backoffice frontend (uis/backoffice).

Run locally (from inside services/api/):
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Endpoints:
    POST /api/incidents/analyze          — upload a CSV, get the summary as JSON
    GET  /api/incidents/results/export   — download the last analysis as CSV
"""

import os
import sys

# Make the repo-root `shared/` package importable from this nested folder
# (services/api/ -> services/ -> repo root).
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.incidents import router as incidents_router

app = FastAPI(title="HealthCore Digital API", version="0.1.0")

# uis/backoffice runs on the default Next.js dev port during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents_router)


@app.get("/health")
async def health():
    return {"status": "ok"}