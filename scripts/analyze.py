#!/usr/bin/env python3
"""
analyze.py — HealthCore Patient Incident Report Analyzer

Reads a CSV export of patient incidents, separates valid from invalid /
incomplete records, and prints a summary of key metrics for the Patient
Experience team.

Usage:
    python analyze.py incidents-healthcore.csv

Compliance note (HIPAA / UK GDPR):
    `patient_id` is protected patient information. This script NEVER prints,
    logs, or exports any `patient_id` value — only aggregate counts.
"""

import csv
import sys
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


# ---------------------------------------------------------------------------
# Console rendering
# ---------------------------------------------------------------------------

LINE_WIDTH = 60


def pct(part, whole):
    return (part / whole * 100) if whole else 0.0


def fmt_row(prefix, label, value, suffix="", label_width=32):
    dots = "." * max(2, label_width - len(label))
    return f"  {prefix} {label} {dots} {value}{suffix}"


def print_report(results, source_file):
    r = results
    print("=" * LINE_WIDTH)
    print("  HEALTHCORE — PATIENT INCIDENT REPORT ANALYSIS")
    print(f"  Source file: {source_file}")
    print("=" * LINE_WIDTH)
    print()
    print(f"TOTAL RECORDS IN FILE .......... {r['total']}")
    print(f"  ├─ Valid records ................ {r['valid_total']}")
    print(f"  └─ Invalid / incomplete .......... {r['invalid_total']}")
    print()

    print("INVALID RECORDS BREAKDOWN")
    rule_items = list(INVALID_RULES.items())
    for i, (key, label) in enumerate(rule_items):
        connector = "└─" if i == len(rule_items) - 1 else "├─"
        count = r["invalid_counts"].get(key, 0)
        print(fmt_row(connector, label, count))
    print()

    print("BREAKDOWN BY CATEGORY (valid records)")
    for i, cat in enumerate(VALID_CATEGORIES):
        connector = "└─" if i == len(VALID_CATEGORIES) - 1 else "├─"
        count = r["category_counts"].get(cat, 0)
        percentage = pct(count, r["valid_total"])
        print(fmt_row(connector, cat, count, f"  ({percentage:.1f}%)"))
    print()

    print("BREAKDOWN BY STATUS (valid records)")
    for i, st in enumerate(VALID_STATUSES):
        connector = "└─" if i == len(VALID_STATUSES) - 1 else "├─"
        count = r["status_counts"].get(st, 0)
        percentage = pct(count, r["valid_total"])
        print(fmt_row(connector, st, count, f"  ({percentage:.1f}%)"))
    print()

    print("BREAKDOWN BY COUNTRY (valid records) — recommended")
    countries = ["US", "UK"]
    for i, c in enumerate(countries):
        connector = "└─" if i == len(countries) - 1 else "├─"
        count = r["country_counts"].get(c, 0)
        percentage = pct(count, r["valid_total"])
        print(fmt_row(connector, c, count, f"  ({percentage:.1f}%)"))
    print()

    print("SATISFACTION INDEX (closed cases)")
    closed_total = r["status_counts"].get("CLOSED", 0)
    print(f"  Scored cases: {r['scored_closed']} of {closed_total}")
    print(f"  Average score: {r['avg_score']:.2f} / 5.00")
    for i in range(1, 6):
        connector = "└─" if i == 5 else "├─"
        count = r["score_counts"].get(i, 0)
        label = f"Score {i} ({SATISFACTION_LABELS[i]})"
        print(fmt_row(connector, label, count))
    print()
    print("=" * LINE_WIDTH)


# ---------------------------------------------------------------------------
# CSV export
# ---------------------------------------------------------------------------

def export_results(results, output_path="results.csv"):
    r = results
    rows = []

    rows.append(("total_records", r["total"], ""))
    rows.append(("valid_records", r["valid_total"], ""))
    rows.append(("invalid_records", r["invalid_total"], ""))

    for key, label in INVALID_RULES.items():
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

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["metric", "value", "percentage"])
        writer.writerows(rows)

    return output_path


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def load_rows(csv_path):
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def main():
    if len(sys.argv) != 2:
        print("Usage: python analyze.py <path-to-incidents.csv>")
        sys.exit(1)

    csv_path = sys.argv[1]

    try:
        rows = load_rows(csv_path)
    except FileNotFoundError:
        print(f"Error: file not found: {csv_path}")
        sys.exit(1)
    except Exception as exc:
        print(f"Error reading CSV: {exc}")
        sys.exit(1)

    if not rows:
        print("Error: the CSV file is empty.")
        sys.exit(1)

    results = analyze(rows)
    print_report(results, csv_path)

    answer = input("Export results to CSV? [y / n]: ").strip().lower()
    if answer == "y":
        path = export_results(results)
        print(f"Results exported to {path}")
    else:
        print("Export skipped.")


if __name__ == "__main__":
    main()