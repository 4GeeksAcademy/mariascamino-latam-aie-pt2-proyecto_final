"""/api/incidents — centralized incident manager (API-042, group: incidents)."""

import database

VALID = {
    "title": "Printer on fire",
    "description": "The reception printer is smoking.",
    "category": "facility_issue",
    "origin": "branch",
    "branch": "austin_north",
}


def _create(client, **overrides):
    return client.post("/api/incidents", json={**VALID, **overrides})


def _fields_with_errors(response):
    return {e["field"] for e in response.json()["errors"]}


# ---------------------------------------------------------------- happy path
def test_create_incident_defaults_to_open_and_trims_text(client):
    response = _create(client, title="  Printer on fire  ")

    assert response.status_code == 201
    stored = database.incidents_table.all()[0]
    assert stored["status"] == "open"
    assert stored["title"] == "Printer on fire"
    assert stored["created_at"] == stored["updated_at"]


def test_list_filters_and_returns_newest_first(client):
    _create(client, title="first")
    _create(client, title="second", origin="customer")

    everything = client.get("/api/incidents").json()
    only_customer = client.get("/api/incidents?origin=customer").json()

    assert [i["title"] for i in everything] == ["second", "first"]
    assert [i["title"] for i in only_customer] == ["second"]


def test_incident_follows_its_lifecycle_open_to_in_progress_to_resolved(client):
    incident_id = _create(client).json()["id"]

    step1 = client.patch(f"/api/incidents/{incident_id}/status", json={"status": "in_progress"})
    step2 = client.patch(f"/api/incidents/{incident_id}/status", json={"status": "resolved"})

    assert step1.status_code == step2.status_code == 200
    assert database.incidents_table.get(doc_id=incident_id)["status"] == "resolved"


# ---------------------------------------------------------------- edge cases
def test_summary_on_an_empty_database_is_all_zeros(client):
    summary = client.get("/api/incidents/summary").json()

    assert summary["total"] == 0
    assert set(summary["by_status"].values()) == {0}
    assert set(summary["by_origin"].values()) == {0}


def test_summary_counts_by_status_and_branch(client):
    _create(client)
    _create(client, branch="dallas_uptown")

    summary = client.get("/api/incidents/summary").json()

    assert summary["total"] == 2
    assert summary["by_status"]["open"] == 2
    assert summary["by_branch"]["austin_north"] == 1
    assert summary["by_branch"]["dallas_uptown"] == 1


def test_title_length_boundary_200_ok_201_rejected(client):
    assert _create(client, title="x" * 200).status_code == 201

    too_long = _create(client, title="x" * 201)
    assert too_long.status_code == 400
    assert "title" in _fields_with_errors(too_long)


def test_branch_is_required_for_every_origin(client):
    for origin in ("customer", "branch", "internal"):
        response = _create(client, origin=origin, branch="")
        assert response.status_code == 400
        assert "branch" in _fields_with_errors(response)


def test_whitespace_only_title_counts_as_empty(client):
    response = _create(client, title="   ")

    assert response.status_code == 400
    assert "title" in _fields_with_errors(response)


# -------------------------------------------------------------- failure modes
def test_validation_errors_name_every_offending_field_and_store_nothing(client):
    response = client.post("/api/incidents", json={})

    assert response.status_code == 400
    assert {"title", "description", "category", "origin", "branch"} <= _fields_with_errors(response)
    assert database.incidents_table.all() == []


def test_invalid_category_is_rejected(client):
    response = _create(client, category="alien_invasion")

    assert response.status_code == 400
    assert "category" in _fields_with_errors(response)


def test_final_statuses_cannot_be_reopened(client):
    incident_id = _create(client, status="open").json()["id"]
    client.patch(f"/api/incidents/{incident_id}/status", json={"status": "discarded"})

    response = client.patch(f"/api/incidents/{incident_id}/status", json={"status": "open"})

    assert response.status_code == 400
    assert database.incidents_table.get(doc_id=incident_id)["status"] == "discarded"


def test_cannot_skip_straight_from_open_to_resolved(client):
    incident_id = _create(client).json()["id"]

    response = client.patch(f"/api/incidents/{incident_id}/status", json={"status": "resolved"})

    assert response.status_code == 400


def test_unknown_incident_returns_404(client):
    assert client.get("/api/incidents/999").status_code == 404
    assert client.patch("/api/incidents/999/status", json={"status": "resolved"}).status_code == 404


def test_unknown_filter_value_is_rejected(client):
    assert client.get("/api/incidents?status=banana").status_code == 400
