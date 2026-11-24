# seed_inventory.py — loads the HealthCore BRIEFING seed data into Supabase.
# Run with:  uv run python seed_inventory.py
#
# Orders reference the UUID of a real TinyDB user, so register at least one
# user first (POST /users). Safe to run twice: it skips if supplies exist.
from datetime import date, timedelta

from sqlmodel import Session, select

from database import engine, init_db, users_table
from models import MedicalSupply, SupplyConsumption, SupplyDelivery
from security import ensure_user_uuid

SUPPLIES = [
    {"name": "Nitrile gloves (box of 100)", "sku": "HCR-PPE-001", "category": "ppe", "unit": "box", "country": "US"},
    {"name": "Surgical mask (pack of 50)", "sku": "HCR-PPE-002", "category": "ppe", "unit": "pack", "country": "UK"},
    {"name": "Adhesive wound dressing", "sku": "HCR-WND-001", "category": "wound_care", "unit": "box", "country": "US"},
    {"name": "Rapid strep test kit", "sku": "HCR-DIAG-001", "category": "diagnostics", "unit": "unit", "country": "US"},
    {"name": "Blood glucose test strips (50)", "sku": "HCR-DIAG-002", "category": "diagnostics", "unit": "box", "country": "UK"},
    {"name": "0.9% Saline solution 500ml", "sku": "HCR-MED-001", "category": "medications", "unit": "vial", "country": "US"},
]

# Clinics 1-9 = US, 10-12 = UK
DELIVERIES = [
    {"sku": "HCR-PPE-001", "quantity": 500, "vendor_name": "MedLine Industries", "clinic_id": 1},
    {"sku": "HCR-PPE-001", "quantity": 300, "vendor_name": "Bound Tree Medical", "clinic_id": 4},
    {"sku": "HCR-PPE-002", "quantity": 200, "vendor_name": "Cardinal Health UK", "clinic_id": 10},
    {"sku": "HCR-WND-001", "quantity": 120, "vendor_name": "MedLine Industries", "clinic_id": 2},
    {"sku": "HCR-DIAG-002", "quantity": 150, "vendor_name": "Cardinal Health UK", "clinic_id": 11},
    {"sku": "HCR-MED-001", "quantity": 80, "vendor_name": "Bound Tree Medical", "clinic_id": 3},
]

CONSUMPTIONS = [
    {"sku": "HCR-PPE-001", "quantity": 120, "consumption_type": "clinical_use", "clinic_id": 1, "department": "primary_care"},
    {"sku": "HCR-PPE-002", "quantity": 40, "consumption_type": "clinical_use", "clinic_id": 10, "department": "chronic_care"},
    {"sku": "HCR-WND-001", "quantity": 25, "consumption_type": "clinical_use", "clinic_id": 2, "department": "specialty_care"},
    {"sku": "HCR-MED-001", "quantity": 10, "consumption_type": "expiry_waste", "clinic_id": 3},
]

# Telemetry prerequisites P2/P3: minimum stock per clinic and expiry dates.
# Chosen so the demo shows every mandatory event: e.g. consuming 40 gloves in
# clinic 1 (380 -> 340) crosses min_stock 350 (stock_threshold_triggered);
# the saline and the glucose strips are inside the 30/14-day expiry windows
# (supply_expiry_flagged). Dates are relative to the day the seed runs.
def _thresholds() -> dict[str, dict]:
    today = date.today()
    return {
        "HCR-PPE-001": {"min_stock": 350, "expiry_date": None},
        "HCR-PPE-002": {"min_stock": 100, "expiry_date": today + timedelta(days=200)},
        "HCR-WND-001": {"min_stock": 60, "expiry_date": None},
        "HCR-DIAG-001": {"min_stock": 20, "expiry_date": None},
        "HCR-DIAG-002": {"min_stock": 50, "expiry_date": today + timedelta(days=10)},
        "HCR-MED-001": {"min_stock": 50, "expiry_date": today + timedelta(days=20)},
    }


def backfill_thresholds(session: Session) -> int:
    """Set min_stock/expiry_date on seeded supplies that still have none
    (databases seeded before the telemetry prerequisites existed)."""
    updated = 0
    for sku, values in _thresholds().items():
        supply = session.exec(select(MedicalSupply).where(MedicalSupply.sku == sku)).first()
        if supply is not None and supply.min_stock is None:
            supply.min_stock = values["min_stock"]
            supply.expiry_date = values["expiry_date"]
            session.add(supply)
            updated += 1
    session.commit()
    return updated

# Expected current_stock after seeding:
#   HCR-PPE-001 680 | HCR-PPE-002 160 | HCR-WND-001 95
#   HCR-DIAG-001 0  | HCR-DIAG-002 150 | HCR-MED-001 70


def main() -> None:
    users = users_table.all()
    if not users:
        raise SystemExit("No hay usuarios en TinyDB. Registra uno con POST /users y vuelve a correr el seed.")
    user_uuid = ensure_user_uuid(users[0])

    init_db()
    with Session(engine) as session:
        if session.exec(select(MedicalSupply)).first() is not None:
            updated = backfill_thresholds(session)
            print(f"El inventario ya tiene datos. Se completaron min_stock/expiry_date en {updated} insumo(s).")
            return

        supplies = {}
        for data in SUPPLIES:
            supply = MedicalSupply(**data, **_thresholds()[data["sku"]])
            session.add(supply)
            supplies[data["sku"]] = supply
        session.flush()  # assigns the ids

        for data in DELIVERIES:
            data = dict(data)
            supply = supplies[data.pop("sku")]
            session.add(SupplyDelivery(**data, supply_id=supply.id, user_uuid=user_uuid))

        for data in CONSUMPTIONS:
            data = dict(data)
            supply = supplies[data.pop("sku")]
            session.add(SupplyConsumption(**data, supply_id=supply.id, user_uuid=user_uuid))

        session.commit()

    print(
        f"Seed listo: {len(SUPPLIES)} insumos, {len(DELIVERIES)} entregas, "
        f"{len(CONSUMPTIONS)} consumos (user_uuid={user_uuid})."
    )


if __name__ == "__main__":
    main()
