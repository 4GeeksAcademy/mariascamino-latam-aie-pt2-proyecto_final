"""
shared/incident_analysis.py — HealthCore Incident Analyzer core logic.

This module holds the SINGLE source of truth for validation and metric
calculation, per the CONTEXT-healthcore.md rules for the incidents-file-
analysis milestone. It is imported by:

  - scripts/analyze.py            (Phase 1 — command-line script)
  - services/api/routers/incidents.py  (Phase 2 — FastAPI endpoint)

so the two never drift apart, per the project's cross-cutting requirement
("the analysis and validation logic is the same in the script and the API").

Compliance note (HIPAA / UK GDPR):
    `patient_id` is protected patient information. Nothing in this module
    returns, prints, or logs a `patient_id` value — only aggregate counts.
"""

from collections import Counter, OrderedDict

# ---------------------------------------------------------------------------
# Reference data — from CONTEXT-healthcore.md (incidents-file-analysis)
# ---------------------------------------------------------------------------

REQUIRED_FIELDS = [
    "incident_id",
    "date",
    "clinic_id",
    "country",
    "category",
    "description",
    "status",
    "patient_id",
]

# clinic_id -> country
VALID_CLINICS = {
    "US-TX-01": "US",
    "US-TX-02": "US",
    "US-TX-03": "US",
    "US-FL-01": "US",
    "US-FL-02": "US",
    "US-FL-03": "US",
    "US-GA-01": "US",
    "US-GA-02": "US",
    "US-GA-03": "US",
    "UK-LON-01": "UK",
    "UK-LON-02": "UK",
    "UK-MAN-01": "UK",
}

VALID_CATEGORIES = [
    "APPOINTMENT",
    "BILLING",
    "CLINICAL_CARE",
    "ACCESSIBILITY",
    "ADMINISTRATIVE",
]

VALID_STATUSES = ["OPEN", "CLOSED", "DISCARDED"]

PATIENT_ID_PATTERN_LEN = 6  # PAT-XXXXXX -> 6 chars after "PAT-"

SATISFACTION_LABELS = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
}

# Invalid-record rules, in priority order. Each record is assigned to the
# FIRST rule it violates, so every invalid record counts exactly once and
# the breakdown always adds up to the total invalid count.
INVALID_RULES = OrderedDict(
    [
        ("missing_or_invalid_clinic_id", "Invalid or missing clinic_id"),
        ("country_clinic_mismatch", "Country/clinic mismatch"),
        ("missing_or_invalid_category", "Invalid or missing category"),
        ("empty_description", "Empty description"),
        ("missing_or_invalid_patient_id", "Missing patient_id"),
        ("closed_without_score", "Closed case, no score"),
        ("score_out_of_range", "Satisfaction score out of range"),
    ]
)


def is_valid_patient_id(value):
    """Format check only — never returns or logs the value itself."""
    if not value or not value.startswith("PAT-"):
        return False
    suffix = value[4:]
    return len(suffix) == PATIENT_ID_PATTERN_LEN and suffix.isalnum()


def classify_record(row):
    """
    Returns None if the record is valid.
    Returns the INVALID_RULES key of the first rule it violates otherwise.
    Never includes patient_id values in the return value.
    """
    clinic_id = (row.get("clinic_id") or "").strip()
    country = (row.get("country") or "").strip()
    category = (row.get("category") or "").strip()
    description = (row.get("description") or "").strip()
    status = (row.get("status") or "").strip()
    patient_id = (row.get("patient_id") or "").strip()
    raw_score = (row.get("satisfaction_score") or "").strip()

    if clinic_id not in VALID_CLINICS:
        return "missing_or_invalid_clinic_id"

    if country != VALID_CLINICS[clinic_id]:
        return "country_clinic_mismatch"

    if category not in VALID_CATEGORIES:
        return "missing_or_invalid_category"

    if len(description) < 5:
        return "empty_description"

    if not is_valid_patient_id(patient_id):
        return "missing_or_invalid_patient_id"

    if status not in VALID_STATUSES:
        return "missing_or_invalid_category"

    if status == "CLOSED" and raw_score == "":
        return "closed_without_score"

    if raw_score != "":
        try:
            score = int(raw_score)
        except ValueError:
            return "score_out_of_range"
        if score < 1 or score > 5:
            return "score_out_of_range"

    return None


def analyze(rows):
    """Runs validation + metrics over parsed CSV rows (list of dicts)."""
    invalid_counts = Counter()
    category_counts = Counter()
    status_counts = Counter()
    country_counts = Counter()
    score_counts = Counter()

    valid_records = []
    invalid_total = 0

    for row in rows:
        reason = classify_record(row)
        if reason is not None:
            invalid_counts[reason] += 1
            invalid_total += 1
            continue

        valid_records.append(row)
        category_counts[row["category"].strip()] += 1
        status_counts[row["status"].strip()] += 1
        country_counts[row["country"].strip()] += 1

        raw_score = (row.get("satisfaction_score") or "").strip()
        if row["status"].strip() == "CLOSED" and raw_score != "":
            score_counts[int(raw_score)] += 1

    total = len(rows)
    valid_total = len(valid_records)
    scored_closed = sum(score_counts.values())
    avg_score = (
        sum(score * count for score, count in score_counts.items()) / scored_closed
        if scored_closed
        else 0.0
    )

    return {
        "total": total,
        "valid_total": valid_total,
        "invalid_total": invalid_total,
        "invalid_counts": invalid_counts,
        "category_counts": category_counts,
        "status_counts": status_counts,
        "country_counts": country_counts,
        "score_counts": score_counts,
        "scored_closed": scored_closed,
        "avg_score": avg_score,
    }


def pct(part, whole):
    return (part / whole * 100) if whole else 0.0


def build_export_rows(results):
    """
    Builds the flat (metric, value, percentage) rows used by both the
    script's CSV export and the API's /results/export endpoint, so the
    export format never drifts between the two.
    """
    r = results
    rows = []

    rows.append(("total_records", r["total"], ""))
    rows.append(("valid_records", r["valid_total"], ""))
    rows.append(("invalid_records", r["invalid_total"], ""))

    for key in INVALID_RULES:
        rows.append((f"invalid_{key}", r["invalid_counts"].get(key, 0), ""))

    for cat in VALID_CATEGORIES:
        count = r["category_counts"].get(cat, 0)
        rows.append((f"category_{cat.lower()}", count, f"{pct(count, r['valid_total']):.1f}"))

    for st in VALID_STATUSES:
        count = r["status_counts"].get(st, 0)
        rows.append((f"status_{st.lower()}", count, f"{pct(count, r['valid_total']):.1f}"))

    for c in ["US", "UK"]:
        count = r["country_counts"].get(c, 0)
        rows.append((f"country_{c.lower()}", count, f"{pct(count, r['valid_total']):.1f}"))

    rows.append(("satisfaction_scored_cases", r["scored_closed"], ""))
    rows.append(("satisfaction_average_score", f"{r['avg_score']:.2f}", ""))
    for i in range(1, 6):
        count = r["score_counts"].get(i, 0)
        rows.append((f"satisfaction_score_{i}", count, f"{pct(count, r['scored_closed']):.1f}"))

    return rows


def results_to_dict(results, source_file=None):
    """
    Converts the internal `analyze()` result (which uses Counter objects,
    not JSON-serialisable by default in every context) into a plain,
    JSON-ready dict for the API response. Never includes patient_id data.
    """
    r = results
    valid_total = r["valid_total"]
    closed_total = r["status_counts"].get("CLOSED", 0)

    return {
        "source_file": source_file,
        "total_records": r["total"],
        "valid_records": r["valid_total"],
        "invalid_records": r["invalid_total"],
        "invalid_breakdown": [
            {"rule": key, "label": label, "count": r["invalid_counts"].get(key, 0)}
            for key, label in INVALID_RULES.items()
        ],
        "category_breakdown": [
            {
                "category": cat,
                "count": r["category_counts"].get(cat, 0),
                "percentage": round(pct(r["category_counts"].get(cat, 0), valid_total), 1),
            }
            for cat in VALID_CATEGORIES
        ],
        "status_breakdown": [
            {
                "status": st,
                "count": r["status_counts"].get(st, 0),
                "percentage": round(pct(r["status_counts"].get(st, 0), valid_total), 1),
            }
            for st in VALID_STATUSES
        ],
        "country_breakdown": [
            {
                "country": c,
                "count": r["country_counts"].get(c, 0),
                "percentage": round(pct(r["country_counts"].get(c, 0), valid_total), 1),
            }
            for c in ["US", "UK"]
        ],
        "satisfaction": {
            "scored_cases": r["scored_closed"],
            "closed_cases": closed_total,
            "average_score": round(r["avg_score"], 2),
            "distribution": [
                {
                    "score": i,
                    "label": SATISFACTION_LABELS[i],
                    "count": r["score_counts"].get(i, 0),
                }
                for i in range(1, 6)
            ],
        },
    }