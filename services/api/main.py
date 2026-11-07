# main.py
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes.auth import router as auth_router
from routes.incidents import router as incidents_router
from routes.profiles import router as profiles_router
from routes.suppliers import router as suppliers_router
from routes.users import router as users_router

logger = logging.getLogger("uvicorn.error")

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


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "supplier-directory-api"}
