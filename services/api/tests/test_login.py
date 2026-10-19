"""POST /auth/login — exchanging credentials for an access token."""

import database
import security


def _login(client, email, password):
    # OAuth2 password flow: form-encoded, e-mail travels in the "username" field.
    return client.post("/auth/login", data={"username": email, "password": password})


# ---------------------------------------------------------------- happy path
def test_login_with_valid_credentials_returns_a_token_for_that_user(client, user):
    response = _login(client, user["email"], user["password"])

    assert response.status_code == 200
    token = response.json()["access_token"]
    # The token identifies exactly the user who logged in.
    assert security.decode_access_token(token) == user["id"]


# ---------------------------------------------------------------- edge cases
def test_login_wrong_password_and_unknown_email_give_the_same_answer(client, user):
    """No user enumeration: the two failures must be indistinguishable."""
    wrong_password = _login(client, user["email"], "WrongPassword1")
    unknown_email = _login(client, "ghost@example.com", "WrongPassword1")

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()
    assert "access_token" not in wrong_password.text


def test_login_inactive_user_cannot_get_a_token_even_with_the_right_password(client, make_user):
    inactive = make_user(email="off@example.com", is_active=False)

    response = _login(client, inactive["email"], inactive["password"])

    assert response.status_code == 401
    assert "access_token" not in response.text


def test_login_password_is_compared_exactly_no_trimming(client, user):
    response = _login(client, user["email"], f" {user['password']} ")

    assert response.status_code == 401


def test_login_email_ignores_letter_case(client, make_user):
    mixed = make_user(email="Maria@Example.com")

    response = _login(client, "maria@example.com", mixed["password"])

    assert response.status_code == 200


# -------------------------------------------------------------- failure modes
def test_login_empty_password_never_issues_a_token(client, user):
    response = _login(client, user["email"], "")

    assert response.status_code in (401, 422)
    assert "access_token" not in response.text


def test_login_missing_fields_is_rejected(client):
    assert client.post("/auth/login", data={}).status_code == 422
    assert client.post("/auth/login", data={"username": "a@example.com"}).status_code == 422


def test_login_with_corrupted_stored_hash_is_a_clean_401_not_a_server_error(client, user):
    """Regression: a malformed hash used to raise inside bcrypt and became a 500."""
    database.users_table.update({"hashed_password": "not-a-bcrypt-hash"}, doc_ids=[user["id"]])

    response = _login(client, user["email"], user["password"])

    assert response.status_code == 401
