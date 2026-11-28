# seed_load.py — realistic-volume data for performance / caching work.
#
# The regular seeds (seed.py, seed_inventory.py, scripts/seed_incidents.py)
# load a handful of rows: with that little data every endpoint looks fast and
# timing logs say nothing. This script grows the tables the heaviest reads
# touch, with VARIED data (names, categories, dates, clinics, quantities) so
# filters, aggregations and sorts behave like production.
#
#   uv run python seed_load.py                 # default volumes
#   uv run python seed_load.py --scale 0.1     # 10 % (quick local check)
#
# Default volumes (≈ one year of HealthCore activity, 12 clinics):
#   incidents ........ 6 000   (TinyDB)
#   suppliers ........   400   (TinyDB)
#   medical supplies .   240   (Supabase / SQLModel)
#   deliveries ....... 12 000  (Supabase / SQLModel)
#   consumptions ..... 12 000  (Supabase / SQLModel)
#
# Safe to run twice: rows created here are tagged (SKU prefix "LOAD-",
# supplier notes "[load-seed]", incident title prefix "[load]") and the script
# refuses to add a second batch on top of the first.
import argparse
import random
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

import shared_path  # noqa: F401  (adds packages/shared to sys.path)
import incident_rules
from database import engine, incidents_table, init_db, suppliers_table, users_table
from models import MedicalSupply, SupplyConsumption, SupplyDelivery
from security import ensure_user_uuid

RNG = random.Random(42)  # deterministic: two runs on empty DBs give the same data
NOW = datetime.now(timezone.utc)

# ---------------------------------------------------------------- incidents
INCIDENT_TEMPLATES = {
    "clinical_equipment": ["ECG monitor failed self-test", "Autoclave cycle aborted", "Infusion pump alarm without cause"],
    "it_system": ["EHR timed out during check-in", "Lab results not syncing to patient chart", "Printer queue stuck at reception"],
    "billing_error": ["Patient charged twice for visit", "Insurance code rejected by payer", "Copay not applied to invoice"],
    "compliance_breach": ["Patient record left visible on screen", "Consent form missing signature", "Sharps container overfilled"],
    "patient_experience": ["Wait time exceeded 45 minutes", "Appointment reschedule not communicated", "No Spanish-speaking staff available"],
    "staff_issue": ["Shift not covered at front desk", "Nurse rota published late", "Training session missed"],
    "facility_issue": ["Air conditioning down in waiting room", "Water leak in exam room 3", "Parking gate not opening"],
    "referral_issue": ["Specialist referral lost in queue", "Referral sent to wrong cardiologist", "Referral letter missing history"],
    "other": ["Lost property not logged", "Courier delivered to wrong clinic", "Phone line noisy"],
}
STATUS_WEIGHTS = {"open": 30, "in_progress": 20, "resolved": 40, "discarded": 10}


def _incident(i: int) -> dict:
    category = RNG.choice(incident_rules.CATEGORIES)
    title = RNG.choice(INCIDENT_TEMPLATES[category])
    branch = RNG.choice(list(incident_rules.BRANCHES))
    created = NOW - timedelta(days=RNG.randint(0, 365), minutes=RNG.randint(0, 1440))
    status = RNG.choices(list(STATUS_WEIGHTS), weights=list(STATUS_WEIGHTS.values()))[0]
    updated = created if status == "open" else created + timedelta(hours=RNG.randint(1, 240))
    return {
        "title": f"[load] {title} ({branch.replace('_', ' ')})",
        "description": f"{title}. Reported at {incident_rules.BRANCHES[branch]}. Ref L-{i:05d}.",
        "category": category,
        "status": status,
        "origin": RNG.choice(incident_rules.ORIGINS),
        "branch": branch,
        "created_at": created.isoformat(),
        "updated_at": min(updated, NOW).isoformat(),
    }


# ---------------------------------------------------------------- suppliers
VENDOR_WORDS = ["Medi", "Health", "Care", "Clini", "Bio", "Pharma", "Lab", "Vita", "Nova", "Prime", "Unity", "Apex"]
VENDOR_SUFFIX = ["Solutions", "Group", "Partners", "Services", "Systems", "Supplies", "Ltd", "Inc"]
SUPPLIER_CATEGORIES = [
    "medical_supplies", "laboratory_services", "pharmaceutical", "clinical_software", "it_infrastructure",
    "hr_and_payroll_software", "cleaning_and_facilities", "patient_communication",
    "billing_and_coding_software", "training_platforms",
]


def _supplier(i: int) -> dict:
    country = RNG.choice(["USA", "USA", "UK"])  # 9 of 12 clinics are in the US
    name = f"{RNG.choice(VENDOR_WORDS)}{RNG.choice(VENDOR_WORDS).lower()} {RNG.choice(VENDOR_SUFFIX)} #{i}"
    return {
        "name": name,
        "country": country,
        "categories": RNG.sample(SUPPLIER_CATEGORIES, k=RNG.randint(1, 3)),
        "monthly_rate": round(RNG.uniform(250, 15000), 2),
        "currency": "USD" if country == "USA" else "GBP",
        "status": "active" if RNG.random() < 0.85 else "suspended",
        "compliance_agreement": RNG.choice([None, "BAA", "DPA", "both"]),
        "contract_renewal_date": (NOW + timedelta(days=RNG.randint(30, 720))).date().isoformat(),
        "contact_email": f"accounts{i}@vendor{i}.example.com",
        "notes": "[load-seed] generated for performance testing",
        "updated_at": (NOW - timedelta(days=RNG.randint(0, 200))).isoformat(),
    }


# ---------------------------------------------------------------- inventory
SUPPLY_FAMILIES = [
    ("ppe", "box", ["Nitrile gloves", "Surgical mask", "Face shield", "Isolation gown", "Shoe covers"]),
    ("wound_care", "box", ["Adhesive dressing", "Gauze pad", "Hydrocolloid patch", "Elastic bandage", "Suture kit"]),
    ("diagnostics", "unit", ["Rapid strep test", "Glucose strips", "Urine dipstick", "COVID antigen test", "Pregnancy test"]),
    ("medications", "vial", ["Saline 500ml", "Lidocaine 1%", "Amoxicillin susp.", "Ibuprofen 400mg", "Insulin pen"]),
    ("consumables", "pack", ["Syringe 5ml", "Alcohol swab", "Tongue depressor", "Specimen cup", "Exam table paper"]),
]
VENDORS = ["MedLine Industries", "Bound Tree Medical", "Cardinal Health UK", "Henry Schein", "Owens & Minor", "NHS Supply Chain"]


DEPARTMENTS = ["primary_care", "specialty_care", "chronic_care", "preventive_care",
               "womens_health", "paediatric_care", "mental_health", "clinic_operations"]


def _seed_inventory(n_supplies: int, n_deliveries: int, n_consumptions: int, user_uuids: list[str]) -> None:
    init_db()
    with Session(engine) as session:
        if session.exec(select(MedicalSupply).where(MedicalSupply.sku.startswith("LOAD-"))).first():
            print("· inventario: ya hay datos de carga (LOAD-*), no se agregó nada.")
            return

        supplies = []
        for i in range(n_supplies):
            category, unit, names = SUPPLY_FAMILIES[i % len(SUPPLY_FAMILIES)]
            supply = MedicalSupply(
                name=f"{RNG.choice(names)} — size {RNG.choice(['S', 'M', 'L', 'XL', 'std'])}",
                sku=f"LOAD-{category[:3].upper()}-{i:04d}",
                category=category,
                unit=unit,
                country=RNG.choice(["US", "US", "UK"]),
            )
            session.add(supply)
            supplies.append(supply)
        session.flush()  # assigns ids

        delivered = {s.id: 0 for s in supplies}
        for _ in range(n_deliveries):
            s = RNG.choice(supplies)
            qty = RNG.randint(20, 400)
            delivered[s.id] += qty
            session.add(SupplyDelivery(
                supply_id=s.id, quantity=qty, vendor_name=RNG.choice(VENDORS),
                clinic_id=RNG.randint(1, 12), user_uuid=RNG.choice(user_uuids),
                created_at=NOW - timedelta(days=RNG.randint(30, 365), minutes=RNG.randint(0, 1440)),
            ))

        # Consumptions never exceed what was delivered for that supply
        # (the API enforces "no negative stock"; the data must respect it too).
        consumed = {s.id: 0 for s in supplies}
        for _ in range(n_consumptions):
            s = RNG.choice(supplies)
            room = delivered[s.id] - consumed[s.id]
            if room <= 0:
                continue
            qty = min(room, RNG.randint(1, 60))
            consumed[s.id] += qty
            waste = RNG.random() < 0.08
            session.add(SupplyConsumption(
                supply_id=s.id, quantity=qty,
                consumption_type="expiry_waste" if waste else "clinical_use",
                department=None if waste else RNG.choice(DEPARTMENTS),
                clinic_id=RNG.randint(1, 12), user_uuid=RNG.choice(user_uuids),
                created_at=NOW - timedelta(days=RNG.randint(0, 29), minutes=RNG.randint(0, 1440)),
            ))
        session.commit()
        print(f"· inventario: {n_supplies} insumos, {n_deliveries} entregas, {n_consumptions} consumos.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scale", type=float, default=1.0, help="multiplier for every volume (default 1.0)")
    args = parser.parse_args()
    k = args.scale

    users = users_table.all()
    if not users:
        raise SystemExit("No hay usuarios en TinyDB. Registra uno con POST /users y vuelve a correr el seed.")
    user_uuids = [ensure_user_uuid(u) for u in users]

    # TinyDB: insert_multiple writes the JSON file ONCE instead of once per row.
    if any(str(d.get("title", "")).startswith("[load]") for d in incidents_table.all()):
        print("· incidentes: ya hay datos de carga, no se agregó nada.")
    else:
        n = int(6000 * k)
        incidents_table.insert_multiple(_incident(i) for i in range(n))
        print(f"· incidentes: {n} insertados.")

    if any("[load-seed]" in str(d.get("notes", "")) for d in suppliers_table.all()):
        print("· proveedores: ya hay datos de carga, no se agregó nada.")
    else:
        n = int(400 * k)
        suppliers_table.insert_multiple(_supplier(i) for i in range(n))
        print(f"· proveedores: {n} insertados.")

    _seed_inventory(int(240 * k), int(12000 * k), int(12000 * k), user_uuids)
    print("Listo.")


if __name__ == "__main__":
    main()
