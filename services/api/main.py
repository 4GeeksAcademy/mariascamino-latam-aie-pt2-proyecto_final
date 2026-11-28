# main.py
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import init_db
from schemas import HealthResponse
from routers.inventory import router as inventory_router
from routers.reporting import router as reporting_router
from routers.telemetry import router as telemetry_router
from routers.telemetry_report import router as telemetry_report_router
from telemetry_config import TELEMETRY_ENDPOINT
from routes.auth import router as auth_router
from routes.incidents import router as incidents_router
from routes.profiles import router as profiles_router
from routes.suppliers import router as suppliers_router
from routes.users import router as users_router

logger = logging.getLogger("uvicorn.error")
# One line per request with its duration. Uses uvicorn's logger so the lines
# show up in the normal `uvicorn main:app` output without extra config.
timing_logger = logging.getLogger("uvicorn.error.timing")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create the inventory tables in Supabase (SQLModel.metadata.create_all).
    init_db()
    logger.info("Telemetry collector endpoint (TELEMETRY_ENDPOINT): %s", TELEMETRY_ENDPOINT)
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
    # Let the browser (DevTools / fetch) read the timing and cache headers.
    expose_headers=["X-Response-Time-ms", "X-Cache", "X-Request-ID"],
)


def _valid_request_id(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(uuid.UUID(value))
    except ValueError:
        return None


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    """Measure every request: the evidence used in CACHING_REPORT.md to pick
    what to cache. The duration is also returned in the X-Response-Time-ms
    header so the measurement script (bench_latency.py) and the browser's
    Network tab can read it."""
    # Telemetry prerequisite P8: correlation id. A valid X-Request-ID from the
    # backoffice is kept (its telemetry events carry the same requestId);
    # otherwise one is generated. It is echoed back and written in the log line.
    request_id = _valid_request_id(request.headers.get("X-Request-ID")) or str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time-ms"] = f"{duration:.1f}"
    response.headers["X-Request-ID"] = request_id
    timing_logger.info(
        "%s %s → %s | %.1fms | cache=%s | req=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration,
        response.headers.get("X-Cache", "-"),
        request_id,
    )
    return response


# Mensajes en español para los errores de validación más comunes de Pydantic.
_VALIDATION_MESSAGES = {
    "missing": "Este campo es obligatorio.",
    "string_too_short": "El valor es demasiado corto.",
    "string_too_long": "El valor es demasiado largo.",
    "greater_than": "El valor es demasiado pequeño.",
    "greater_than_equal": "El valor es demasiado pequeño.",
    "less_than": "El valor es demasiado grande.",
    "less_than_equal": "El valor es demasiado grande.",
    "json_invalid": "El cuerpo de la solicitud no es un JSON válido.",
}


def _validation_message(error: dict) -> str:
    error_type = str(error.get("type", ""))
    if error_type in _VALIDATION_MESSAGES:
        return _VALIDATION_MESSAGES[error_type]
    if "email" in error_type or "email" in str(error.get("msg", "")).lower():
        return "Ingresa un email válido."
    return "El valor no es válido."


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # FastAPI's default 422 echoes the submitted values (`input`), which can
    # include passwords. We only return the field location and a clean message.
    detail = [
        {
            # A malformed JSON body has no field; point at "body" instead of a character offset.
            "loc": ["body"] if error.get("type") == "json_invalid" else [str(p) for p in error.get("loc", [])],
            "msg": _validation_message(error),
        }
        for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": detail})


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
app.include_router(reporting_router)
app.include_router(telemetry_router)
app.include_router(telemetry_report_router)


@app.get("/", response_model=HealthResponse)
def root() -> HealthResponse:
    return HealthResponse(status="ok", service="healthcore-api")
