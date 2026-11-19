"""POST /auth/change-password — logged-in user changes their own password."""

import database
import password_reset

NEW_PASSWORD = "BrandNewPass9"


def _change(client, headers, current, new):
    return client.post(
        "/auth/change-password",
        headers=headers,
        json={"current_password": current, "new_password": new},
    )


def _login_status(client, email, password) -> int:
    return client.post("/auth/login", data={"username": email, "password": password}).status_code


# ---------------------------------------------------------------- happy path
def test_change_password_with_the_correct_current_password_works(client, user, auth_headers):
    response = _change(client, auth_headers(user), user["password"], NEW_PASSWORD)

    assert response.status_code == 200
    assert _login_status(client, user["email"], NEW_PASSWORD) == 200
    assert _login_status(client, user["email"], user["password"]) == 401


# ---------------------------------------------------------------- edge cases
def test_new_password_of_exactly_eight_characters_is_accepted(client, user, auth_headers):
    response = _change(client, auth_headers(user), user["password"], "12345678")

    assert response.status_code == 200


def test_changing_the_password_kills_pending_reset_links(client, user, auth_headers):
    pending = password_reset.create_reset_token(user["id"])

    _change(client, auth_headers(user), user["password"], NEW_PASSWORD)

    replay = client.post("/auth/reset-password", json={"token": pending, "new_password": "AttackerPass1"})
    assert replay.status_code == 400


# -------------------------------------------------------------- failure modes
def test_wrong_current_password_is_rejected_and_nothing_changes(client, user, auth_headers):
    response = _change(client, auth_headers(user), "WrongCurrent1", NEW_PASSWORD)

    assert response.status_code == 400
    assert _login_status(client, user["email"], user["password"]) == 200
    assert _login_status(client, user["email"], NEW_PASSWORD) == 401


def test_too_short_new_password_is_rejected_and_nothing_changes(client, user, auth_headers):
    response = _change(client, auth_headers(user), user["password"], "short")

    assert response.status_code == 422
    assert _login_status(client, user["email"], user["password"]) == 200


def test_change_password_requires_a_logged_in_user(client, user):
    response = client.post(
        "/auth/change-password",
        json={"current_password": user["password"], "new_password": NEW_PASSWORD},
    )

    assert response.status_code == 401
    assert _login_status(client, user["email"], user["password"]) == 200


def test_a_user_can_only_change_their_own_password(client, make_user, auth_headers):
    alice = make_user(email="alice@example.com", password="AlicePass123")
    bob = make_user(email="bob@example.com", password="BobPass12345")

    # Bob's token + Alice's current password: the endpoint checks Bob's hash, so it fails.
    response = _change(client, auth_headers(bob), alice["password"], NEW_PASSWORD)

    assert response.status_code == 400
    assert database.users_table.get(doc_id=alice["id"]) is not None
    assert _login_status(client, alice["email"], alice["password"]) == 200
