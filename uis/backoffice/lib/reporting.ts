/**
 * lib/reporting.ts — API helpers for the Monthly Clinic Supply Performance dashboard.
 *
 * All calls go through requestJson (adds JWT, handles 401 redirect, parses JSON).
 * Types mirror the shapes returned by GET /reporting/monthly-clinic-supply-performance
 * and GET /reporting/pipeline-runs/latest.
 */

import { requestJson } from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClinicKPI {
  clinic_id: string;
  country: "US" | "UK" | string;
  total_supply_cost: number;
  supply_consumption_count: number;
  critical_stockout_count: number;
  expiry_risk_count: number;
  currency: "USD" | "GBP" | string;
}

export interface MonthlyClinicSupplyPerformance {
  month_start: string;      // ISO date string, e.g. "2026-10-01"
  clinics: ClinicKPI[];
}

export interface PipelineRun {
  run_id: string;
  flow_name: string;
  month_start: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: "running" | "completed" | "failed";
  records_read: number | null;
  records_written: number | null;
  clinics_processed: number | null;
  error_message: string | null;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/**
 * Fetch KPI data for a given month (or the most recently computed month if
 * month_start is omitted). Returns the full response shape.
 */
export async function fetchMonthlyClinicSupplyPerformance(
  monthStart?: string
): Promise<MonthlyClinicSupplyPerformance> {
  const qs = monthStart ? `?month_start=${monthStart}` : "";
  return requestJson<MonthlyClinicSupplyPerformance>(
    `/reporting/monthly-clinic-supply-performance${qs}`
  );
}

/**
 * Fetch the metadata of the most recently executed pipeline run.
 */
export async function fetchLatestPipelineRun(): Promise<PipelineRun> {
  return requestJson<PipelineRun>("/reporting/pipeline-runs/latest");
}

/**
 * Trigger a manual pipeline run for the given month (or previous month if omitted).
 * Returns 202 Accepted immediately.
 */
export async function triggerPipelineRun(
  monthStart?: string
): Promise<{ accepted: boolean; month_start: string; message: string }> {
  const qs = monthStart ? `?month_start=${monthStart}` : "";
  return requestJson(`/reporting/pipeline-runs${qs}`, { method: "POST" });
}
