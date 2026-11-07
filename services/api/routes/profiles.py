from fastapi import APIRouter, Depends, HTTPException, status
from tinydb import Query

from auth_models import ProfileResponse, ProfileUpdate
from database import profiles_table
from security import get_current_user

router = APIRouter(prefix="/profiles", tags=["profiles"])

ProfileQuery = Query()


def _get_profile_by_user_id(user_id: int):
    return profiles_table.get(ProfileQuery.user_id == user_id)


def _profile_to_response(doc) -> ProfileResponse:
    data = dict(doc)
    data["id"] = doc.doc_id
    return ProfileResponse(**data)


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: dict = Depends(get_current_user)):
    profile = _get_profile_by_user_id(current_user["id"])
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil no encontrado")
    return _profile_to_response(profile)


@router.put("/me", response_model=ProfileResponse)
def update_my_profile(payload: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    profile = _get_profile_by_user_id(current_user["id"])
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        profiles_table.update(update_data, doc_ids=[profile.doc_id])

    updated = profiles_table.get(doc_id=profile.doc_id)
    return _profile_to_response(updated)