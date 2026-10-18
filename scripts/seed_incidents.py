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


def main(csv_path: Path) -> None:
    with open(csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

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

        doc_id = incidents_table.insert(incident)
        if known is None:
            incident_seed_sources_table.insert({"source_id": source_id, "incident_doc_id": doc_id})
        else:
            incident_seed_sources_table.update({"incident_doc_id": doc_id}, doc_ids=[known.doc_id])
        inserted += 1

    print(f"Rows read from CSV : {len(rows)}")
    print(f"Inserted           : {inserted}")
    print(f"Already present    : {skipped}")
    print(f"Invalid / skipped  : {sum(invalid.values())}")
    for reason, count in invalid.most_common():
        print(f"  - {incident_rules.describe_reason(reason)}: {count}")

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
