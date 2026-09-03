# models.py
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


class RateUpdate(BaseModel):
    monthly_rate: float = Field(..., gt=0)


class StatusUpdate(BaseModel):
    status: Status