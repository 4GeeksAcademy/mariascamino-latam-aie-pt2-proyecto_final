"""Seed historical incidents from the analyzer CSV (origin = "customer").

Run from services/api so the API's virtualenv is used:

    cd services/api
    uv run python ../../scripts/seed_incidents.py

Idempotent: re-running it does not duplicate records.
patient_id is never read, printed or stored.
"""

import csv
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "shared"))
sys.path.insert(0, str(ROOT / "services" / "api"))

import incident_rules  # noqa: E402
from database import incident_seed_sources_table, incidents_table  # noqa: E402
from tinydb import Query  # noqa: E402

DEFAULT_CSV = ROOT / "scripts" / "incidents-healthcore.csv"

# Expected totals after seeding an empty database (from CONTEXT-healthcore)
EXPECTED = {
    "status": {"open": 28, "resolved": 52, "discarded": 14},
    "category": {"patient_experience": 61, "billing_error": 20, "other": 13},
}


# Columns the transform needs; checked before processing anything.
REQUIRED_COLUMNS = {"incident_id", "date", "clinic_id", "category", "description", "status"}


def fail(message: str) -> None:
    """Print a clear error to stderr and stop with a non-zero exit code."""
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def read_rows(csv_path: Path) -> list[dict]:
    """Read the CSV. Each way the read can fail gets its own message."""
    try:
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            columns = set(reader.fieldnames or [])
            rows = list(reader)
    except FileNotFoundError:
        fail(f"CSV file not found: {csv_path}")
    except PermissionError:
        fail(f"No permission to read the CSV file: {csv_path}")
    except UnicodeDecodeError:
        fail("The CSV file is not valid UTF-8 text. Re-export it as UTF-8 and try again.")
    except csv.Error as exc:
        fail(f"The CSV file is malformed ({exc}).")
    except OSError as exc:
        fail(f"Could not read the CSV file ({type(exc).__name__}).")

    # Defensive checks before touching the database.
    if not columns:
        fail("The CSV file is empty (no header row).")
    missing = sorted(REQUIRED_COLUMNS - columns)
    if missing:
        fail(f"The CSV file is missing required columns: {', '.join(missing)}.")
    if not rows:
        fail("The CSV file has a header but no data rows.")
    return rows


def main(csv_path: Path) -> None:
    rows = read_rows(csv_path)

    Source = Query()
    inserted = 0
    skipped = 0
    invalid = Counter()

    for row in rows:
        incident, reason = incident_rules.transform_csv_row(row)
        if incident is None:
            invalid[reason] += 1
            continue

        # incident_id is ONLY used to detect duplicates (never stored on the incident).
        source_id = (row.get("incident_id") or "").strip() or f"{incident['title']}|{incident['created_at']}"
        known = incident_seed_sources_table.get(Source.source_id == source_id)

        if known is not None and incidents_table.contains(doc_id=known["incident_doc_id"]):
            skipped += 1
            continue

        try:
            doc_id = incidents_table.insert(incident)
            if known is None:
                incident_seed_sources_table.insert({"source_id": source_id, "incident_doc_id": doc_id})
            else:
                incident_seed_sources_table.update({"incident_doc_id": doc_id}, doc_ids=[known.doc_id])
        except OSError as exc:
            fail(f"Could not write to the database ({type(exc).__name__}) after inserting {inserted} incidents.")
        inserted += 1

    print(f"Rows read from CSV : {len(rows)}")
    print(f"Inserted           : {inserted}")
    print(f"Already present    : {skipped}")
    print(f"Invalid / skipped  : {sum(invalid.values())}")
    for reason, count in invalid.most_common():
        print(f"  - {incident_rules.describe_reason(reason)}: {count}")

    if inserted == 0 and skipped == 0:
        fail("None of the CSV rows could be imported. Check that the file has the expected format.")

    docs = incidents_table.all()
    print("\nTotals in the database (CONTEXT expects these after seeding an empty DB):")
    for field in ("status", "category"):
        counter = Counter(d.get(field) for d in docs)
        for value, expected in EXPECTED[field].items():
            actual = counter.get(value, 0)
            mark = "OK" if actual == expected else "CHECK"
            print(f"  {field:<8} {value:<20} {actual:>3} (expected {expected}) {mark}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV)
