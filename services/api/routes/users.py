from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from tinydb import Query

from auth_models import Role, UserCreate, UserResponse, UserUpdate
from database import profiles_table, users_table
from security import get_current_user, hash_password

router = APIRouter(prefix="/users", tags=["users"])

UserQuery = Query()


def _user_to_response(doc) -> UserResponse:
    data = dict(doc)
    data["id"] = doc.doc_id
    return UserResponse(**data)


def _get_user_or_404(user_id: int):
    doc = users_table.get(doc_id=user_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return doc


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate):
    existing = users_table.get(UserQuery.email == payload.email)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ese email ya está registrado")

    new_user = {
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
        "is_active": True,
        "role": Role.USER.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    user_id = users_table.insert(new_user)

    profiles_table.insert(
        {
            "user_id": user_id,
            "name": payload.name,
            "phone": payload.phone,
            "address": payload.address,
        }
    )

    created = users_table.get(doc_id=user_id)
    return _user_to_response(created)


@router.get("", response_model=list[UserResponse])
def list_users(current_user: dict = Depends(get_current_user)):
    return [_user_to_response(doc) for doc in users_table.all()]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, current_user: dict = Depends(get_current_user)):
    doc = _get_user_or_404(user_id)
    return _user_to_response(doc)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, payload: UserUpdate, current_user: dict = Depends(get_current_user)):
    _get_user_or_404(user_id)

    is_self = current_user["id"] == user_id
    is_admin = current_user["role"] == Role.ADMIN.value

    if not is_self and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes modificar a otro usuario")

    update_data = payload.model_dump(exclude_unset=True)

    if "role" in update_data and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo un admin puede cambiar el rol")

    if "email" in update_data:
        duplicate = users_table.get(UserQuery.email == update_data["email"])
        if duplicate is not None and duplicate.doc_id != user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ese email ya está en uso")

    if update_data:
        users_table.update(update_data, doc_ids=[user_id])

    updated = users_table.get(doc_id=user_id)
    return _user_to_response(updated)


@router.delete("/{user_id}")
def delete_user(user_id: int, current_user: dict = Depends(get_current_user)):
    _get_user_or_404(user_id)

    is_self = current_user["id"] == user_id
    is_admin = current_user["role"] == Role.ADMIN.value
    if not is_self and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes eliminar a otro usuario")

    users_table.remove(doc_ids=[user_id])
    profiles_table.remove(UserQuery.user_id == user_id)

    return {"detail": "Usuario eliminado", "id": user_id}