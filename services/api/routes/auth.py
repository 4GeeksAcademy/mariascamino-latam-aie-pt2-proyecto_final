import os

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from tinydb import Query

from auth_models import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MeResponse,
    MessageResponse,
    ResetPasswordRequest,
    Token,
)
from database import profiles_table, users_table
from email_service import send_password_reset_email
from password_reset import consume_reset_token, create_reset_token, invalidate_all_tokens_for_user
from security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

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


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest):
    user_doc = users_table.get(UserQuery.email == payload.email)

    if user_doc is not None:
        raw_token = create_reset_token(user_doc.doc_id)
        reset_url = f"{FRONTEND_URL}/reset-password?token={raw_token}"
        send_password_reset_email(payload.email, reset_url)

    # Misma respuesta exista o no la cuenta: si dijéramos "ese email no está
    # registrado" para las que no existen, cualquiera podría usar este
    # endpoint para averiguar qué emails tienen cuenta (enumeración).
    return MessageResponse(
        detail="Si ese correo está registrado, vas a recibir un enlace para restablecer tu contraseña en unos minutos."
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest):
    user_id = consume_reset_token(payload.token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace es inválido, ya expiró o ya fue usado. Pide uno nuevo.",
        )

    users_table.update({"hashed_password": hash_password(payload.new_password)}, doc_ids=[user_id])
    invalidate_all_tokens_for_user(user_id)

    return MessageResponse(detail="Tu contraseña fue actualizada. Ya puedes iniciar sesión.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(payload: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    user_doc = users_table.get(doc_id=current_user["id"])
    if not verify_password(payload.current_password, user_doc["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La contraseña actual no es correcta.")

    users_table.update(
        {"hashed_password": hash_password(payload.new_password)}, doc_ids=[current_user["id"]]
    )
    invalidate_all_tokens_for_user(current_user["id"])

    return MessageResponse(detail="Tu contraseña fue actualizada.")