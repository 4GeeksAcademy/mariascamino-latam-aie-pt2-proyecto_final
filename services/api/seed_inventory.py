# seed_inventory.py — loads the HealthCore BRIEFING seed data into Supabase.
# Run with:  uv run python seed_inventory.py
#
# Orders reference the UUID of a real TinyDB user, so register at least one
# user first (POST /users). Safe to run twice: it skips if supplies exist.
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
    {"sku": "HCR-PPE-001", "quantity": 120, "consumption_type": "clinical_use", "clinic_id": 1},
    {"sku": "HCR-PPE-002", "quantity": 40, "consumption_type": "clinical_use", "clinic_id": 10},
    {"sku": "HCR-WND-001", "quantity": 25, "consumption_type": "clinical_use", "clinic_id": 2},
    {"sku": "HCR-MED-001", "quantity": 10, "consumption_type": "expiry_waste", "clinic_id": 3},
]

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
            print("El inventario ya tiene datos. No se hizo nada.")
            return

        supplies = {}
        for data in SUPPLIES:
            supply = MedicalSupply(**data)
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
