from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class Role(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


# ---------- User ----------

class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    # Datos iniciales de perfil, opcionales, se crean junto con el usuario
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[Role] = None


class UserResponse(UserBase):
    """Detail view of one account (GET/PUT /users/{id}). Only reachable by the
    owner or an admin, so returning the email is intended."""
    id: int
    role: Role
    is_active: bool
    created_at: datetime


class UserListItem(BaseModel):
    """Row of the admin user list (GET /users): what an admin needs to identify
    and manage an account. No created_at, never credentials."""
    id: int
    email: EmailStr
    role: Role
    is_active: bool


class RegisterResponse(BaseModel):
    """POST /users (public registration). Deliberately does NOT echo the email
    or any account state: the client already knows what it sent and its next
    step is POST /auth/login. `id` is safe to return (not a credential)."""
    id: int
    detail: str


# ---------- Profile ----------

class ProfileBase(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class ProfileResponse(ProfileBase):
    """Profile as the UI shows it. The profile's own id and its user_id foreign
    key are internal (the API always resolves the profile from the token)."""
    pass


# ---------- Auth ----------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    """GET /auth/me: the caller's own email is allowed here (profile view)."""
    email: EmailStr
    role: Role
    # The caller's own pseudonymous id (users.uuid), named for its only use:
    # the backoffice sends it as `userId` in telemetry events, which must
    # never carry the email or the numeric id (telemetry-plan.md §5.1).
    telemetry_id: str
    profile: Optional[ProfileResponse] = None


# ---------- Password reset / change ----------

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    detail: str
