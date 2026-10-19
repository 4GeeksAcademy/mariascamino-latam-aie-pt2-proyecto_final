"""packages/shared/incident_rules.py — the validation shared by the API and the seed script."""

import shared_path  # noqa: F401  (puts packages/shared on sys.path)
import incident_rules as rules

GOOD_ROW = {
    "incident_id": "HC-1",
    "date": "2024-03-05",
    "clinic_id": "US-TX-02",
    "country": "US",
    "category": "ADMINISTRATIVE",
    "description": "Patient registration data contains error from onboarding",
    "status": "CLOSED",
    "patient_id": "PAT-123456",
    "satisfaction_score": "4",
}


def test_valid_csv_row_is_transformed_with_mapped_status_category_and_branch():
    incident, reason = rules.transform_csv_row(GOOD_ROW)

    assert reason is None
    assert incident["status"] == "resolved"        # CLOSED -> resolved
    assert incident["origin"] == "customer"
    assert incident["created_at"].startswith("2024-03-05")
    assert "patient_id" not in incident            # patient data is never imported


def test_title_is_cut_to_120_characters():
    row = {**GOOD_ROW, "description": "word " * 60}

    incident, _ = rules.transform_csv_row(row)

    assert len(incident["title"]) <= rules.SEED_TITLE_LENGTH


def test_row_with_an_unknown_clinic_is_skipped_with_a_reason():
    incident, reason = rules.transform_csv_row({**GOOD_ROW, "clinic_id": "MARS-01"})

    assert incident is None
    assert reason


def test_a_closed_incident_without_a_satisfaction_score_is_skipped():
    incident, reason = rules.transform_csv_row({**GOOD_ROW, "satisfaction_score": ""})

    assert incident is None
    assert reason == "closed_without_score"


def test_row_with_an_empty_description_is_skipped():
    incident, reason = rules.transform_csv_row({**GOOD_ROW, "description": "   "})

    assert incident is None and reason


def test_status_change_rules():
    assert rules.validate_status_change("open", "in_progress") == {}
    assert "status" in rules.validate_status_change("resolved", "open")
    assert "status" in rules.validate_status_change("open", "banana")
    assert "status" in rules.validate_status_change("open", None)


def test_validate_new_incident_rejects_non_object_bodies():
    assert "form" in rules.validate_new_incident(["not", "an", "object"])
