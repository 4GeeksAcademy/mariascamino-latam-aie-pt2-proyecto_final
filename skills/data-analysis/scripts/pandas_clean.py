"""
Safe snippet for basic pandas cleaning. Copy and adapt for your dataset.
Run: python pandas_clean.py  (ensure pandas is installed)
Exits with code 1 and a message on stderr if the input cannot be read or is unusable.
"""
import sys

try:
    import pandas as pd
except ImportError:
    print("ERROR: pandas is not installed. Run: pip install pandas", file=sys.stderr)
    sys.exit(1)

INPUT_PATH = "data.csv"  # adjust path and kwargs as needed


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


# Load (or read_json, read_excel). Each way the read can fail gets its own message.
try:
    df = pd.read_csv(INPUT_PATH)
except FileNotFoundError:
    fail(f"Input file not found: {INPUT_PATH}")
except PermissionError:
    fail(f"No permission to read: {INPUT_PATH}")
except pd.errors.EmptyDataError:
    fail(f"Input file is empty: {INPUT_PATH}")
except (pd.errors.ParserError, UnicodeDecodeError):
    fail(f"Input file is not a valid CSV (check delimiter and encoding): {INPUT_PATH}")

# Defensive check before processing
if df.empty:
    fail(f"Input file has no data rows: {INPUT_PATH}")

print("df_shape", df.shape)
print("df_dtypes", df.dtypes)

# Drop fully null columns
df = df.dropna(axis=1, how="all")
print("df_shape_after_drop_all_null_cols", df.shape)

# Fill or drop nulls in key columns (customise columns)
# df = df.dropna(subset=["required_col"])
# df["optional_col"] = df["optional_col"].fillna(0)

# Normalise column names (optional)
df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
print("df_columns", list(df.columns))

# Deduplicate (optional)
before = len(df)
df = df.drop_duplicates()
print("rows_dropped_duplicates", before - len(df))

# Sample output
print("df_head", df.head())
