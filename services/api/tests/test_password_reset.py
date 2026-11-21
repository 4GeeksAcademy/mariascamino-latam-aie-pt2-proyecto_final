"""POST /auth/forgot-password and POST /auth/reset-password.

The reset token is single-use, expires, is stored hashed and must never help
an attacker discover which e-mails have an account.
"""

from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import database
import password_reset

NEW_PASSWORD = "BrandNewPass9"


def _token_from(url: str) -> str:
    return parse_qs(urlparse(url).query)["token"][0]


def _request_reset(client, email):
    return client.post("/auth/forgot-password", json={"email": email})


def _login_status(client, email, password) -> int:
    return client.post("/auth/login", data={"username": email, "password": password}).status_code


# ---------------------------------------------------------------- happy path
def test_forgot_password_sends_one_email_with_a_working_link(client, user, sent_emails):
    response = _request_reset(client, user["email"])

    assert response.status_code == 200
    assert len(sent_emails) == 1
    to_email, reset_url = sent_emails[0]
    assert to_email == user["email"]
    assert "/reset-password?token=" in reset_url


def test_forgot_password_never_stores_the_raw_token(client, user, sent_emails):
    _request_reset(client, user["email"])
    raw = _token_from(sent_emails[0][1])

    stored = database.password_reset_tokens_table.all()
    assert len(stored) == 1
    assert raw not in str(stored[0])  # only a hash is persisted
    assert stored[0]["token_hash"] == password_reset._hash_token(raw)


def test_reset_with_the_emailed_token_changes_the_password(client, user, sent_emails):
    _request_reset(client, user["email"])
    token = _token_from(sent_emails[0][1])

    response = client.post("/auth/reset-password", json={"token": token, "new_password": NEW_PASSWORD})

    assert response.status_code == 200
    assert _login_status(client, user["email"], NEW_PASSWORD) == 200
    assert _login_status(client, user["email"], user["password"]) == 401  # old one is dead


# ---------------------------------------------------------------- edge cases
def test_forgot_password_for_unknown_email_looks_identical_and_sends_nothing(client, user, sent_emails):
    """Anti-enumeration: same answer whether or not the account exists."""
    known = _request_reset(client, user["email"])
    sent_emails.clear()

    unknown = _request_reset(client, "ghost@example.com")

    assert unknown.status_code == known.status_code == 200
    assert unknown.json() == known.json()
    assert sent_emails == []
    assert len(database.password_reset_tokens_table.all()) == 1  # only the real user's


def test_forgot_password_ignores_letter_case_of_the_email(client, make_user, sent_emails):
    mixed = make_user(email="Maria@Example.com")

    _request_reset(client, "maria@example.com")

    assert [to for to, _ in sent_emails] == [mixed["email"]]


def test_a_new_request_invalidates_the_previous_link(client, user, sent_emails):
    _request_reset(client, user["email"])
    _request_reset(client, user["email"])
    first, second = (_token_from(url) for _, url in sent_emails)

    old = client.post("/auth/reset-password", json={"token": first, "new_password": NEW_PASSWORD})
    new = client.post("/auth/reset-password", json={"token": second, "new_password": NEW_PASSWORD})

    assert old.status_code == 400
    assert new.status_code == 200


def test_reset_token_can_only_be_used_once(client, user, sent_emails):
    _request_reset(client, user["email"])
    token = _token_from(sent_emails[0][1])
    client.post("/auth/reset-password", json={"token": token, "new_password": NEW_PASSWORD})

    replay = client.post("/auth/reset-password", json={"token": token, "new_password": "AttackerPass1"})

    assert replay.status_code == 400
    assert _login_status(client, user["email"], "AttackerPass1") == 401


def test_expired_reset_token_is_rejected(client, user, sent_emails):
    _request_reset(client, user["email"])
    token = _token_from(sent_emails[0][1])
    expired_at = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    database.password_reset_tokens_table.update({"expires_at": expired_at})

    response = client.post("/auth/reset-password", json={"token": token, "new_password": NEW_PASSWORD})

    assert response.status_code == 400
    assert _login_status(client, user["email"], user["password"]) == 200  # unchanged


def test_successful_reset_invalidates_every_other_pending_token(client, user):
    other_token = password_reset.create_reset_token(user["id"])
    # create_reset_token wipes older unused tokens, so craft a second pending one by hand.
    database.password_reset_tokens_table.insert(
        {
            "user_id": user["id"],
            "token_hash": password_reset._hash_token("second-pending-token"),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat(),
            "used": False,
        }
    )

    client.post("/auth/reset-password", json={"token": other_token, "new_password": NEW_PASSWORD})

    leftover = client.post(
        "/auth/reset-password", json={"token": "second-pending-token", "new_password": "AttackerPass1"}
    )
    assert leftover.status_code == 400


# -------------------------------------------------------------- failure modes
def test_reset_with_an_unknown_token_is_rejected(client, user):
    response = client.post("/auth/reset-password", json={"token": "made-up", "new_password": NEW_PASSWORD})

    assert response.status_code == 400


def test_reset_with_an_empty_token_is_rejected(client):
    response = client.post("/auth/reset-password", json={"token": "", "new_password": NEW_PASSWORD})

    assert response.status_code == 400


def test_reset_with_a_too_short_password_is_rejected_and_keeps_the_token_usable(client, user, sent_emails):
    _request_reset(client, user["email"])
    token = _token_from(sent_emails[0][1])

    short = client.post("/auth/reset-password", json={"token": token, "new_password": "short"})
    retry = client.post("/auth/reset-password", json={"token": token, "new_password": NEW_PASSWORD})

    assert short.status_code == 422
    assert retry.status_code == 200  # a typo must not burn the link


def test_forgot_password_with_a_malformed_email_is_rejected(client, sent_emails):
    response = _request_reset(client, "not-an-email")

    assert response.status_code == 422
    assert sent_emails == []


# ------------------------------------------------- password_reset module (unit)
def test_create_reset_token_is_long_and_unique(user):
    first = password_reset.create_reset_token(user["id"])
    second = password_reset.create_reset_token(user["id"])

    assert len(first) >= 32 and first != second


def test_consume_returns_the_user_id_once_then_none(user):
    token = password_reset.create_reset_token(user["id"])

    assert password_reset.consume_reset_token(token) == user["id"]
    assert password_reset.consume_reset_token(token) is None
