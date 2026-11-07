# routes/suppliers.py
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query as QueryParam
from tinydb import Query
from tinydb.table import Document
from database import suppliers_table
from models import (
    Category,
    Country,
    RateUpdate,
    StatusUpdate,
    SupplierCreate,
    SupplierResponse,
)
from security import get_current_user

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def _to_response(doc: Document) -> SupplierResponse:
    return SupplierResponse(id=doc.doc_id, **doc)


def _get_or_404(supplier_id: int) -> Document:
    doc = suppliers_table.get(doc_id=supplier_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return doc


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(
    payload: SupplierCreate,
    current_user: dict = Depends(get_current_user),
) -> SupplierResponse:
    record = payload.model_dump(mode="json")
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    doc_id = suppliers_table.insert(record)
    return _to_response(suppliers_table.get(doc_id=doc_id))


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    country: Optional[Country] = QueryParam(None, description="Filtrar por país: USA o UK"),
    category: Optional[Category] = QueryParam(None, description="Filtrar por categoría"),
    current_user: dict = Depends(get_current_user),
) -> list[SupplierResponse]:
    docs = suppliers_table.all()
    if country is not None:
        docs = [d for d in docs if d["country"] == country.value]
    if category is not None:
        docs = [d for d in docs if category.value in d["categories"]]
    return [_to_response(d) for d in docs]


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    current_user: dict = Depends(get_current_user),
) -> SupplierResponse:
    return _to_response(_get_or_404(supplier_id))


@router.patch("/{supplier_id}/rate", response_model=SupplierResponse)
def update_rate(
    supplier_id: int,
    payload: RateUpdate,
    current_user: dict = Depends(get_current_user),
) -> SupplierResponse:
    _get_or_404(supplier_id)
    suppliers_table.update(
        {
            "monthly_rate": payload.monthly_rate,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        doc_ids=[supplier_id],
    )
    return _to_response(suppliers_table.get(doc_id=supplier_id))


@router.patch("/{supplier_id}/status", response_model=SupplierResponse)
def update_status(
    supplier_id: int,
    payload: StatusUpdate,
    current_user: dict = Depends(get_current_user),
) -> SupplierResponse:
    _get_or_404(supplier_id)
    suppliers_table.update(
        {
            "status": payload.status.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        doc_ids=[supplier_id],
    )
    return _to_response(suppliers_table.get(doc_id=supplier_id))


@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _get_or_404(supplier_id)
    suppliers_table.remove(doc_ids=[supplier_id])
    return {"detail": "Proveedor eliminado", "id": supplier_id}