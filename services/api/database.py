# database.py — the app keeps TWO database connections:
#   1. TinyDB (local JSON file)   -> users, profiles, auth, suppliers
#   2. Supabase (PostgreSQL)      -> inventory: supplies, deliveries, consumptions
import os
from pathlib import Path
from typing import Iterator

from dotenv import load_dotenv
from sqlalchemy.pool import NullPool
from sqlmodel import Session, SQLModel, create_engine
from tinydb import TinyDB

load_dotenv()

# ---------- 1. TinyDB (auth) — unchanged ----------
DB_PATH = Path(__file__).parent / "db.json"
db = TinyDB(DB_PATH)

suppliers_table = db.table("suppliers")
users_table = db.table("users")
profiles_table = db.table("profiles")
password_reset_tokens_table = db.table("password_reset_tokens")
incidents_table = db.table("incidents")
incident_seed_sources_table = db.table("incident_seed_sources")

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


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one SQLModel session per request, always closed."""
    with Session(engine) as session:
        yield session
