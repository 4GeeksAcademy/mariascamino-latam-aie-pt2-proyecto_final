# main.py
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.suppliers import router as suppliers_router

app = FastAPI(
    title="HealthCore Supplier Directory API",
    description="Directorio centralizado de proveedores de HealthCore (clínicos y tecnológicos).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    # Allowed origins come from the CORS_ORIGINS env var (comma-separated).
    # The backoffice normally calls the API through its own /api proxy, so CORS only matters
    # for direct calls from a browser (e.g. the Swagger docs or local development).
    allow_origins=[
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(suppliers_router)


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "supplier-directory-api"}