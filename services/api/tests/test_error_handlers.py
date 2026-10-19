"""App-wide error handling (main.py): what the client is allowed to see."""

import main


def test_validation_errors_never_echo_the_submitted_password(client):
    response = client.post("/users", json={"email": "not-an-email", "password": "SuperSecret123"})

    assert response.status_code == 422
    assert "SuperSecret123" not in response.text
    assert "input" not in response.text


def test_validation_errors_name_the_field_in_plain_language(client):
    response = client.post("/users", json={})

    messages = {e["loc"][-1]: e["msg"] for e in response.json()["detail"]}
    assert set(messages) == {"email", "password"}
    assert all(msg and "Field required" not in msg for msg in messages.values())


def test_malformed_json_body_is_a_clean_422(client):
    response = client.post("/users", content=b"{bad json", headers={"content-type": "application/json"})

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body"]


def test_unexpected_exceptions_return_a_generic_500_without_internal_details():
    from fastapi.testclient import TestClient

    @main.app.get("/_boom")
    def boom():
        raise RuntimeError("secret path /etc/passwd KEY=abc")

    response = TestClient(main.app, raise_server_exceptions=False).get("/_boom")

    assert response.status_code == 500
    assert "secret" not in response.text and "passwd" not in response.text
