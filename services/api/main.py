# main.py
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import init_db
from routers.inventory import router as inventory_router
from routes.auth import router as auth_router
from routes.incidents import router as incidents_router
from routes.profiles import router as profiles_router
from routes.suppliers import router as suppliers_router
from routes.users import router as users_router

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create the inventory tables in Supabase (SQLModel.metadata.create_all).
    init_db()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="HealthCore API",
    description="Proveedores e incidentes (TinyDB) e inventario de insumos médicos (Supabase) de HealthCore.",
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


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # The full error goes to the server log only; the client gets a generic message.
    logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our side. Please try again later."},
    )


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(suppliers_router)
app.include_router(incidents_router)
app.include_router(inventory_router)


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "supplier-directory-api"}
