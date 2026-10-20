"""Shared incident rules for HealthCore (CONTEXT-healthcore).

Used by BOTH scripts/seed_incidents.py and services/api/routes/incidents.py,
so validation never drifts between the seed and the API.
"""

from datetime import datetime, timezone

from incident_analysis import INVALID_RULES, classify_record

TITLE_MAX_LENGTH = 200   # limit for incidents created through the form
SEED_TITLE_LENGTH = 120  # CONTEXT: title = first 120 chars of the CSV description

BRANCHES = {
    "central": "Central — Austin Main Clinic",
    "austin_north": "Austin — North",
    "dallas_uptown": "Dallas Uptown",
    "houston_med_center": "Houston Medical Center",
    "san_antonio_west": "San Antonio West",
    "miami_brickell": "Miami Brickell",
    "miami_doral": "Miami Doral",
    "orlando_east": "Orlando East",
    "tampa_bay": "Tampa Bay",
    "atlanta_midtown": "Atlanta Midtown",
    "savannah": "Savannah",
    "london_city": "London City",
    "london_west": "London West End",
    "manchester_central": "Manchester Central",
}

CATEGORIES = [
    "clinical_equipment",
    "it_system",
    "billing_error",
    "compliance_breach",
    "patient_experience",
    "staff_issue",
    "facility_issue",
    "referral_issue",
    "other",
]

STATUSES = ["open", "in_progress", "resolved", "discarded"]
ORIGINS = ["customer", "branch", "internal"]

# Lifecycle: resolved and discarded are final states.
VALID_TRANSITIONS = {
    "open": ["in_progress", "discarded"],
    "in_progress": ["resolved", "discarded"],
    "resolved": [],
    "discarded": [],
}

FIELD_LABELS = {
    "title": "Title",
    "description": "Description",
    "category": "Category",
    "status": "Status",
    "origin": "Origin",
    "branch": "Branch",
}

CHOICES = {
    "category": CATEGORIES,
    "status": STATUSES,
    "origin": ORIGINS,
    "branch": list(BRANCHES),
}

# ---------------------------------------------------------------------------
# CSV -> model transformations (from CONTEXT-healthcore)
# ---------------------------------------------------------------------------

STATUS_MAP = {"OPEN": "open", "CLOSED": "resolved", "DISCARDED": "discarded"}

CATEGORY_MAP = {
    "APPOINTMENT": "patient_experience",
    "BILLING": "billing_error",
    "CLINICAL_CARE": "patient_experience",
    "ACCESSIBILITY": "patient_experience",
    "ADMINISTRATIVE": "other",
}

CLINIC_TO_BRANCH = {
    "US-TX-01": "central",
    "US-TX-02": "austin_north",
    "US-TX-03": "houston_med_center",
    "US-FL-01": "miami_brickell",
    "US-FL-02": "orlando_east",
    "US-FL-03": "tampa_bay",
    "US-GA-01": "atlanta_midtown",
    "US-GA-02": "atlanta_midtown",  # Buckhead rolls up to Atlanta Midtown
    "US-GA-03": "savannah",
    "UK-LON-01": "london_city",
    "UK-LON-02": "london_west",     # Kensington rolls up to London West End
    "UK-MAN-01": "manchester_central",
}

EXTRA_REASONS = {
    "invalid_date": "Invalid date",
    "empty_title": "Empty title after trimming",
    "unmapped_status": "Status could not be mapped",
    "unmapped_category": "Category could not be mapped",
}


def describe_reason(reason):
    return INVALID_RULES.get(reason) or EXTRA_REASONS.get(reason, reason)


# ---------------------------------------------------------------------------
# Validation used by the API
# ---------------------------------------------------------------------------

def validate_new_incident(data):
    """Returns {field: message}. Empty dict means the payload is valid."""
    if not isinstance(data, dict):
        return {"form": "The request body must be a JSON object."}

    errors = {}

    for field in ("title", "description"):
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            errors[field] = f"{FIELD_LABELS[field]} is required."

    title = data.get("title")
    if isinstance(title, str) and len(title.strip()) > TITLE_MAX_LENGTH:
        errors["title"] = f"Title must be {TITLE_MAX_LENGTH} characters or fewer."

    for field, allowed in CHOICES.items():
        value = data.get(field)
        if field == "status" and value in (None, ""):
            continue  # status is optional on creation and defaults to "open"
        if value in (None, ""):
            errors[field] = f"{FIELD_LABELS[field]} is required."
        elif not isinstance(value, str) or value not in allowed:
            errors[field] = f"{FIELD_LABELS[field]} must be one of: {', '.join(allowed)}."

    return errors


def normalize_new_incident(data):
    """Call only after validate_new_incident() returned no errors."""
    return {
        "title": data["title"].strip(),
        "description": data["description"].strip(),
        "category": data["category"],
        "status": data.get("status") or "open",
        "origin": data["origin"],
        "branch": data["branch"],
    }


def validate_filters(filters):
    errors = {}
    for field, allowed in CHOICES.items():
        value = filters.get(field)
        if value not in (None, "") and value not in allowed:
            errors[field] = f"{FIELD_LABELS[field]} must be one of: {', '.join(allowed)}."
    return errors


def validate_status_change(current_status, new_status):
    if not isinstance(new_status, str) or new_status not in STATUSES:
        return {"status": f"Status must be one of: {', '.join(STATUSES)}."}
    if new_status not in VALID_TRANSITIONS.get(current_status, []):
        return {"status": f"An incident cannot move from '{current_status}' to '{new_status}'."}
    return {}


# ---------------------------------------------------------------------------
# Used by the seed script
# ---------------------------------------------------------------------------

def transform_csv_row(row):
    """Returns (incident_dict, None) if valid, or (None, reason) if the row must be skipped."""
    reason = classify_record(row)  # SAME validation as the analyzer (no duplication)
    if reason is not None:
        return None, reason

    description = (row.get("description") or "").strip()
    title = description[:SEED_TITLE_LENGTH].strip()
    if not title:
        return None, "empty_title"

    status = STATUS_MAP.get((row.get("status") or "").strip())
    if status is None:
        return None, "unmapped_status"

    category = CATEGORY_MAP.get((row.get("category") or "").strip())
    if category is None:
        return None, "unmapped_category"

    branch = CLINIC_TO_BRANCH.get((row.get("clinic_id") or "").strip(), "central")

    try:
        created = datetime.strptime((row.get("date") or "").strip(), "%Y-%m-%d")
    except ValueError:
        return None, "invalid_date"
    created_at = created.replace(tzinfo=timezone.utc).isoformat()

    return (
        {
            "title": title,
            "description": description,
            "category": category,
            "status": status,
            "origin": "customer",
            "branch": branch,
            "created_at": created_at,
            "updated_at": created_at,
        },
        None,
    )
