"""/users/{id} — who may read, edit and delete accounts (API-042, group: users)."""

import database

# ---------------------------------------------------------------- happy path
def test_user_can_read_and_update_their_own_email(client, user, auth_headers):
    response = client.put(f"/users/{user['id']}", headers=auth_headers(user), json={"email": "renamed@example.com"})

    assert response.status_code == 200
    assert database.users_table.get(doc_id=user["id"])["email"] == "renamed@example.com"


def test_admin_can_change_another_users_role(client, user, admin, auth_headers):
    response = client.put(f"/users/{user['id']}", headers=auth_headers(admin), json={"role": "manager"})

    assert response.status_code == 200
    assert database.users_table.get(doc_id=user["id"])["role"] == "manager"


def test_deleting_a_user_also_removes_their_profile(client, user, auth_headers):
    database.profiles_table.insert({"user_id": user["id"], "name": "X", "phone": None, "address": None})

    response = client.delete(f"/users/{user['id']}", headers=auth_headers(user))

    assert response.status_code == 200
    assert database.users_table.get(doc_id=user["id"]) is None
    assert database.profiles_table.all() == []


# ---------------------------------------------------------------- edge cases
def test_new_email_is_stored_lowercase(client, user, auth_headers):
    client.put(f"/users/{user['id']}", headers=auth_headers(user), json={"email": "Mixed.Case@Example.com"})

    assert database.users_table.get(doc_id=user["id"])["email"] == "mixed.case@example.com"


def test_updating_to_an_email_used_by_someone_else_is_rejected_even_with_other_casing(client, user, admin, auth_headers):
    response = client.put(f"/users/{user['id']}", headers=auth_headers(user), json={"email": "ADMIN@example.com"})

    assert response.status_code == 400
    assert database.users_table.get(doc_id=user["id"])["email"] == user["email"]


def test_keeping_your_own_email_is_not_a_conflict(client, user, auth_headers):
    response = client.put(f"/users/{user['id']}", headers=auth_headers(user), json={"email": user["email"]})

    assert response.status_code == 200


# -------------------------------------------------------------- failure modes
def test_regular_user_cannot_promote_themselves(client, user, auth_headers):
    response = client.put(f"/users/{user['id']}", headers=auth_headers(user), json={"role": "admin"})

    assert response.status_code == 403
    assert database.users_table.get(doc_id=user["id"])["role"] == "user"


def test_regular_user_cannot_edit_or_delete_someone_else(client, user, admin, auth_headers):
    edit = client.put(f"/users/{admin['id']}", headers=auth_headers(user), json={"email": "hacked@example.com"})
    delete = client.delete(f"/users/{admin['id']}", headers=auth_headers(user))

    assert edit.status_code == 403 and delete.status_code == 403
    assert database.users_table.get(doc_id=admin["id"]) is not None


def test_unknown_user_returns_404(client, user, auth_headers):
    assert client.get("/users/9999", headers=auth_headers(user)).status_code == 404
    assert client.put("/users/9999", headers=auth_headers(user), json={}).status_code == 404
    assert client.delete("/users/9999", headers=auth_headers(user)).status_code == 404


def test_user_endpoints_require_login(client, user):
    assert client.get(f"/users/{user['id']}").status_code == 401
    assert client.put(f"/users/{user['id']}", json={}).status_code == 401
    assert client.delete(f"/users/{user['id']}").status_code == 401
