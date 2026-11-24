import os
import sys
from json import JSONDecodeError
from pathlib import Path
from typing import Iterator

from dotenv import load_dotenv
from sqlalchemy.pool import NullPool
from sqlmodel import Session, SQLModel, create_engine
from tinydb import Query, TinyDB

load_dotenv()

# Two databases: TinyDB (users, auth, suppliers, incidents) and
# Supabase/PostgreSQL via SQLModel (inventory).

# DB_PATH can be overridden (the test suite points it at a temporary file so
# tests never touch the real db.json).
DB_PATH = Path(os.getenv("DB_PATH") or Path(__file__).parent / "db.json")

try:
    db = TinyDB(DB_PATH)
    # TinyDB lee el archivo de forma perezosa; esta lectura destapa un db.json corrupto ahora.
    db.tables()
except (JSONDecodeError, UnicodeDecodeError):
    print(
        "No se pudo leer la base de datos local (db.json está dañado). "
        "Guarda una copia del archivo, bórralo y vuelve a ejecutar el seeder.",
        file=sys.stderr,
    )
    raise SystemExit(1)
except OSError as exc:
    print(f"No se pudo abrir la base de datos local ({type(exc).__name__}).", file=sys.stderr)
    raise SystemExit(1)

suppliers_table = db.table("suppliers")
users_table = db.table("users")
profiles_table = db.table("profiles")
password_reset_tokens_table = db.table("password_reset_tokens")
incidents_table = db.table("incidents")
incident_seed_sources_table = db.table("incident_seed_sources")


def find_user_by_email(email: str):
    """Look a user up by e-mail ignoring letter case.

    'Maria@x.com' and 'maria@x.com' are the same mailbox. The comparison is
    done on lower-cased values so accounts stored with capital letters before
    this fix are still found.
    """
    wanted = (email or "").strip().lower()
    return users_table.get(
        Query().email.test(lambda stored: isinstance(stored, str) and stored.strip().lower() == wanted)
    )

# ---------- 2. Supabase / PostgreSQL (inventory) ----------
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está definido. Revisa tu archivo .env")

# Supabase gives a "postgresql://..." URI. Newer SQLAlchemy versions map that
# to the psycopg (v3) driver, so we pin the psycopg2 driver we installed.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Supabase's Transaction pooler already pools connections, so SQLAlchemy must
# not keep its own pool on top of it (NullPool).
engine = create_engine(DATABASE_URL, poolclass=NullPool, pool_pre_ping=True)


def init_db() -> None:
    """Create the inventory tables in Supabase if they don't exist (dev only;
    production would use Alembic migrations)."""
    import models  # noqa: F401  (registers the tables in SQLModel.metadata)

    SQLModel.metadata.create_all(engine)
    _add_missing_columns()


# Columns added after the tables already existed in Supabase. create_all()
# never alters an existing table, so they are added here, idempotently.
# (Telemetry prerequisites P1-P3, docs/telemetry/telemetry-plan.md §4.2.)
_ADDED_COLUMNS = {
    "medical_supply": {"expiry_date": "DATE", "min_stock": "INTEGER"},
    "supply_consumption": {"department": "VARCHAR(30)"},
}


def _add_missing_columns() -> None:
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in _ADDED_COLUMNS.items():
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, sql_type in columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one SQLModel session per request, always closed."""
    with Session(engine) as session:
        yield session
