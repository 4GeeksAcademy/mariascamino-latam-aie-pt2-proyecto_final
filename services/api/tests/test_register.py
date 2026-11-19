"""POST /users — account registration.

Plan: happy path (account + profile created, password hashed), edge cases
(password-length boundary, duplicate e-mail, client trying to pick its own
role, optional profile fields) and failure modes (invalid / missing input).
"""

import database
import security

VALID = {"email": "new@example.com", "password": "Password123!"}


def _users():
    return database.users_table.all()


# ---------------------------------------------------------------- happy path
def test_register_creates_user_with_default_role_and_hashed_password(client):
    response = client.post("/users", json=VALID)

    assert response.status_code == 201
    stored = _users()[0]
    assert stored["email"] == VALID["email"]
    assert stored["role"] == "user"
    assert stored["is_active"] is True
    # The password is stored as a bcrypt hash, never in plain text.
    assert stored["hashed_password"] != VALID["password"]
    assert security.verify_password(VALID["password"], stored["hashed_password"])
    # ...and neither the password nor its hash is ever returned to the client.
    assert "password" not in response.text
    assert "hashed_password" not in response.text


def test_register_creates_profile_from_optional_fields(client):
    payload = {**VALID, "name": "Maria", "phone": "555-0100", "address": "1 Main St"}

    response = client.post("/users", json=payload)

    user_id = response.json()["id"]
    profiles = database.profiles_table.all()
    assert len(profiles) == 1
    assert profiles[0]["user_id"] == user_id
    assert (profiles[0]["name"], profiles[0]["phone"], profiles[0]["address"]) == (
        "Maria",
        "555-0100",
        "1 Main St",
    )


# ---------------------------------------------------------------- edge cases
def test_register_password_boundary_eight_characters_ok_seven_rejected(client):
    ok = client.post("/users", json={"email": "a@example.com", "password": "12345678"})
    too_short = client.post("/users", json={"email": "b@example.com", "password": "1234567"})

    assert ok.status_code == 201
    assert too_short.status_code == 422
    assert [u["email"] for u in _users()] == ["a@example.com"]


def test_register_duplicate_email_is_rejected_and_does_not_create_second_user(client):
    client.post("/users", json=VALID)

    second = client.post("/users", json={**VALID, "password": "AnotherPass1"})

    assert second.status_code == 400
    assert len(_users()) == 1
    # The original password still works: the duplicate did not overwrite it.
    assert security.verify_password(VALID["password"], _users()[0]["hashed_password"])


def test_register_duplicate_email_ignores_letter_case(client):
    """'Maria@x.com' and 'maria@x.com' are the same mailbox for our users."""
    client.post("/users", json={"email": "Maria@Example.com", "password": "Password123!"})

    second = client.post("/users", json={"email": "maria@example.com", "password": "Password123!"})

    assert second.status_code == 400
    assert len(_users()) == 1


def test_register_client_cannot_choose_its_own_role(client):
    """Mass-assignment guard: a client sending role=admin must still get 'user'."""
    client.post("/users", json={**VALID, "role": "admin", "is_active": False})

    stored = _users()[0]
    assert stored["role"] == "user"
    assert stored["is_active"] is True


def test_register_without_profile_fields_still_creates_an_empty_profile(client):
    client.post("/users", json=VALID)

    profile = database.profiles_table.all()[0]
    assert profile["name"] is None and profile["phone"] is None and profile["address"] is None


# -------------------------------------------------------------- failure modes
def test_register_invalid_email_is_rejected_and_nothing_is_stored(client):
    response = client.post("/users", json={"email": "not-an-email", "password": "Password123!"})

    assert response.status_code == 422
    assert _users() == []


def test_register_empty_password_is_rejected(client):
    response = client.post("/users", json={"email": "x@example.com", "password": ""})

    assert response.status_code == 422
    assert _users() == []


def test_register_missing_fields_is_rejected(client):
    assert client.post("/users", json={}).status_code == 422
    assert client.post("/users", json={"email": "x@example.com"}).status_code == 422
    assert _users() == []
