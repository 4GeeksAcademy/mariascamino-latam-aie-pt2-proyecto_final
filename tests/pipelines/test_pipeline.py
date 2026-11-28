"""
tests/pipelines/test_pipeline.py — Unit tests for the supply pipeline transforms.

All tests import from data/process/supply_transforms.py (pure functions, no Prefect,
no database). This means they run with:

    pytest tests/pipelines/test_pipeline.py

No running Prefect server, no DATABASE_URL, no network required.

The five tests cover the five KPIs/behaviours called out in the BRIEFING:
  1. Cost aggregation with known input            (total_supply_cost)
  2. Consumption volume per clinic               (supply_consumption_count)
  3. Defensive null clinic_id exclusion          (data quality guard)
  4. Stockout frequency                          (critical_stockout_count)
  5. Currency assignment by country              (USD for US, GBP for UK)
"""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import pandas as pd
import pytest

# ---------------------------------------------------------------------------
# Make sure data/process/ is on the path regardless of where pytest is run from
# ---------------------------------------------------------------------------
_REPO_ROOT = Path(__file__).resolve().parents[2]
_PROCESS_DIR = _REPO_ROOT / "data" / "process"
if str(_PROCESS_DIR) not in sys.path:
    sys.path.insert(0, str(_PROCESS_DIR))

from supply_transforms import (  # noqa: E402
    aggregate_supply_cost,
    aggregate_consumption_volume,
    aggregate_stockout_frequency,
    merge_clinic_kpis,
    transform_raw_frames,
)

# ---------------------------------------------------------------------------
# Fixtures — shared test data
# ---------------------------------------------------------------------------

MONTH = date(2026, 10, 1)


def _make_inbound(rows: list[dict]) -> pd.DataFrame:
    """Helper: build an inbound_order_created DataFrame."""
    return pd.DataFrame(rows)


def _make_outbound(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


def _make_threshold(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Test 1: Cost aggregation with known input
# ---------------------------------------------------------------------------

class TestAggregateCost:
    def test_sums_total_cost_per_clinic(self):
        """
        GIVEN two inbound orders for clinic-A (100 + 50) and one for clinic-B (200)
        WHEN aggregate_supply_cost is called
        THEN clinic-A total = 150, clinic-B total = 200.
        """
        df = _make_inbound([
            {"clinic_id": "clinic-A", "country": "US", "total_cost": "100.00", "currency": "USD"},
            {"clinic_id": "clinic-A", "country": "US", "total_cost": "50.00",  "currency": "USD"},
            {"clinic_id": "clinic-B", "country": "US", "total_cost": "200.00", "currency": "USD"},
        ])
        result = aggregate_supply_cost(df)

        assert len(result) == 2
        clinic_a = result[result["clinic_id"] == "clinic-A"].iloc[0]
        clinic_b = result[result["clinic_id"] == "clinic-B"].iloc[0]

        assert clinic_a["total_supply_cost"] == pytest.approx(150.0)
        assert clinic_b["total_supply_cost"] == pytest.approx(200.0)

    def test_empty_dataframe_returns_empty(self):
        result = aggregate_supply_cost(pd.DataFrame())
        assert result.empty

    def test_non_numeric_total_cost_treated_as_zero(self):
        """Malformed cost values must not raise — they coerce to 0."""
        df = _make_inbound([
            {"clinic_id": "clinic-X", "country": "US", "total_cost": "INVALID", "currency": "USD"},
        ])
        result = aggregate_supply_cost(df)
        assert result.iloc[0]["total_supply_cost"] == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# Test 2: Consumption volume per clinic
# ---------------------------------------------------------------------------

class TestAggregateConsumption:
    def test_counts_outbound_events_per_clinic(self):
        """
        GIVEN 3 outbound orders for clinic-A and 1 for clinic-B
        WHEN aggregate_consumption_volume is called
        THEN clinic-A count = 3, clinic-B count = 1.
        """
        df = _make_outbound([
            {"clinic_id": "clinic-A", "country": "US"},
            {"clinic_id": "clinic-A", "country": "US"},
            {"clinic_id": "clinic-A", "country": "US"},
            {"clinic_id": "clinic-B", "country": "UK"},
        ])
        result = aggregate_consumption_volume(df)

        assert len(result) == 2
        a = result[result["clinic_id"] == "clinic-A"].iloc[0]
        b = result[result["clinic_id"] == "clinic-B"].iloc[0]
        assert a["supply_consumption_count"] == 3
        assert b["supply_consumption_count"] == 1


# ---------------------------------------------------------------------------
# Test 3: Defensive null clinic_id exclusion
# ---------------------------------------------------------------------------

class TestNullClinicIdExclusion:
    def test_rows_with_null_clinic_id_are_excluded(self):
        """
        GIVEN events where some rows have clinic_id=None
        WHEN any aggregator is called
        THEN those rows must NOT appear in the output — they cannot be attributed
             to any clinic and would pollute the aggregate.
        """
        df = _make_inbound([
            {"clinic_id": "clinic-A", "country": "US", "total_cost": "80.00", "currency": "USD"},
            {"clinic_id": None,       "country": "US", "total_cost": "999.00","currency": "USD"},  # must be dropped
        ])
        result = aggregate_supply_cost(df)
        assert len(result) == 1
        assert result.iloc[0]["clinic_id"] == "clinic-A"
        assert result.iloc[0]["total_supply_cost"] == pytest.approx(80.0)

    def test_all_null_clinic_ids_returns_empty(self):
        df = _make_inbound([
            {"clinic_id": None, "country": "US", "total_cost": "100.00", "currency": "USD"},
        ])
        result = aggregate_supply_cost(df)
        assert result.empty


# ---------------------------------------------------------------------------
# Test 4: Stockout frequency
# ---------------------------------------------------------------------------

class TestAggregateStockoutFrequency:
    def test_counts_threshold_events_per_clinic(self):
        """
        GIVEN 2 stockout triggers for clinic-A and 4 for clinic-B
        WHEN aggregate_stockout_frequency is called
        THEN clinic-A count = 2, clinic-B count = 4.
        """
        df = _make_threshold([
            {"clinic_id": "clinic-A", "country": "US"},
            {"clinic_id": "clinic-A", "country": "US"},
            {"clinic_id": "clinic-B", "country": "UK"},
            {"clinic_id": "clinic-B", "country": "UK"},
            {"clinic_id": "clinic-B", "country": "UK"},
            {"clinic_id": "clinic-B", "country": "UK"},
        ])
        result = aggregate_stockout_frequency(df)

        a = result[result["clinic_id"] == "clinic-A"].iloc[0]
        b = result[result["clinic_id"] == "clinic-B"].iloc[0]
        assert a["critical_stockout_count"] == 2
        assert b["critical_stockout_count"] == 4

    def test_empty_dataframe_returns_empty(self):
        result = aggregate_stockout_frequency(pd.DataFrame())
        assert result.empty


# ---------------------------------------------------------------------------
# Test 5: Currency assignment by country
# ---------------------------------------------------------------------------

class TestCurrencyAssignment:
    def test_us_clinics_get_usd_uk_clinics_get_gbp(self):
        """
        GIVEN events from US and UK clinics
        WHEN transform_raw_frames is called
        THEN US clinic rows have currency=USD and UK clinic rows have currency=GBP.
        Never mix currencies per BRIEFING §7.
        """
        raw_frames = {
            "inbound_order_created": _make_inbound([
                {"clinic_id": "us-clinic-1", "country": "US", "total_cost": "50.00", "currency": "USD"},
                {"clinic_id": "uk-clinic-1", "country": "UK", "total_cost": "30.00", "currency": "GBP"},
            ]),
            "outbound_order_created": _make_outbound([
                {"clinic_id": "us-clinic-1", "country": "US"},
                {"clinic_id": "uk-clinic-1", "country": "UK"},
            ]),
            "stock_threshold_triggered": pd.DataFrame(),
            "supply_expiry_flagged": pd.DataFrame(),
        }

        result = transform_raw_frames(raw_frames, MONTH)

        us_row = result[result["clinic_id"] == "us-clinic-1"].iloc[0]
        uk_row = result[result["clinic_id"] == "uk-clinic-1"].iloc[0]

        assert us_row["currency"] == "USD"
        assert uk_row["currency"] == "GBP"

    def test_unknown_country_defaults_to_usd(self):
        """An unmapped country code should not raise — defaults to USD."""
        raw_frames = {
            "inbound_order_created": _make_inbound([
                {"clinic_id": "mx-clinic-1", "country": "MX", "total_cost": "20.00", "currency": "MXN"},
            ]),
            "outbound_order_created": pd.DataFrame(),
            "stock_threshold_triggered": pd.DataFrame(),
            "supply_expiry_flagged": pd.DataFrame(),
        }
        result = transform_raw_frames(raw_frames, MONTH)
        assert result.iloc[0]["currency"] == "USD"
