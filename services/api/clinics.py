# clinics.py — server-side clinic registry (telemetry-plan.md §4.4).
#
# country/region are never trusted from the client (plan §5.3): the
# collector re-derives them from clinic_id with this registry. Clinics 7-9
# and 12 are provisional until Operations confirms them (risk R4); the
# registry is versioned, so stored events can be reprocessed.
CLINIC_REGISTRY_VERSION = "2026-11-20"

CLINICS: dict[int, dict[str, str]] = {
    1: {"country": "US", "region": "TX"},   # Austin Central
    2: {"country": "US", "region": "TX"},   # Austin North
    3: {"country": "US", "region": "TX"},   # San Antonio
    4: {"country": "US", "region": "FL"},   # Miami
    5: {"country": "US", "region": "FL"},   # Orlando
    6: {"country": "US", "region": "GA"},   # Atlanta
    7: {"country": "US", "region": "TX"},   # provisional (R4)
    8: {"country": "US", "region": "FL"},   # provisional (R4)
    9: {"country": "US", "region": "GA"},   # provisional (R4)
    10: {"country": "UK", "region": "LND"},  # London
    11: {"country": "UK", "region": "MAN"},  # Manchester
    12: {"country": "UK", "region": "LND"},  # provisional (R4)
}


def clinic_info(clinic_id) -> dict[str, str] | None:
    if isinstance(clinic_id, bool) or not isinstance(clinic_id, int):
        return None
    return CLINICS.get(clinic_id)
