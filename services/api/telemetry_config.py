# telemetry_config.py — telemetry settings, read from the environment.
#
# TELEMETRY_ENDPOINT is the collector URL. Today it points to this same API's
# stub (POST /telemetry/events); in Phase 3 the backend emitter
# (services/api/telemetry.py) will send its own events there, and the URL can
# move to a dedicated collector without touching code — same pattern as the
# backoffice's NEXT_PUBLIC_TELEMETRY_ENDPOINT.
import os

from dotenv import load_dotenv

load_dotenv()

DEFAULT_TELEMETRY_ENDPOINT = "http://localhost:8000/telemetry/events"

TELEMETRY_ENDPOINT: str = os.getenv("TELEMETRY_ENDPOINT") or DEFAULT_TELEMETRY_ENDPOINT
