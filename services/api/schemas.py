# schemas.py — Pydantic request/response schemas (NOT database tables).
# Supplier schemas (TinyDB) + inventory schemas (Supabase). The SQLModel
# ORM tables live in models.py.
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class Category(str, Enum):
    MEDICAL_SUPPLIES = "medical_supplies"
    LABORATORY_SERVICES = "laboratory_services"
    PHARMACEUTICAL = "pharmaceutical"
    CLINICAL_SOFTWARE = "clinical_software"
    IT_INFRASTRUCTURE = "it_infrastructure"
    HR_AND_PAYROLL_SOFTWARE = "hr_and_payroll_software"
    CLEANING_AND_FACILITIES = "cleaning_and_facilities"
    PATIENT_COMMUNICATION = "patient_communication"
    BILLING_AND_CODING_SOFTWARE = "billing_and_coding_software"
    TRAINING_PLATFORMS = "training_platforms"


class Country(str, Enum):
    USA = "USA"
    UK = "UK"


class Currency(str, Enum):
    USD = "USD"
    GBP = "GBP"


class Status(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class ComplianceAgreement(str, Enum):
    BAA = "BAA"
    DPA = "DPA"
    BOTH = "both"


COUNTRY_CURRENCY = {
    Country.USA: Currency.USD,
    Country.UK: Currency.GBP,
}


def _validate_renewal_date(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    try:
        datetime.strptime(v, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError("contract_renewal_date debe tener formato YYYY-MM-DD") from exc
    return v


class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    country: Country
    categories: list[Category] = Field(..., min_length=1)
    monthly_rate: float = Field(..., gt=0)
    currency: Currency
    status: Status = Status.ACTIVE
    compliance_agreement: Optional[ComplianceAgreement] = None
    contract_renewal_date: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    notes: Optional[str] = None

    @field_validator("contract_renewal_date")
    @classmethod
    def check_date_format(cls, v: Optional[str]) -> Optional[str]:
        return _validate_renewal_date(v)

    @model_validator(mode="after")
    def check_currency_matches_country(self) -> "SupplierBase":
        expected = COUNTRY_CURRENCY[self.country]
        if self.currency != expected:
            raise ValueError(
                f"Un proveedor de {self.country.value} debe tener currency={expected.value}"
            )
        return self


class SupplierCreate(SupplierBase):
    """Lo que manda el cliente en POST /suppliers. updated_at NO va aquí: lo genera el servidor."""
    pass


class SupplierResponse(SupplierBase):
    """Lo que devuelve la API. Incluye id (asignado por TinyDB) y updated_at (generado por el sistema)."""
    id: int
    updated_at: datetime


class SupplierListItem(BaseModel):
    """Row of GET /suppliers. Only the columns the backoffice table renders;
    notes, contact_email, compliance data and updated_at stay in the detail
    view (GET /suppliers/{id})."""
    id: int
    name: str
    country: Country
    categories: list[Category]
    monthly_rate: float
    currency: Currency
    status: Status


# ---------- Incidents (/api/incidents) ----------
# Input fields are Optional[str] on purpose: business validation (allowed
# values, lengths, required fields, status transitions) lives in
# packages/shared/incident_rules.py and answers 400 with one message per
# field, which the backoffice form relies on. The schema's job is to define
# WHICH fields are writable: anything else in the body is dropped.

class IncidentCreate(BaseModel):
    """POST /api/incidents. id, created_at and updated_at are server-set."""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    origin: Optional[str] = None
    branch: Optional[str] = None


class IncidentStatusUpdate(BaseModel):
    """PATCH /api/incidents/{id}/status. Only the status can change."""
    status: Optional[str] = None


class IncidentResponse(BaseModel):
    """Full incident: create/status-change confirmation and detail view."""
    id: int
    title: str
    description: str
    category: str
    status: str
    origin: str
    branch: str
    created_at: datetime
    updated_at: datetime


class IncidentListItem(BaseModel):
    """Row of GET /api/incidents: the table shows no description and no
    updated_at, so the list does not send them."""
    id: int
    title: str
    category: str
    status: str
    origin: str
    branch: str
    created_at: datetime


class IncidentSummary(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_origin: dict[str, int]
    by_branch: dict[str, int]


class FieldError(BaseModel):
    field: str
    message: str


class IncidentValidationError(BaseModel):
    """Body of the 400 answered when incident_rules rejects the input."""
    detail: str
    errors: list[FieldError]


class DeleteResponse(BaseModel):
    """Confirmation for every DELETE: what was removed, nothing else."""
    detail: str
    id: int


class HealthResponse(BaseModel):
    """GET / health check."""
    status: str
    service: str


class RateUpdate(BaseModel):
    monthly_rate: float = Field(..., gt=0)


class StatusUpdate(BaseModel):
    status: Status

# =====================================================================
# Inventory schemas (HealthCore — Milestone 5)
# Separate from the SQLModel tables in models.py: these classes define
# what the API accepts and returns. No endpoint returns an ORM object.
# =====================================================================

from datetime import date
from typing import Literal

from pydantic import ConfigDict

SupplyCategory = Literal["ppe", "wound_care", "diagnostics", "medications", "consumables"]
SupplyUnit = Literal["box", "unit", "pack", "vial"]
SupplyCountry = Literal["US", "UK"]
ConsumptionType = Literal["clinical_use", "expiry_waste"]
# P1 — clinical area that consumed the supply (telemetry-plan.md §6, enum
# `department`). Describes the AREA, never the person treated.
Department = Literal[
    "primary_care",
    "specialty_care",
    "chronic_care",
    "preventive_care",
    "womens_health",
    "paediatric_care",
    "mental_health",
    "clinic_operations",
]


# ---------- MedicalSupply ----------

class MedicalSupplyCreate(BaseModel):
    """POST /inventory/products. No stock field: stock only changes through orders.

    extra="forbid" (prerequisite P4): a body that tries to set `stock` or
    `current_stock` is answered 422 instead of being silently ignored, so the
    attempt is visible (direct_stock_edit_rejected)."""
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=50)
    category: SupplyCategory
    unit: SupplyUnit
    country: SupplyCountry
    expiry_date: Optional[date] = None             # P2
    min_stock: Optional[int] = Field(default=None, ge=1)  # P3


class MedicalSupplyResponse(BaseModel):
    id: int
    name: str
    sku: str
    category: str
    unit: str
    country: str
    current_stock: int  # computed: SUM(deliveries) - SUM(consumptions), never stored
    expiry_date: Optional[date] = None
    min_stock: Optional[int] = None
    # P5 — the BRIEFING measures stock "in a clinic". {clinic_id: stock} for
    # every clinic with order history for this supply (computed, never stored).
    stock_by_clinic: dict[int, int] = Field(default_factory=dict)


# ---------- SupplyDelivery (inbound) ----------

class SupplyDeliveryCreate(BaseModel):
    """POST /inventory/orders/inbound. user_uuid is NOT sent: it comes from the token."""
    supply_id: int
    quantity: int = Field(..., gt=0)
    vendor_name: str = Field(..., min_length=1, max_length=200)
    clinic_id: int = Field(..., ge=1, le=12)


class SupplyDeliveryResponse(BaseModel):
    """Write confirmation. user_uuid is internal (cross-DB key to TinyDB) and
    the caller is the creator, so it is not echoed. supply_id is returned as a
    plain id: the client just sent it and already has the supply."""
    id: int
    supply_id: int
    quantity: int
    vendor_name: str
    clinic_id: int
    created_at: datetime
    # Stock of this supply IN THIS CLINIC before/after the order, and the
    # supply's minimum: lets the caller see a threshold crossing.
    stock_before: int
    stock_after: int
    min_stock: Optional[int] = None


# ---------- SupplyConsumption (outbound) ----------

class SupplyConsumptionCreate(BaseModel):
    """POST /inventory/orders/outbound. consumption_type is validated here (Literal)."""
    supply_id: int
    quantity: int = Field(..., gt=0)
    consumption_type: ConsumptionType
    clinic_id: int = Field(..., ge=1, le=12)
    department: Optional[Department] = None  # P1

    @model_validator(mode="after")
    def check_department(self) -> "SupplyConsumptionCreate":
        # Clinical use always belongs to an area; an expiry write-off never does.
        if self.consumption_type == "clinical_use" and self.department is None:
            raise ValueError("department is required for clinical_use")
        if self.consumption_type == "expiry_waste" and self.department is not None:
            raise ValueError("department must be empty for expiry_waste")
        return self


class SupplyConsumptionResponse(BaseModel):
    """Write confirmation; same projection rules as SupplyDeliveryResponse."""
    id: int
    supply_id: int
    quantity: int
    consumption_type: str
    clinic_id: int
    department: Optional[str] = None
    created_at: datetime
    stock_before: int
    stock_after: int
    min_stock: Optional[int] = None


# ---------- GET /inventory/orders ----------

class OrderResponse(BaseModel):
    """One row of the combined order history (deliveries + consumptions).

    Flat projection of what the history table renders: the related supply is
    flattened to supply_id/supply_name/supply_sku (the table never used unit or
    country), and the internal user_uuid is replaced by created_by, a
    human-readable name resolved from the user's profile.
    """
    id: int
    order_type: Literal["inbound", "outbound"]
    quantity: int
    clinic_id: int
    created_at: datetime
    created_by: str
    vendor_name: Optional[str] = None        # only inbound
    consumption_type: Optional[str] = None   # only outbound
    supply_id: int
    supply_name: str
    supply_sku: str
