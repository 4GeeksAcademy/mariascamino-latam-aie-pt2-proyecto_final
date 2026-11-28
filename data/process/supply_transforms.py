"""
data/process/supply_transforms.py — Pure transformation functions for the
Monthly Clinic Supply Performance pipeline.

No Prefect, no database, no I/O.  Every function takes a DataFrame (or dict
of DataFrames) and returns a DataFrame.  This makes the logic unit-testable
in isolation without any external dependencies.

The four KPIs produced here map 1-to-1 to the BRIEFING "KPIs to Measure":
  total_supply_cost        → Supply Cost per Clinic
  supply_consumption_count → Supply Consumption Volume
  critical_stockout_count  → Critical Stockout Frequency
  expiry_risk_count        → Expiry Risk Count
"""
from __future__ import annotations

from datetime import date, datetime, timezone

import pandas as pd


# ---------------------------------------------------------------------------
# Individual KPI aggregators
# ---------------------------------------------------------------------------

def aggregate_supply_cost(inbound_df: pd.DataFrame) -> pd.DataFrame:
    """
    Supply Cost per Clinic — sum of `total_cost` from inbound_order_created events.

    Rows where clinic_id is null are silently dropped: they cannot be attributed
    to any clinic and must not pollute the aggregate.

    Returns a DataFrame with columns: clinic_id, country, total_supply_cost, currency.
    """
    if inbound_df.empty or "clinic_id" not in inbound_df.columns:
        return pd.DataFrame(columns=["clinic_id", "country", "total_supply_cost", "currency"])

    df = inbound_df.dropna(subset=["clinic_id"]).copy()
    df["total_cost"] = pd.to_numeric(df.get("total_cost", 0), errors="coerce").fillna(0)

    return (
        df.groupby(["clinic_id", "country"], as_index=False)
        .agg(total_supply_cost=("total_cost", "sum"), currency=("currency", "first"))
    )


def aggregate_consumption_volume(outbound_df: pd.DataFrame) -> pd.DataFrame:
    """
    Supply Consumption Volume — count of outbound_order_created events per clinic.

    Returns a DataFrame with columns: clinic_id, country, supply_consumption_count.
    """
    if outbound_df.empty or "clinic_id" not in outbound_df.columns:
        return pd.DataFrame(columns=["clinic_id", "country", "supply_consumption_count"])

    df = outbound_df.dropna(subset=["clinic_id"])
    return (
        df.groupby(["clinic_id", "country"], as_index=False)
        .agg(supply_consumption_count=("clinic_id", "count"))
    )


def aggregate_stockout_frequency(threshold_df: pd.DataFrame) -> pd.DataFrame:
    """
    Critical Stockout Frequency — count of stock_threshold_triggered events per clinic.

    Returns a DataFrame with columns: clinic_id, country, critical_stockout_count.
    """
    if threshold_df.empty or "clinic_id" not in threshold_df.columns:
        return pd.DataFrame(columns=["clinic_id", "country", "critical_stockout_count"])

    df = threshold_df.dropna(subset=["clinic_id"])
    return (
        df.groupby(["clinic_id", "country"], as_index=False)
        .agg(critical_stockout_count=("clinic_id", "count"))
    )


def aggregate_expiry_risk(expiry_df: pd.DataFrame) -> pd.DataFrame:
    """
    Expiry Risk Count — count of supply_expiry_flagged events per clinic.

    Returns a DataFrame with columns: clinic_id, country, expiry_risk_count.
    """
    if expiry_df.empty or "clinic_id" not in expiry_df.columns:
        return pd.DataFrame(columns=["clinic_id", "country", "expiry_risk_count"])

    df = expiry_df.dropna(subset=["clinic_id"])
    return (
        df.groupby(["clinic_id", "country"], as_index=False)
        .agg(expiry_risk_count=("clinic_id", "count"))
    )


# ---------------------------------------------------------------------------
# Merge — combine the 4 KPI DataFrames into one clinic×month grid
# ---------------------------------------------------------------------------

def merge_clinic_kpis(
    cost_df: pd.DataFrame,
    consumption_df: pd.DataFrame,
    stockout_df: pd.DataFrame,
    expiry_df: pd.DataFrame,
    month_start: date,
) -> pd.DataFrame:
    """
    Merge the four KPI DataFrames into one row per clinic.

    Currency is assigned from country (never converted between USD and GBP —
    the BRIEFING explicitly states cross-currency aggregation is a v2 concern).
    """
    # Union of all clinic_ids seen across any event type
    clinic_frames = [
        df[["clinic_id", "country"]]
        for df in [cost_df, consumption_df, stockout_df, expiry_df]
        if not df.empty and "clinic_id" in df.columns
    ]
    if not clinic_frames:
        return pd.DataFrame(columns=[
            "clinic_id", "country", "month_start",
            "total_supply_cost", "supply_consumption_count",
            "critical_stockout_count", "expiry_risk_count",
            "currency", "computed_at",
        ])

    merged = (
        pd.concat(clinic_frames)
        .drop_duplicates(subset=["clinic_id"])
        .reset_index(drop=True)
    )

    for agg_df, kpi_cols in [
        (cost_df, ["total_supply_cost", "currency"]),
        (consumption_df, ["supply_consumption_count"]),
        (stockout_df, ["critical_stockout_count"]),
        (expiry_df, ["expiry_risk_count"]),
    ]:
        if not agg_df.empty and "clinic_id" in agg_df.columns:
            merged = merged.merge(agg_df[["clinic_id"] + kpi_cols], on="clinic_id", how="left")

    # Fill nulls with zero defaults
    merged["total_supply_cost"] = merged.get("total_supply_cost", pd.Series(dtype=float)).fillna(0.0)
    for col in ["supply_consumption_count", "critical_stockout_count", "expiry_risk_count"]:
        if col not in merged.columns:
            merged[col] = 0
        else:
            merged[col] = merged[col].fillna(0).astype(int)

    # Currency: USD for US clinics, GBP for UK clinics — never mixed per BRIEFING §7
    merged["currency"] = merged["country"].map({"US": "USD", "UK": "GBP"}).fillna("USD")

    merged["month_start"] = month_start
    merged["computed_at"] = datetime.now(timezone.utc)

    return merged


# ---------------------------------------------------------------------------
# Top-level convenience — used by the transform task
# ---------------------------------------------------------------------------

def transform_raw_frames(raw_frames: dict[str, pd.DataFrame], month_start: date) -> pd.DataFrame:
    """
    Applies all four KPI aggregators and merges the results.
    Entry point for the Prefect transform task and for unit tests.
    """
    cost_df = aggregate_supply_cost(raw_frames.get("inbound_order_created", pd.DataFrame()))
    consumption_df = aggregate_consumption_volume(raw_frames.get("outbound_order_created", pd.DataFrame()))
    stockout_df = aggregate_stockout_frequency(raw_frames.get("stock_threshold_triggered", pd.DataFrame()))
    expiry_df = aggregate_expiry_risk(raw_frames.get("supply_expiry_flagged", pd.DataFrame()))
    return merge_clinic_kpis(cost_df, consumption_df, stockout_df, expiry_df, month_start)
