"""/profiles/me — each user reads and edits only their own profile."""

import database


def _profile_for(user, **fields):
    data = {"user_id": user["id"], "name": None, "phone": None, "address": None, **fields}
    database.profiles_table.insert(data)


def test_user_reads_their_own_profile(client, user, auth_headers):
    _profile_for(user, name="Maria")

    response = client.get("/profiles/me", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["name"] == "Maria"


def test_partial_update_changes_only_the_sent_fields(client, user, auth_headers):
    _profile_for(user, name="Maria", phone="555-0100")

    client.put("/profiles/me", headers=auth_headers(user), json={"phone": "555-0199"})

    stored = database.profiles_table.all()[0]
    assert stored["phone"] == "555-0199"
    assert stored["name"] == "Maria"  # untouched


def test_each_user_only_sees_their_own_profile(client, make_user, auth_headers):
    alice = make_user(email="alice@example.com")
    bob = make_user(email="bob@example.com")
    _profile_for(alice, name="Alice")
    _profile_for(bob, name="Bob")

    response = client.get("/profiles/me", headers=auth_headers(bob))

    assert response.json()["name"] == "Bob"


def test_missing_profile_returns_404(client, user, auth_headers):
    assert client.get("/profiles/me", headers=auth_headers(user)).status_code == 404
    assert client.put("/profiles/me", headers=auth_headers(user), json={"name": "X"}).status_code == 404


def test_profile_requires_login(client):
    assert client.get("/profiles/me").status_code == 401
