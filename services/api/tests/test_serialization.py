"""Response-shape contracts (serialization audit, docs/serialization-audit.md).

Each test pins the exact set of keys an endpoint returns, so a field that
leaks back in (a password hash, an internal id, a foreign key) fails here.
"""

import pytest
from sqlmodel import SQLModel

import database

SENSITIVE = {"password", "hashed_password", "uuid", "user_uuid", "user_id"}


def _keys(response):
    body = response.json()
    item = body[0] if isinstance(body, list) else body
    return set(item)


def _assert_no_sensitive(response):
    text = response.text
    for field in SENSITIVE:
        assert f'"{field}"' not in text, f"{field} leaked in {response.request.url}"


@pytest.fixture
def inventory_db():
    database.init_db()
    yield
    SQLModel.metadata.drop_all(database.engine)


# ------------------------------------------------------------------- auth
def test_register_does_not_echo_email_or_account_state(client):
    response = client.post("/users", json={"email": "New@Example.com", "password": "Password123!"})

    assert response.status_code == 201
    assert _keys(response) == {"id", "detail"}
    assert "new@example.com" not in response.text.lower()
    _assert_no_sensitive(response)


def test_login_returns_only_the_token(client, user):
    response = client.post("/auth/login", data={"username": user["email"], "password": user["password"]})

    assert _keys(response) == {"access_token", "token_type"}


@pytest.mark.parametrize(
    "path, body",
    [
        ("/auth/forgot-password", {"email": "user@example.com"}),
        ("/auth/reset-password", {"token": "nope", "new_password": "Password999!"}),
    ],
)
def test_unauthenticated_password_flows_never_echo_email(client, user, path, body):
    response = client.post(path, json=body)

    assert _keys(response) == {"detail"}
    assert "user@example.com" not in response.text


def test_me_returns_own_email_and_a_flat_profile_without_ids(client, user, auth_headers):
    database.profiles_table.insert({"user_id": user["id"], "name": "Maria", "phone": None, "address": None})

    response = client.get("/auth/me", headers=auth_headers(user))

    assert _keys(response) == {"email", "role", "profile"}
    assert set(response.json()["profile"]) == {"name", "phone", "address"}
    _assert_no_sensitive(response)


# ------------------------------------------------------------ users/profiles
def test_admin_user_list_uses_the_slim_list_schema(client, admin, auth_headers):
    response = client.get("/users", headers=auth_headers(admin))

    assert _keys(response) == {"id", "email", "role", "is_active"}
    _assert_no_sensitive(response)


def test_user_detail_schema(client, user, auth_headers):
    response = client.get(f"/users/{user['id']}", headers=auth_headers(user))

    assert _keys(response) == {"id", "email", "role", "is_active", "created_at"}
    _assert_no_sensitive(response)


def test_delete_user_returns_typed_confirmation(client, user, auth_headers):
    response = client.delete(f"/users/{user['id']}", headers=auth_headers(user))

    assert _keys(response) == {"detail", "id"}


def test_profile_hides_internal_ids(client, user, auth_headers):
    database.profiles_table.insert({"user_id": user["id"], "name": "Maria", "phone": None, "address": None})

    response = client.get("/profiles/me", headers=auth_headers(user))

    assert _keys(response) == {"name", "phone", "address"}


# ---------------------------------------------------------------- suppliers
SUPPLIER = {
    "name": "Acme",
    "country": "USA",
    "categories": ["medical_supplies"],
    "monthly_rate": 100,
    "currency": "USD",
    "contact_email": "ops@acme.com",
    "notes": "internal note",
}


def test_supplier_list_is_slimmer_than_detail(client, user, auth_headers):
    h = auth_headers(user)
    created = client.post("/suppliers", headers=h, json=SUPPLIER).json()

    listed = client.get("/suppliers", headers=h)
    detail = client.get(f"/suppliers/{created['id']}", headers=h)

    assert _keys(listed) == {"id", "name", "country", "categories", "monthly_rate", "currency", "status"}
    assert {"notes", "contact_email", "updated_at"} <= _keys(detail)


# ---------------------------------------------------------------- incidents
INCIDENT = {
    "title": "Printer",
    "description": "Smoking",
    "category": "it_system",
    "origin": "internal",
    "branch": "central",
}


def test_incident_write_ignores_unknown_fields(client):
    response = client.post("/api/incidents", json={**INCIDENT, "id": 999, "created_at": "1999-01-01"})

    assert response.status_code == 201
    assert response.json()["id"] != 999
    assert _keys(response) == {
        "id", "title", "description", "category", "status", "origin", "branch", "created_at", "updated_at",
    }


def test_incident_list_omits_description_and_updated_at(client):
    client.post("/api/incidents", json=INCIDENT)

    response = client.get("/api/incidents")

    assert _keys(response) == {"id", "title", "category", "status", "origin", "branch", "created_at"}


def test_incident_summary_schema(client):
    assert _keys(client.get("/api/incidents/summary")) == {
        "total", "by_status", "by_category", "by_origin", "by_branch",
    }


# ---------------------------------------------------------------- inventory
def test_order_history_is_flat_and_hides_user_uuid(client, make_user, auth_headers, inventory_db):
    user = make_user()
    database.users_table.update({"uuid": "11111111-2222-3333-4444-555555555555"}, doc_ids=[user["id"]])
    database.profiles_table.insert({"user_id": user["id"], "name": "Maria", "phone": None, "address": None})
    h = auth_headers(user)
    supply = client.post(
        "/inventory/products", headers=h,
        json={"name": "Gloves", "sku": "G-1", "category": "ppe", "unit": "box", "country": "US"},
    ).json()

    inbound = client.post(
        "/inventory/orders/inbound", headers=h,
        json={"supply_id": supply["id"], "quantity": 10, "vendor_name": "MedCo", "clinic_id": 1},
    )
    orders = client.get("/inventory/orders", headers=h)

    assert inbound.status_code == 201
    assert _keys(inbound) == {"id", "supply_id", "quantity", "vendor_name", "clinic_id", "created_at"}
    assert _keys(orders) == {
        "id", "order_type", "quantity", "clinic_id", "created_at", "created_by",
        "vendor_name", "consumption_type", "supply_id", "supply_name", "supply_sku",
    }
    assert orders.json()[0]["created_by"] == "Maria"
    _assert_no_sensitive(orders)


def test_health_check_schema(client):
    assert _keys(client.get("/")) == {"status", "service"}
