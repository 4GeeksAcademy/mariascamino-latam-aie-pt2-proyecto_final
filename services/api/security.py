import os
import uuid
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.hash import bcrypt

from database import users_table

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY no está definido. Revisa tu archivo .env")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(plain_password: str) -> str:
    return bcrypt.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.verify(plain_password, hashed_password)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": int(expire.timestamp())}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_raw = payload.get("sub")
        if user_id_raw is None:
            raise credentials_exception
        return int(user_id_raw)
    except (JWTError, ValueError):
        raise credentials_exception


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    user_id = decode_access_token(token)
    user_doc = users_table.get(doc_id=user_id)
    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = dict(user_doc)
    user["id"] = user_doc.doc_id
    user["uuid"] = ensure_user_uuid(user_doc)
    return user


def ensure_user_uuid(user_doc) -> str:
    """Return the user's UUID from TinyDB. Users created before the inventory
    milestone don't have one yet, so it is generated once and saved."""
    if not user_doc.get("uuid"):
        new_uuid = str(uuid.uuid4())
        users_table.update({"uuid": new_uuid}, doc_ids=[user_doc.doc_id])
        return new_uuid
    return user_doc["uuid"]