"""Validate docs/telemetry/event-schemas.json.

    pip install jsonschema        # or: uv run --with jsonschema python ...
    python docs/telemetry/validate_schemas.py

Checks:
  1. The file is a valid JSON Schema draft-07 document.
  2. Every event schema has metadata (x-healthcore) and an example.
  3. Every example is valid against the full schema (oneOf) and matches
     exactly ONE event schema.
  4. Negative cases that MUST fail: a key outside the allowlist, a missing
     required property, a malformed timestamp, an unknown event_type and an
     actorType/userId mismatch.
  5. Every mandatory event from the BRIEFING is present and carries the
     BRIEFING's minimum inventory properties.
"""
import copy
import json
import sys
from pathlib import Path

from jsonschema import Draft7Validator, FormatChecker

HERE = Path(__file__).parent
schema = json.loads((HERE / "event-schemas.json").read_text(encoding="utf-8"))

MANDATORY = {
    "inbound_order_created", "outbound_order_created", "stock_threshold_triggered",
    "direct_stock_edit_rejected", "supply_expiry_flagged",
}
# BRIEFING §3: minimum properties for inventory events (department only where applicable).
BRIEFING_MIN = {"clinic_id", "country", "product_id", "product_category", "quantity"}

errors: list[str] = []
Draft7Validator.check_schema(schema)
validator = Draft7Validator(schema, format_checker=FormatChecker())
defs = schema["definitions"]
events = [name for name in defs if name != "envelope"]


def matches(instance: dict) -> list[str]:
    hits = []
    for name in events:
        sub = {"definitions": defs, **defs[name]}
        if Draft7Validator(sub, format_checker=FormatChecker()).is_valid(instance):
            hits.append(name)
    return hits


for name in events:
    d = defs[name]
    meta = d.get("x-healthcore", {})
    for key in ("classification", "category", "hypothesis", "decision", "delivery", "deliveryJustification", "pii", "allowlist"):
        if not meta.get(key):
            errors.append(f"{name}: missing x-healthcore.{key}")
    example = d["examples"][0]
    problems = [e.message for e in validator.iter_errors(example)]
    if problems:
        errors.append(f"{name}: example invalid -> {problems[:2]}")
    hit = matches(example)
    if hit != [name]:
        errors.append(f"{name}: example matched {hit}")
    allow = set(d["allOf"][1]["properties"]["properties"]["properties"])
    if set(meta.get("allowlist", [])) != allow:
        errors.append(f"{name}: x-healthcore.allowlist differs from schema properties")

    # ---- negative cases (must be rejected)
    bad = copy.deepcopy(example)
    bad["properties"]["patient_name"] = "John Doe"
    if validator.is_valid(bad):
        errors.append(f"{name}: accepted a key outside the allowlist")
    required = d["allOf"][1]["properties"]["properties"]["required"]
    if required:
        bad = copy.deepcopy(example)
        bad["properties"].pop(required[0])
        if validator.is_valid(bad):
            errors.append(f"{name}: accepted an event without required '{required[0]}'")
    bad = copy.deepcopy(example)
    bad["timestamp"] = "20/11/2026 09:03"
    if validator.is_valid(bad):
        errors.append(f"{name}: accepted a non-ISO-8601 timestamp")
    bad = copy.deepcopy(example)
    bad["userId"] = None if example["actorType"] == "user" else "3b1f8a52-7c4e-4f0e-9a51-2d6b8f0c1e77"
    if validator.is_valid(bad):
        errors.append(f"{name}: accepted an actorType/userId mismatch")

bad = copy.deepcopy(defs["inbound_order_created"]["examples"][0])
bad["event_type"] = "stock_updated"
if validator.is_valid(bad):
    errors.append("accepted an unknown event_type")

for name in MANDATORY:
    if name not in defs:
        errors.append(f"mandatory event missing: {name}")
        continue
    if defs[name]["x-healthcore"]["classification"] != "mandatory":
        errors.append(f"{name}: should be classified as mandatory")
    props = set(defs[name]["allOf"][1]["properties"]["properties"]["properties"])
    if not BRIEFING_MIN <= props:
        errors.append(f"{name}: missing BRIEFING minimum properties {BRIEFING_MIN - props}")

mandatory = sum(defs[n]["x-healthcore"]["classification"] == "mandatory" for n in events)
print(f"{len(events)} event schemas · {mandatory} mandatory · {len(events) - mandatory} identified opportunities")
if errors:
    print("\n".join(f"FAIL {e}" for e in errors))
    sys.exit(1)
print("OK: schema valid, all examples valid, all negative cases rejected.")
