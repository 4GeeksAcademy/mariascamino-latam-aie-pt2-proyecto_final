"""Telemetry prerequisites in the inventory API (telemetry-plan.md §4.2).

P1 department · P2 expiry_date · P3 min_stock · P4 direct stock edit guard ·
P5 stock per clinic · P7 `sid` claim. Without them three of the five
mandatory BRIEFING metrics cannot be computed by the backoffice.
"""

from datetime import date, timedelta

import pytest
from jose import jwt
from sqlalchemy import inspect, text
from sqlmodel import SQLModel

import database
import security

SUPPLY = {"name": "Nitrile gloves", "sku": "HCR-PPE-T01", "category": "ppe", "unit": "box", "country": "US"}


@pytest.fixture
def inventory_db():
    database.init_db()
    yield
    SQLModel.metadata.drop_all(database.engine)


@pytest.fixture
def h(user, auth_headers):
    return auth_headers(user)


def _supply(client, h, **extra):
    res = client.post("/inventory/products", headers=h, json={**SUPPLY, **extra})
    assert res.status_code == 201, res.text
    return res.json()


def _inbound(client, h, supply_id, qty, clinic_id=1):
    return client.post(
        "/inventory/orders/inbound", headers=h,
        json={"supply_id": supply_id, "quantity": qty, "vendor_name": "MedLine", "clinic_id": clinic_id},
    )


def _outbound(client, h, supply_id, qty, clinic_id=1, **extra):
    body = {"supply_id": supply_id, "quantity": qty, "consumption_type": "clinical_use",
            "clinic_id": clinic_id, "department": "primary_care", **extra}
    return client.post("/inventory/orders/outbound", headers=h, json=body)


# ------------------------------------------------------------ P2 / P3
def test_product_stores_expiry_date_and_min_stock(client, h, inventory_db):
    expiry = (date.today() + timedelta(days=20)).isoformat()
    created = _supply(client, h, expiry_date=expiry, min_stock=50)

    assert created["expiry_date"] == expiry
    assert created["min_stock"] == 50
    listed = client.get("/inventory/products", headers=h).json()[0]
    assert (listed["expiry_date"], listed["min_stock"]) == (expiry, 50)


def test_min_stock_must_be_positive(client, h, inventory_db):
    res = client.post("/inventory/products", headers=h, json={**SUPPLY, "min_stock": 0})
    assert res.status_code == 422


# ------------------------------------------------------------ P1
def test_clinical_use_requires_department_and_waste_forbids_it(client, h, inventory_db):
    sid = _supply(client, h)["id"]
    _inbound(client, h, sid, 10)

    assert _outbound(client, h, sid, 1, department=None).status_code == 422
    assert _outbound(client, h, sid, 1, department="patient_42").status_code == 422
    assert _outbound(client, h, sid, 1, consumption_type="expiry_waste").status_code == 422
    ok = _outbound(client, h, sid, 1, consumption_type="expiry_waste", department=None)
    assert ok.status_code == 201 and ok.json()["department"] is None
    assert _outbound(client, h, sid, 1).json()["department"] == "primary_care"


# ------------------------------------------------------------ P5
def test_stock_is_reported_and_checked_per_clinic(client, h, inventory_db):
    sid = _supply(client, h, min_stock=5)["id"]
    first = _inbound(client, h, sid, 10, clinic_id=1).json()
    _inbound(client, h, sid, 4, clinic_id=10)

    assert (first["stock_before"], first["stock_after"], first["min_stock"]) == (0, 10, 5)
    product = client.get(f"/inventory/products/{sid}", headers=h).json()
    assert product["current_stock"] == 14
    assert product["stock_by_clinic"] == {"1": 10, "10": 4}

    # Clinic 10 cannot consume clinic 1's stock.
    rejected = _outbound(client, h, sid, 6, clinic_id=10)
    assert rejected.status_code == 400
    assert "clinic 10" in rejected.json()["detail"]

    out = _outbound(client, h, sid, 6, clinic_id=1).json()
    assert (out["stock_before"], out["stock_after"], out["min_stock"]) == (10, 4, 5)
    assert client.get("/inventory/products", headers=h).json()[0]["stock_by_clinic"] == {"1": 4, "10": 4}


# ------------------------------------------------------------ P4
@pytest.mark.parametrize(
    "method,path",
    [("put", "/inventory/products/{id}"), ("patch", "/inventory/products/{id}"),
     ("patch", "/inventory/products/{id}/stock")],
)
def test_direct_stock_edit_routes_answer_403_and_write_nothing(client, h, inventory_db, method, path):
    sid = _supply(client, h)["id"]
    _inbound(client, h, sid, 10)

    res = getattr(client, method)(path.format(id=sid), headers=h, json={"current_stock": 999})

    assert res.status_code == 403
    assert res.json() == {"detail": "Stock can only change through inbound/outbound orders"}
    assert client.get(f"/inventory/products/{sid}", headers=h).json()["current_stock"] == 10


def test_direct_stock_edit_routes_still_require_login(client, inventory_db):
    assert client.patch("/inventory/products/1/stock", json={"current_stock": 1}).status_code == 401


@pytest.mark.parametrize("field", ["stock", "current_stock"])
def test_creating_a_product_with_stock_is_rejected_not_ignored(client, h, inventory_db, field):
    res = client.post("/inventory/products", headers=h, json={**SUPPLY, field: 500})

    assert res.status_code == 422
    assert res.json()["detail"][0]["loc"][-1] == field


# ------------------------------------------------------------ P7
def test_access_token_carries_a_session_id(user):
    claims = jwt.get_unverified_claims(security.create_access_token(user["id"]))
    other = jwt.get_unverified_claims(security.create_access_token(user["id"]))

    assert len(claims["sid"]) == 36
    assert claims["sid"] != other["sid"]  # one per login


def test_me_exposes_only_the_pseudonymous_telemetry_id(client, user, auth_headers):
    body = client.get("/auth/me", headers=auth_headers(user)).json()

    assert body["telemetry_id"] == database.users_table.get(doc_id=user["id"])["uuid"]


# ------------------------------------------------------------ migration
def test_init_db_adds_the_new_columns_to_existing_tables(inventory_db):
    SQLModel.metadata.drop_all(database.engine)
    with database.engine.begin() as conn:  # the tables as they were before this PR
        conn.execute(text("CREATE TABLE medical_supply (id INTEGER PRIMARY KEY, name VARCHAR, sku VARCHAR, "
                          "category VARCHAR, unit VARCHAR, country VARCHAR)"))
        conn.execute(text("CREATE TABLE supply_consumption (id INTEGER PRIMARY KEY, supply_id INTEGER, "
                          "quantity INTEGER, consumption_type VARCHAR, clinic_id INTEGER, created_at TIMESTAMP, "
                          "user_uuid VARCHAR)"))

    database.init_db()
    database.init_db()  # idempotent

    inspector = inspect(database.engine)
    assert {"expiry_date", "min_stock"} <= {c["name"] for c in inspector.get_columns("medical_supply")}
    assert "department" in {c["name"] for c in inspector.get_columns("supply_consumption")}
