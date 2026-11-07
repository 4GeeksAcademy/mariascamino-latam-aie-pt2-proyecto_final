"""
Tokens de un solo uso para el flujo de "olvidé mi contraseña".

Por qué no un JWT con exp: un JWT firmado con solo un claim `exp` es
válido hasta que expira, sin importar cuántas veces se use — no hay forma
de "apagarlo" antes. Para un link de reset eso es un problema real: si
alguien reenvía o reutiliza el mismo link (o si el correo queda en una
bandeja compartida), el token seguiría sirviendo. Por eso guardamos el
estado del token en la base de datos (hasheado, nunca en texto plano) y lo
marcamos `used` apenas se usa una vez — así queda inválido de inmediato,
independientemente de si ya expiró o no.
"""

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from tinydb import Query

from database import password_reset_tokens_table

load_dotenv()

RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "30"))

TokenQuery = Query()


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_reset_token(user_id: int) -> str:
    """Genera un token aleatorio, guarda solo su hash (con expiración y
    used=False) y devuelve el token en texto plano para meterlo en el link
    del correo. Ese texto plano no se guarda en ningún lado."""
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)

    # Cualquier token anterior sin usar de este usuario queda invalidado:
    # solo el link más reciente que se mandó por correo debe funcionar.
    password_reset_tokens_table.remove(
        (TokenQuery.user_id == user_id) & (TokenQuery.used == False)  # noqa: E712
    )

    password_reset_tokens_table.insert(
        {
            "user_id": user_id,
            "token_hash": _hash_token(raw_token),
            "expires_at": expires_at.isoformat(),
            "used": False,
        }
    )
    return raw_token


def consume_reset_token(raw_token: str) -> Optional[int]:
    """Si el token es válido (existe, no expiró, no se usó antes), lo marca
    como usado de inmediato y devuelve el user_id. Si no es válido por
    cualquier motivo, devuelve None -- el caller responde 400 en todos los
    casos, sin distinguir "no existe" de "expiró" de "ya se usó" (para no
    dar pistas de más)."""
    token_hash = _hash_token(raw_token)
    record = password_reset_tokens_table.get(TokenQuery.token_hash == token_hash)

    if record is None or record.get("used"):
        return None

    expires_at = datetime.fromisoformat(record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        return None

    password_reset_tokens_table.update({"used": True}, doc_ids=[record.doc_id])
    return record["user_id"]


def invalidate_all_tokens_for_user(user_id: int) -> None:
    """Se llama después de un reset o change-password exitoso: cualquier otro
    link de reset que hubiera quedado pendiente para este usuario deja de
    servir (por ejemplo, si pidió el reset dos veces)."""
    password_reset_tokens_table.update({"used": True}, TokenQuery.user_id == user_id)
