# routers/inventory.py — HealthCore medical supply inventory (Supabase).
#
# Rules enforced here:
#   - Stock is never written directly: it is computed from the order history.
#   - Every order stores the UUID of the authenticated user (from TinyDB).
#   - A consumption that would leave negative stock is rejected with 400
#     BEFORE anything is written.
#   - HealthCore requires authentication on every inventory route.
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, literal
from sqlmodel import Session, select

from cache import INVENTORY_PRODUCTS, INVENTORY_PRODUCTS_TTL, cache
from database import get_db, profiles_table, users_table
from models import MedicalSupply, SupplyConsumption, SupplyDelivery
from schemas import (
    MedicalSupplyCreate,
    MedicalSupplyResponse,
    OrderResponse,
    SupplyConsumptionCreate,
    SupplyConsumptionResponse,
    SupplyDeliveryCreate,
    SupplyDeliveryResponse,
)
from security import get_current_user

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"],
    dependencies=[Depends(get_current_user)],  # HealthCore: all routes authenticated
)


# ---------- helpers ----------

def _supplies_with_stock_query():
    """One single query that returns each supply with its current_stock.

    Deliveries and consumptions are summed per supply in two grouped
    subqueries and LEFT JOINed to medical_supply, so the stock of N supplies
    is computed in 1 query (no N+1). COALESCE turns 'no orders' into 0.
    """
    delivered = (
        select(SupplyDelivery.supply_id, func.sum(SupplyDelivery.quantity).label("total"))
        .group_by(SupplyDelivery.supply_id)
        .subquery()
    )
    consumed = (
        select(SupplyConsumption.supply_id, func.sum(SupplyConsumption.quantity).label("total"))
        .group_by(SupplyConsumption.supply_id)
        .subquery()
    )
    current_stock = (
        func.coalesce(delivered.c.total, 0) - func.coalesce(consumed.c.total, 0)
    ).label("current_stock")

    return (
        select(MedicalSupply, current_stock)
        .outerjoin(delivered, delivered.c.supply_id == MedicalSupply.id)
        .outerjoin(consumed, consumed.c.supply_id == MedicalSupply.id)
    )


def _stock_by_clinic(db: Session, supply_id: int | None = None) -> dict[int, dict[int, int]]:
    """{supply_id: {clinic_id: stock}} in ONE query (prerequisite P5).

    Deliveries (+qty) and consumptions (-qty) are stacked with UNION ALL and
    summed per (supply, clinic). Clinics with no orders for a supply are absent.
    """
    deliveries = select(
        SupplyDelivery.supply_id.label("supply_id"),
        SupplyDelivery.clinic_id.label("clinic_id"),
        SupplyDelivery.quantity.label("delta"),
    )
    consumptions = select(
        SupplyConsumption.supply_id.label("supply_id"),
        SupplyConsumption.clinic_id.label("clinic_id"),
        (literal(0) - SupplyConsumption.quantity).label("delta"),
    )
    if supply_id is not None:
        deliveries = deliveries.where(SupplyDelivery.supply_id == supply_id)
        consumptions = consumptions.where(SupplyConsumption.supply_id == supply_id)
    movements = deliveries.union_all(consumptions).subquery()
    rows = db.exec(
        select(movements.c.supply_id, movements.c.clinic_id, func.sum(movements.c.delta)).group_by(
            movements.c.supply_id, movements.c.clinic_id
        )
    ).all()
    result: dict[int, dict[int, int]] = {}
    for sid, clinic_id, stock in rows:
        result.setdefault(int(sid), {})[int(clinic_id)] = int(stock or 0)
    return result


def _clinic_stock(db: Session, supply_id: int, clinic_id: int) -> int:
    """Stock of one supply in one clinic, always read from the database."""
    return _stock_by_clinic(db, supply_id).get(supply_id, {}).get(clinic_id, 0)


def _to_supply_response(
    supply: MedicalSupply, current_stock: int, stock_by_clinic: dict[int, int] | None = None
) -> MedicalSupplyResponse:
    return MedicalSupplyResponse(
        id=supply.id,
        name=supply.name,
        sku=supply.sku,
        category=supply.category,
        unit=supply.unit,
        country=supply.country,
        current_stock=int(current_stock),
        expiry_date=supply.expiry_date,
        min_stock=supply.min_stock,
        stock_by_clinic=stock_by_clinic or {},
    )


def _get_supply_with_stock(db: Session, supply_id: int) -> tuple[MedicalSupply, int]:
    row = db.exec(_supplies_with_stock_query().where(MedicalSupply.id == supply_id)).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical supply not found")
    supply, current_stock = row
    return supply, int(current_stock)


def _creator_names() -> dict[str, str]:
    """Map TinyDB user uuid -> display name (profile name, else "Usuario #id").
    Built once per request so the order list does not look users up row by row."""
    names_by_user_id = {p["user_id"]: p.get("name") for p in profiles_table.all()}
    return {
        u["uuid"]: names_by_user_id.get(u.doc_id) or f"Usuario #{u.doc_id}"
        for u in users_table.all()
        if u.get("uuid")
    }


# ---------- products (MedicalSupply) ----------

@router.get("/products", response_model=list[MedicalSupplyResponse])
def list_supplies(response: Response, db: Session = Depends(get_db)):
    """Catalogue + computed stock. Cached (shared key, TTL 30 s): the route
    requires login, but the answer is identical for every logged-in user (no
    per-user fields), so one shared entry is safe. Every write that changes a
    product or its stock invalidates it. See CACHING_REPORT.md."""

    def compute() -> list[MedicalSupplyResponse]:
        rows = db.exec(_supplies_with_stock_query().order_by(MedicalSupply.id)).all()
        by_clinic = _stock_by_clinic(db)
        return [_to_supply_response(supply, stock, by_clinic.get(supply.id)) for supply, stock in rows]

    supplies, hit = cache.get_or_set(INVENTORY_PRODUCTS, ttl=INVENTORY_PRODUCTS_TTL, compute=compute)
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return supplies


@router.post("/products", response_model=MedicalSupplyResponse, status_code=status.HTTP_201_CREATED)
def create_supply(payload: MedicalSupplyCreate, db: Session = Depends(get_db)):
    existing = db.exec(select(MedicalSupply).where(MedicalSupply.sku == payload.sku)).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A supply with SKU '{payload.sku}' already exists.",
        )
    supply = MedicalSupply(**payload.model_dump())
    db.add(supply)
    db.commit()
    cache.invalidate(INVENTORY_PRODUCTS)  # new row in the catalogue
    db.refresh(supply)
    return _to_supply_response(supply, 0)  # every new supply starts with zero stock


@router.get("/products/{supply_id}", response_model=MedicalSupplyResponse)
def get_supply(supply_id: int, db: Session = Depends(get_db)):
    supply, current_stock = _get_supply_with_stock(db, supply_id)
    return _to_supply_response(supply, current_stock, _stock_by_clinic(db, supply_id).get(supply_id))


# ---------- direct stock edit guard (prerequisite P4) ----------
# There is no way to write stock: it is derived from the order history. These
# routes exist so that an attempt to edit a product or its stock is answered
# with an explicit 403 (and becomes visible as direct_stock_edit_rejected)
# instead of a generic 405. They never write anything.

_DIRECT_EDIT_DETAIL = "Stock can only change through inbound/outbound orders"


@router.put("/products/{supply_id}", status_code=status.HTTP_403_FORBIDDEN)
@router.patch("/products/{supply_id}", status_code=status.HTTP_403_FORBIDDEN)
@router.patch("/products/{supply_id}/stock", status_code=status.HTTP_403_FORBIDDEN)
def reject_direct_stock_edit(supply_id: int):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_DIRECT_EDIT_DETAIL)


# ---------- orders ----------

@router.post("/orders/inbound", response_model=SupplyDeliveryResponse, status_code=status.HTTP_201_CREATED)
def register_delivery(
    payload: SupplyDeliveryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    supply = db.get(MedicalSupply, payload.supply_id)
    if supply is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical supply not found")

    stock_before = _clinic_stock(db, payload.supply_id, payload.clinic_id)
    delivery = SupplyDelivery(**payload.model_dump(), user_uuid=current_user["uuid"])
    db.add(delivery)
    db.commit()
    cache.invalidate(INVENTORY_PRODUCTS)  # stock went up
    db.refresh(delivery)
    return SupplyDeliveryResponse(
        **delivery.model_dump(exclude={"user_uuid"}),
        stock_before=stock_before,
        stock_after=stock_before + delivery.quantity,
        min_stock=supply.min_stock,
    )


@router.post("/orders/outbound", response_model=SupplyConsumptionResponse, status_code=status.HTTP_201_CREATED)
def register_consumption(
    payload: SupplyConsumptionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Lock the supply row so two simultaneous consumptions can't both pass the
    # stock check and leave the stock negative.
    supply = db.exec(
        select(MedicalSupply).where(MedicalSupply.id == payload.supply_id).with_for_update()
    ).first()
    if supply is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical supply not found")

    # Stock check ALWAYS reads the database, never the cache: deciding whether
    # a consumption is allowed on a value up to 30 s old could let stock go
    # negative. The check is per clinic (P5): a clinic can only consume what
    # it received, not another clinic's stock.
    available = _clinic_stock(db, payload.supply_id, payload.clinic_id)
    if payload.quantity > available:
        db.rollback()  # nothing was written; release the lock
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock for supply '{supply.name}' in clinic {payload.clinic_id}. "
                f"Available: {available}, requested: {payload.quantity}."
            ),
        )

    consumption = SupplyConsumption(**payload.model_dump(), user_uuid=current_user["uuid"])
    db.add(consumption)
    db.commit()
    cache.invalidate(INVENTORY_PRODUCTS)  # stock went down
    db.refresh(consumption)
    return SupplyConsumptionResponse(
        **consumption.model_dump(exclude={"user_uuid"}),
        stock_before=available,
        stock_after=available - consumption.quantity,
        min_stock=supply.min_stock,
    )


@router.get("/orders", response_model=list[OrderResponse])
def list_orders(db: Session = Depends(get_db)):
    # Each list is loaded together with its supply in ONE joined query,
    # so there is no extra query per order (avoids the N+1 problem).
    deliveries = db.exec(
        select(SupplyDelivery, MedicalSupply).join(MedicalSupply, SupplyDelivery.supply_id == MedicalSupply.id)
    ).all()
    consumptions = db.exec(
        select(SupplyConsumption, MedicalSupply).join(
            MedicalSupply, SupplyConsumption.supply_id == MedicalSupply.id
        )
    ).all()

    creators = _creator_names()

    def _base(order, supply: MedicalSupply) -> dict:
        return {
            "id": order.id,
            "quantity": order.quantity,
            "clinic_id": order.clinic_id,
            "created_at": order.created_at,
            "created_by": creators.get(order.user_uuid, "Usuario desconocido"),
            "supply_id": supply.id,
            "supply_name": supply.name,
            "supply_sku": supply.sku,
        }

    orders = [
        OrderResponse(**_base(d, s), order_type="inbound", vendor_name=d.vendor_name)
        for d, s in deliveries
    ] + [
        OrderResponse(**_base(c, s), order_type="outbound", consumption_type=c.consumption_type)
        for c, s in consumptions
    ]
    return sorted(orders, key=lambda o: o.created_at, reverse=True)
