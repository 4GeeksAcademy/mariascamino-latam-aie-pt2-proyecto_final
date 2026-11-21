"""Caching behaviour (CACHING_REPORT.md).

Three things are pinned here:
  1. The TTL cache itself: entries expire, invalidation empties a namespace,
     and a write that lands while a value is being computed is not lost.
  2. Each cached endpoint answers MISS then HIT, and every write that changes
     the underlying data invalidates it (the next read is fresh).
  3. The stock check of an outbound order never trusts the cache.
"""

import pytest
from sqlmodel import SQLModel

import database
from cache import INCIDENT_SUMMARY, INVENTORY_PRODUCTS, TTLCache, cache

INCIDENT = {
    "title": "Printer",
    "description": "Smoking",
    "category": "it_system",
    "origin": "internal",
    "branch": "central",
}
SUPPLY = {"name": "Gloves", "sku": "T-001", "category": "ppe", "unit": "box", "country": "US"}


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture
def inventory_db():
    database.init_db()
    yield
    SQLModel.metadata.drop_all(database.engine)


# ------------------------------------------------------------ TTLCache unit
def test_value_is_served_until_the_ttl_expires():
    clock = FakeClock()
    c = TTLCache(clock=clock)
    calls = []

    def compute():
        calls.append(1)
        return len(calls)

    assert c.get_or_set("ns", ttl=30, compute=compute) == (1, False)
    clock.now += 29
    assert c.get_or_set("ns", ttl=30, compute=compute) == (1, True)
    clock.now += 2  # 31 s after the first call: expired
    assert c.get_or_set("ns", ttl=30, compute=compute) == (2, False)


def test_invalidate_only_clears_its_namespace():
    c = TTLCache()
    c.set("a", 1, value="a1", ttl=60)
    c.set("a", 2, value="a2", ttl=60)
    c.set("b", value="b", ttl=60)

    assert c.invalidate("a") == 2
    assert c.get("a", 1) == (False, None)
    assert c.get("b") == (True, "b")


def test_a_ttl_is_mandatory():
    with pytest.raises(ValueError):
        TTLCache().set("ns", value=1, ttl=0)


def test_write_during_a_slow_read_is_not_overwritten_by_stale_data():
    """Request A misses and computes; meanwhile request B writes and
    invalidates. A's (now old) result must not be stored."""
    c = TTLCache()

    def slow_compute():
        c.invalidate("ns")  # B's write happens while A is computing
        return "old"

    assert c.get_or_set("ns", ttl=60, compute=slow_compute) == ("old", False)
    assert c.get("ns") == (False, None)  # nothing stale was cached


# ------------------------------------------------- GET /api/incidents/summary
def test_summary_is_cached_then_invalidated_by_create(client):
    first = client.get("/api/incidents/summary")
    second = client.get("/api/incidents/summary")
    assert first.headers["X-Cache"] == "MISS"
    assert second.headers["X-Cache"] == "HIT"
    assert second.json()["total"] == 0

    client.post("/api/incidents", json=INCIDENT)

    after = client.get("/api/incidents/summary")
    assert after.headers["X-Cache"] == "MISS"
    assert after.json()["total"] == 1


def test_summary_is_invalidated_by_status_change(client):
    incident_id = client.post("/api/incidents", json=INCIDENT).json()["id"]
    assert client.get("/api/incidents/summary").json()["by_status"]["open"] == 1

    client.patch(f"/api/incidents/{incident_id}/status", json={"status": "in_progress"})

    after = client.get("/api/incidents/summary").json()
    assert after["by_status"]["open"] == 0
    assert after["by_status"]["in_progress"] == 1


def test_failed_write_keeps_the_cache(client):
    client.get("/api/incidents/summary")
    client.post("/api/incidents", json={**INCIDENT, "category": "not-a-category"})  # 400

    assert client.get("/api/incidents/summary").headers["X-Cache"] == "HIT"


# ------------------------------------------------------ GET /inventory/products
def test_products_cached_and_invalidated_by_every_stock_write(client, user, auth_headers, inventory_db):
    h = auth_headers(user)
    supply_id = client.post("/inventory/products", headers=h, json=SUPPLY).json()["id"]

    assert client.get("/inventory/products", headers=h).headers["X-Cache"] == "MISS"
    assert client.get("/inventory/products", headers=h).headers["X-Cache"] == "HIT"

    client.post(
        "/inventory/orders/inbound", headers=h,
        json={"supply_id": supply_id, "quantity": 50, "vendor_name": "MedLine", "clinic_id": 1},
    )
    after_in = client.get("/inventory/products", headers=h)
    assert after_in.headers["X-Cache"] == "MISS"
    assert after_in.json()[0]["current_stock"] == 50

    client.post(
        "/inventory/orders/outbound", headers=h,
        json={"supply_id": supply_id, "quantity": 20, "consumption_type": "clinical_use", "clinic_id": 1},
    )
    assert client.get("/inventory/products", headers=h).json()[0]["current_stock"] == 30


def test_new_product_appears_immediately(client, user, auth_headers, inventory_db):
    h = auth_headers(user)
    assert client.get("/inventory/products", headers=h).json() == []

    client.post("/inventory/products", headers=h, json=SUPPLY)

    assert len(client.get("/inventory/products", headers=h).json()) == 1


def test_products_cache_is_shared_but_still_requires_login(client, make_user, auth_headers, inventory_db):
    """Shared key is safe (same answer for everybody) but a cache hit must
    not bypass authentication."""
    a = make_user(email="a@example.com")
    b = make_user(email="b@example.com")
    client.post("/inventory/products", headers=auth_headers(a), json=SUPPLY)

    assert client.get("/inventory/products", headers=auth_headers(a)).headers["X-Cache"] == "MISS"
    assert client.get("/inventory/products", headers=auth_headers(b)).headers["X-Cache"] == "HIT"
    assert client.get("/inventory/products").status_code == 401


def test_outbound_stock_check_ignores_a_stale_cache(client, user, auth_headers, inventory_db):
    h = auth_headers(user)
    supply_id = client.post("/inventory/products", headers=h, json=SUPPLY).json()["id"]
    client.post(
        "/inventory/orders/inbound", headers=h,
        json={"supply_id": supply_id, "quantity": 10, "vendor_name": "MedLine", "clinic_id": 1},
    )
    client.get("/inventory/products", headers=h)  # cache now says stock = 10

    # Simulate a write made by another process (e.g. a seed script) that this
    # process' cache never heard about: stock drops to 0 in the database.
    from sqlmodel import Session
    from models import SupplyConsumption
    with Session(database.engine) as s:
        s.add(SupplyConsumption(supply_id=supply_id, quantity=10, consumption_type="clinical_use",
                                clinic_id=1, user_uuid="external"))
        s.commit()
    found, cached = cache.get(INVENTORY_PRODUCTS)
    assert found and cached[0].current_stock == 10  # the cache is stale…

    res = client.post(
        "/inventory/orders/outbound", headers=h,
        json={"supply_id": supply_id, "quantity": 5, "consumption_type": "clinical_use", "clinic_id": 1},
    )
    assert res.status_code == 400  # …but the stock check read the database


def test_reads_never_invalidate(client):
    client.get("/api/incidents/summary")
    client.get("/api/incidents")
    client.get("/api/incidents/summary")
    assert cache.get(INCIDENT_SUMMARY)[0]
