# models.py — SQLModel ORM tables (Supabase / PostgreSQL).
# Each class with table=True becomes a table; each attribute becomes a column.
# Pydantic request/response schemas live in schemas.py.
#
# Business rule: MedicalSupply has NO stock column. Stock is always computed
# from SupplyDelivery (inbound) minus SupplyConsumption (outbound).
#
# There is NO User table here: user_uuid references a TinyDB user (auth DB).
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MedicalSupply(SQLModel, table=True):
    __tablename__ = "medical_supply"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    sku: str = Field(max_length=50, unique=True, index=True)
    category: str = Field(max_length=30)   # ppe | wound_care | diagnostics | medications | consumables
    unit: str = Field(max_length=10)       # box | unit | pack | vial
    country: str = Field(max_length=2)     # US | UK


class SupplyDelivery(SQLModel, table=True):
    """Inbound order: a vendor shipment received at a clinic (adds stock)."""
    __tablename__ = "supply_delivery"

    id: Optional[int] = Field(default=None, primary_key=True)
    supply_id: int = Field(foreign_key="medical_supply.id", index=True)
    quantity: int
    vendor_name: str = Field(max_length=200)
    clinic_id: int                          # 1-12, not a FK (clinic data lives elsewhere)
    created_at: datetime = Field(default_factory=_utcnow)
    user_uuid: str = Field(max_length=36)  # TinyDB user UUID (no FK on purpose)


class SupplyConsumption(SQLModel, table=True):
    """Outbound order: supplies used in patient care or discarded (removes stock)."""
    __tablename__ = "supply_consumption"

    id: Optional[int] = Field(default=None, primary_key=True)
    supply_id: int = Field(foreign_key="medical_supply.id", index=True)
    quantity: int
    consumption_type: str = Field(max_length=20)  # clinical_use | expiry_waste
    clinic_id: int
    created_at: datetime = Field(default_factory=_utcnow)
    user_uuid: str = Field(max_length=36)
