# Backend container: FastAPI Supplier Directory API.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# uv: fast Python package installer.
RUN pip install --no-cache-dir uv

WORKDIR /app

# Install dependencies first (cached layer, only rebuilt when requirements.txt changes).
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

# Copy the API source code (in development it is replaced by the bind mount).
COPY api/ .

EXPOSE 8000

# Seeds the TinyDB database (idempotent) and starts Uvicorn with hot reload.
# UVICORN_RELOAD=false disables --reload in production.
CMD ["sh", "-c", "python seed.py && if [ \"${UVICORN_RELOAD:-true}\" = \"true\" ]; then exec uvicorn main:app --host 0.0.0.0 --port ${API_PORT:-8000} --reload; else exec uvicorn main:app --host 0.0.0.0 --port ${API_PORT:-8000}; fi"]
