#!/usr/bin/env python3
"""
analyze.py — HealthCore Patient Incident Report Analyzer (CLI)

Reads a CSV export of patient incidents, separates valid from invalid /
incomplete records, and prints a summary of key metrics for the Patient
Experience team.

Usage:
    python analyze.py incidents-healthcore.csv

Compliance note (HIPAA / UK GDPR):
    `patient_id` is protected patient information. This script NEVER prints,
    logs, or exports any `patient_id` value — only aggregate counts.

Validation and metric calculation live in shared/incident_analysis.py so the
same logic is used by the FastAPI backend (services/api) — see the
cross-cutting "no duplicated logic" requirement in the project README.
"""

import csv
import os
import sys

# Make the repo-root `shared/` package importable from this sibling folder.
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from shared.incident_analysis import (  # noqa: E402
    VALID_CATEGORIES,
    VALID_STATUSES,
    INVALID_RULES,
    SATISFACTION_LABELS,
    analyze,
    pct,
    build_export_rows,
)

LINE_WIDTH = 60


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


def export_results(results, output_path="results.csv"):
    rows = build_export_rows(results)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["metric", "value", "percentage"])
        writer.writerows(rows)
    return output_path


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