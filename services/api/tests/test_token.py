"""Access tokens: creation, expiry, rejection of bad tokens, and GET /auth/me.

This file exists because of the regression that locked users out: token
expiry logic was refactored and nothing caught it. The expiry tests below are
the ones that would have failed.
"""

import time
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from jose import jwt

import database
import security


def _forge(payload: dict, secret: str = None, algorithm: str = "HS256") -> str:
    return jwt.encode(payload, secret or security.SECRET_KEY, algorithm=algorithm)


def _exp(minutes: int) -> int:
    return int((datetime.now(timezone.utc) + timedelta(minutes=minutes)).timestamp())


# ---------------------------------------------------------------- happy path
def test_created_token_decodes_back_to_the_same_user_id():
    token = security.create_access_token(user_id=42)

    assert security.decode_access_token(token) == 42


def test_me_returns_the_identity_of_the_token_owner(client, user, auth_headers):
    response = client.get("/auth/me", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["email"] == user["email"]
    assert response.json()["role"] == "user"


# ---------------------------------------------------------------- edge cases
def test_token_lifetime_matches_the_configured_expiry():
    """If someone changes how `exp` is computed, this breaks immediately."""
    before = time.time()
    token = security.create_access_token(user_id=1)

    exp = jwt.get_unverified_claims(token)["exp"]
    expected = before + security.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    assert abs(exp - expected) < 5  # seconds of tolerance


def test_token_that_expired_a_minute_ago_is_rejected(monkeypatch):
    monkeypatch.setattr(security, "ACCESS_TOKEN_EXPIRE_MINUTES", -1)
    expired = security.create_access_token(user_id=1)

    with pytest.raises(HTTPException) as error:
        security.decode_access_token(expired)

    assert error.value.status_code == 401


def test_token_that_expires_in_the_future_is_still_accepted():
    token = _forge({"sub": "7", "exp": _exp(+1)})

    assert security.decode_access_token(token) == 7


def test_me_rejects_an_expired_token(client, user, monkeypatch):
    monkeypatch.setattr(security, "ACCESS_TOKEN_EXPIRE_MINUTES", -1)
    expired = security.create_access_token(user["id"])

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"})

    assert response.status_code == 401


def test_token_of_a_deleted_user_stops_working(client, user, auth_headers):
    headers = auth_headers(user)
    database.users_table.remove(doc_ids=[user["id"]])

    assert client.get("/auth/me", headers=headers).status_code == 401


# -------------------------------------------------------------- failure modes
@pytest.mark.parametrize("garbage", ["abc", "a.b.c", "", "Bearer", "x" * 500])
def test_malformed_token_is_rejected(garbage):
    with pytest.raises(HTTPException) as error:
        security.decode_access_token(garbage)

    assert error.value.status_code == 401


def test_token_signed_with_another_secret_is_rejected():
    forged = _forge({"sub": "1", "exp": _exp(+10)}, secret="someone-elses-secret")

    with pytest.raises(HTTPException):
        security.decode_access_token(forged)


def test_token_without_subject_is_rejected():
    no_sub = _forge({"exp": _exp(+10)})

    with pytest.raises(HTTPException):
        security.decode_access_token(no_sub)


def test_token_with_non_numeric_subject_is_rejected():
    bad_sub = _forge({"sub": "admin", "exp": _exp(+10)})

    with pytest.raises(HTTPException):
        security.decode_access_token(bad_sub)


def test_unsigned_token_with_alg_none_is_rejected():
    """The classic JWT attack: claim alg=none and skip the signature."""
    header = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0"  # {"alg":"none","typ":"JWT"}
    payload = "eyJzdWIiOiIxIiwiZXhwIjo5OTk5OTk5OTk5fQ"  # {"sub":"1","exp":9999999999}

    with pytest.raises(HTTPException):
        security.decode_access_token(f"{header}.{payload}.")


def test_me_without_a_token_is_rejected(client):
    assert client.get("/auth/me").status_code == 401


def test_me_with_a_garbage_token_is_rejected(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})

    assert response.status_code == 401


# ------------------------------------------------------------ password hashing
def test_hash_is_salted_and_verifies_only_the_right_password():
    first = security.hash_password("Password123!")
    second = security.hash_password("Password123!")

    assert first != second  # random salt: same input, different hash
    assert security.verify_password("Password123!", first)
    assert not security.verify_password("password123!", first)


def test_verify_password_with_a_malformed_hash_returns_false_instead_of_raising():
    assert security.verify_password("anything", "definitely-not-a-hash") is False
