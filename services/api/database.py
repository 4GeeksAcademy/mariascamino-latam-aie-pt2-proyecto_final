import sys
from json import JSONDecodeError
from pathlib import Path

from tinydb import TinyDB

DB_PATH = Path(__file__).parent / "db.json"

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
