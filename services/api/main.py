# main.py
from fastapi import FastAPI

from routes.suppliers import router as suppliers_router

app = FastAPI(
    title="HealthCore Supplier Directory API",
    description="Directorio centralizado de proveedores de HealthCore (clínicos y tecnológicos).",
    version="1.0.0",
)

app.include_router(suppliers_router)


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "supplier-directory-api"}