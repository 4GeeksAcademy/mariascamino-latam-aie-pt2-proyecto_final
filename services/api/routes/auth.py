from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from tinydb import Query

from auth_models import MeResponse, Token
from database import profiles_table, users_table
from security import create_access_token, get_current_user, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

UserQuery = Query()
ProfileQuery = Query()


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # form_data.username = el email del usuario (así se llama el campo en el estándar OAuth2)
    user_doc = users_table.get(UserQuery.email == form_data.username)
    if user_doc is None or not verify_password(form_data.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo")

    token = create_access_token(user_id=user_doc.doc_id)
    return Token(access_token=token)


@router.get("/me", response_model=MeResponse)
def read_current_user(current_user: dict = Depends(get_current_user)):
    profile_doc = profiles_table.get(ProfileQuery.user_id == current_user["id"])
    profile = None
    if profile_doc is not None:
        profile_data = dict(profile_doc)
        profile_data["id"] = profile_doc.doc_id
        profile = profile_data

    return MeResponse(
        email=current_user["email"],
        role=current_user["role"],
        profile=profile,
    )