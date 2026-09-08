# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.profiles import router as profiles_router
from routes.suppliers import router as suppliers_router
from routes.users import router as users_router

app = FastAPI(
    title="HealthCore Supplier Directory API",
    description="Directorio centralizado de proveedores de HealthCore (clínicos y tecnológicos).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://legendary-robot-697r5www65q7hjqj-3000.app.github.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(suppliers_router)


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "supplier-directory-api"}