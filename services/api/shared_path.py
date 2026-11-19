import sys
from pathlib import Path

# services/api/shared_path.py -> parents[2] is the repo root
SHARED_DIR = Path(__file__).resolve().parents[2] / "packages" / "shared"
if str(SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_DIR))
