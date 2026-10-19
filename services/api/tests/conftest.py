"""Shared fixtures for the whole test suite.

The environment is configured BEFORE the app is imported, because
``security.py`` reads JWT_SECRET_KEY at import time and ``database.py`` opens
its file at import time. Tests therefore always run against a throw-away
database file and a fixed secret, never against the developer's real
``db.json`` or ``.env``.
"""

import os
import tempfile
from pathlib import Path

_TMP_DIR = tempfile.TemporaryDirectory()
os.environ["DB_PATH"] = str(Path(_TMP_DIR.name) / "test_db.json")
os.environ["JWT_SECRET_KEY"] = "test-secret-key-only-for-tests"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
os.environ["RESET_TOKEN_EXPIRE_MINUTES"] = "30"
# Never talk to SendGrid from tests, even if a real .env exists.
os.environ["SENDGRID_API_KEY"] = ""
os.environ["SENDGRID_FROM_EMAIL"] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import database  # noqa: E402
import main  # noqa: E402
import security  # noqa: E402

# bcrypt is deliberately slow; fewer rounds keep the suite fast. verify() still
# works with hashes made at any cost factor.
security.bcrypt = security.bcrypt.using(rounds=4)

DEFAULT_PASSWORD = "Password123!"

_ALL_TABLES = [
    database.suppliers_table,
    database.users_table,
    database.profiles_table,
    database.password_reset_tokens_table,
    database.incidents_table,
    database.incident_seed_sources_table,
]


@pytest.fixture(autouse=True)
def clean_database():
    """Every test starts from (and leaves behind) an empty database."""
    for table in _ALL_TABLES:
        table.truncate()
    yield
    for table in _ALL_TABLES:
        table.truncate()


@pytest.fixture(autouse=True)
def sent_emails(monkeypatch):
    """Replace the reset-email sender with a recorder: [(to_email, reset_url), ...]."""
    outbox: list[tuple[str, str]] = []
    monkeypatch.setattr(
        "routes.auth.send_password_reset_email",
        lambda to_email, reset_url: outbox.append((to_email, reset_url)),
    )
    return outbox


@pytest.fixture
def client() -> TestClient:
    return TestClient(main.app)


@pytest.fixture
def make_user():
    """Factory that inserts a user directly in the DB (fast, no HTTP involved)."""

    def _make_user(
        email: str = "user@example.com",
        password: str = DEFAULT_PASSWORD,
        role: str = "user",
        is_active: bool = True,
    ) -> dict:
        user_id = database.users_table.insert(
            {
                "email": email,
                "hashed_password": security.hash_password(password),
                "is_active": is_active,
                "role": role,
                "created_at": "2026-01-01T00:00:00+00:00",
            }
        )
        return {"id": user_id, "email": email, "password": password, "role": role}

    return _make_user


@pytest.fixture
def auth_headers():
    """Authorization header for a user returned by ``make_user``."""

    def _auth_headers(user: dict) -> dict:
        return {"Authorization": f"Bearer {security.create_access_token(user['id'])}"}

    return _auth_headers


@pytest.fixture
def user(make_user) -> dict:
    return make_user()


@pytest.fixture
def admin(make_user) -> dict:
    return make_user(email="admin@example.com", role="admin")
