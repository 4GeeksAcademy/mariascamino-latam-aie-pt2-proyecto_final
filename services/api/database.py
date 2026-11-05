# database.py
import os
from pathlib import Path

from tinydb import TinyDB

# DB_PATH can be overridden (in production the DB lives in a Docker volume, e.g. /data/db.json).
DB_PATH = Path(os.getenv("DB_PATH", Path(__file__).parent / "db.json"))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

db = TinyDB(DB_PATH)
suppliers_table = db.table("suppliers")