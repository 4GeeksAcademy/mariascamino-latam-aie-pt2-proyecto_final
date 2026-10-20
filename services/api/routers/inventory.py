# routers/inventory.py — HealthCore medical supply inventory (Supabase).
#
# Rules enforced here:
#   - Stock is never written directly: it is computed from the order history.
#   - Every order stores the UUID of the authenticated user (from TinyDB).
#   - A consumption that would leave negative stock is rejected with 400
#     BEFORE anything is written.
#   - HealthCore requires authentication on every inventory route.
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from database import get_db
from models import MedicalSupply, SupplyConsumption, SupplyDelivery
from schemas import (
    MedicalSupplyCreate,
    MedicalSupplyResponse,
    OrderResponse,
    SupplyConsumptionCreate,
    SupplyConsumptionResponse,
    SupplyDeliveryCreate,
    SupplyDeliveryResponse,
    SupplySummary,
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


def _to_supply_response(supply: MedicalSupply, current_stock: int) -> MedicalSupplyResponse:
    return MedicalSupplyResponse(
        id=supply.id,
        name=supply.name,
        sku=supply.sku,
        category=supply.category,
        unit=supply.unit,
        country=supply.country,
        current_stock=int(current_stock),
    )


def _get_supply_with_stock(db: Session, supply_id: int) -> tuple[MedicalSupply, int]:
    row = db.exec(_supplies_with_stock_query().where(MedicalSupply.id == supply_id)).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical supply not found")
    supply, current_stock = row
    return supply, int(current_stock)


def _summary(supply: MedicalSupply) -> SupplySummary:
    return SupplySummary(
        id=supply.id, name=supply.name, sku=supply.sku, unit=supply.unit, country=supply.country
    )


# ---------- products (MedicalSupply) ----------

@router.get("/products", response_model=list[MedicalSupplyResponse])
def list_supplies(db: Session = Depends(get_db)):
    rows = db.exec(_supplies_with_stock_query().order_by(MedicalSupply.id)).all()
    return [_to_supply_response(supply, stock) for supply, stock in rows]


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
    db.refresh(supply)
    return _to_supply_response(supply, 0)  # every new supply starts with zero stock


@router.get("/products/{supply_id}", response_model=MedicalSupplyResponse)
def get_supply(supply_id: int, db: Session = Depends(get_db)):
    supply, current_stock = _get_supply_with_stock(db, supply_id)
    return _to_supply_response(supply, current_stock)


# ---------- orders ----------

@router.post("/orders/inbound", response_model=SupplyDeliveryResponse, status_code=status.HTTP_201_CREATED)
def register_delivery(
    payload: SupplyDeliveryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if db.get(MedicalSupply, payload.supply_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical supply not found")

    delivery = SupplyDelivery(**payload.model_dump(), user_uuid=current_user["uuid"])
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return SupplyDeliveryResponse.model_validate(delivery, from_attributes=True)


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

    _, available = _get_supply_with_stock(db, payload.supply_id)
    if payload.quantity > available:
        db.rollback()  # nothing was written; release the lock
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock for supply '{supply.name}'. "
                f"Available: {available}, requested: {payload.quantity}."
            ),
        )

    consumption = SupplyConsumption(**payload.model_dump(), user_uuid=current_user["uuid"])
    db.add(consumption)
    db.commit()
    db.refresh(consumption)
    return SupplyConsumptionResponse.model_validate(consumption, from_attributes=True)


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

    orders = [
        OrderResponse(
            id=d.id,
            order_type="inbound",
            quantity=d.quantity,
            clinic_id=d.clinic_id,
            created_at=d.created_at,
            user_uuid=d.user_uuid,
            vendor_name=d.vendor_name,
            supply=_summary(s),
        )
        for d, s in deliveries
    ] + [
        OrderResponse(
            id=c.id,
            order_type="outbound",
            quantity=c.quantity,
            clinic_id=c.clinic_id,
            created_at=c.created_at,
            user_uuid=c.user_uuid,
            consumption_type=c.consumption_type,
            supply=_summary(s),
        )
        for c, s in consumptions
    ]
    return sorted(orders, key=lambda o: o.created_at, reverse=True)
