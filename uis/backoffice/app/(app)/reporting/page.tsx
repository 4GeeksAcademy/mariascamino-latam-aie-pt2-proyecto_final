"use client";

/**
 * app/(app)/reporting/page.tsx
 * Monthly Clinic Supply Performance Dashboard
 *
 * Displays 4 KPIs (total_supply_cost, supply_consumption_count,
 * critical_stockout_count, expiry_risk_count) for every clinic,
 * grouped by country (US | UK), plus pipeline run metadata and a
 * manual "Run pipeline" trigger button.
 *
 * Data source: GET /reporting/monthly-clinic-supply-performance
 *              GET /reporting/pipeline-runs/latest
 * API helpers: lib/reporting.ts
 */

import { useCallback, useEffect, useState } from "react";
import {
  ClinicKPI,
  MonthlyClinicSupplyPerformance,
  PipelineRun,
  fetchLatestPipelineRun,
  fetchMonthlyClinicSupplyPerformance,
  triggerPipelineRun,
} from "../../../lib/reporting";
import { getErrorMessage } from "../../../lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number, currency?: string): string {
  if (currency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US").format(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function StatusBadge({ status }: { status: PipelineRun["status"] }) {
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    running: "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Summary KPI cards — totals across all clinics for the selected month
// ---------------------------------------------------------------------------

function SummaryCards({
  clinics,
}: {
  clinics: ClinicKPI[];
}) {
  const usTotal = clinics
    .filter((c) => c.country === "US")
    .reduce((s, c) => s + c.total_supply_cost, 0);
  const ukTotal = clinics
    .filter((c) => c.country === "UK")
    .reduce((s, c) => s + c.total_supply_cost, 0);
  const totalConsumption = clinics.reduce(
    (s, c) => s + c.supply_consumption_count,
    0
  );
  const totalStockouts = clinics.reduce(
    (s, c) => s + c.critical_stockout_count,
    0
  );
  const totalExpiry = clinics.reduce((s, c) => s + c.expiry_risk_count, 0);

  const cards = [
    {
      label: "Supply Cost (US)",
      value: fmt(usTotal, "USD"),
      sub: "USD · all US clinics",
      color: "border-blue-400",
    },
    {
      label: "Supply Cost (UK)",
      value: fmt(ukTotal, "GBP"),
      sub: "GBP · all UK clinics",
      color: "border-indigo-400",
    },
    {
      label: "Consumption Volume",
      value: fmt(totalConsumption),
      sub: "outbound orders · all clinics",
      color: "border-teal-400",
    },
    {
      label: "Critical Stockouts",
      value: fmt(totalStockouts),
      sub: "threshold triggers · all clinics",
      color: "border-orange-400",
    },
    {
      label: "Expiry Risk",
      value: fmt(totalExpiry),
      sub: "flagged items · all clinics",
      color: "border-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-lg border-l-4 bg-white p-4 shadow-sm ${c.color}`}
        >
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {c.label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{c.value}</p>
          <p className="mt-0.5 text-xs text-slate-400">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clinic table
// ---------------------------------------------------------------------------

function ClinicTable({ clinics, country }: { clinics: ClinicKPI[]; country: string }) {
  const filtered = clinics.filter((c) => c.country === country);
  if (filtered.length === 0) {
    return <p className="text-sm text-slate-400 italic">No data for {country} clinics.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-2 pr-4 font-semibold text-slate-600">Clinic ID</th>
            <th className="py-2 pr-4 font-semibold text-slate-600 text-right">Supply Cost</th>
            <th className="py-2 pr-4 font-semibold text-slate-600 text-right">Consumption</th>
            <th className="py-2 pr-4 font-semibold text-slate-600 text-right">Stockouts</th>
            <th className="py-2 font-semibold text-slate-600 text-right">Expiry Flags</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c.clinic_id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2 pr-4 font-mono text-xs text-slate-700">{c.clinic_id}</td>
              <td className="py-2 pr-4 text-right text-slate-800">
                {fmt(c.total_supply_cost, c.currency)}
              </td>
              <td className="py-2 pr-4 text-right text-slate-700">{fmt(c.supply_consumption_count)}</td>
              <td className="py-2 pr-4 text-right">
                <span className={c.critical_stockout_count > 0 ? "text-orange-600 font-semibold" : "text-slate-700"}>
                  {fmt(c.critical_stockout_count)}
                </span>
              </td>
              <td className="py-2 text-right">
                <span className={c.expiry_risk_count > 0 ? "text-rose-600 font-semibold" : "text-slate-700"}>
                  {fmt(c.expiry_risk_count)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline run info panel
// ---------------------------------------------------------------------------

function PipelineRunPanel({
  run,
  onTrigger,
  triggering,
}: {
  run: PipelineRun | null;
  onTrigger: () => void;
  triggering: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Last Pipeline Run</h3>
          {run ? (
            <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>
                <span className="font-medium text-slate-700">Status:</span>{" "}
                <StatusBadge status={run.status} />
              </span>
              <span>
                <span className="font-medium text-slate-700">Month:</span>{" "}
                {run.month_start ?? "—"}
              </span>
              <span>
                <span className="font-medium text-slate-700">Started:</span>{" "}
                {fmtDate(run.started_at)}
              </span>
              <span>
                <span className="font-medium text-slate-700">Ended:</span>{" "}
                {fmtDate(run.ended_at)}
              </span>
              <span>
                <span className="font-medium text-slate-700">Events read:</span>{" "}
                {run.records_read ?? "—"}
              </span>
              <span>
                <span className="font-medium text-slate-700">Rows written:</span>{" "}
                {run.records_written ?? "—"}
              </span>
              <span>
                <span className="font-medium text-slate-700">Clinics:</span>{" "}
                {run.clinics_processed ?? "—"}
              </span>
              {run.error_message && (
                <span className="text-red-600">
                  <span className="font-medium">Error:</span> {run.error_message}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-400 italic">No runs found.</p>
          )}
        </div>
        <button
          onClick={onTrigger}
          disabled={triggering}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {triggering ? "Triggering…" : "▶ Run pipeline"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportingPage() {
  const [data, setData] = useState<MonthlyClinicSupplyPerformance | null>(null);
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpis, latestRun] = await Promise.allSettled([
        fetchMonthlyClinicSupplyPerformance(),
        fetchLatestPipelineRun(),
      ]);
      if (kpis.status === "fulfilled") setData(kpis.value);
      else setError(getErrorMessage(kpis.reason, "Could not load KPI data."));
      if (latestRun.status === "fulfilled") setRun(latestRun.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTrigger = useCallback(async () => {
    setTriggering(true);
    setTriggerMessage(null);
    try {
      const res = await triggerPipelineRun();
      setTriggerMessage(res.message);
      // Reload run metadata after a short delay to pick up "running" status
      setTimeout(() => {
        fetchLatestPipelineRun()
          .then(setRun)
          .catch(() => null);
      }, 2000);
    } catch (err) {
      setTriggerMessage(getErrorMessage(err, "Failed to trigger pipeline run."));
    } finally {
      setTriggering(false);
    }
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Monthly Clinic Supply Performance
          </h1>
          {data && (
            <p className="mt-1 text-sm text-slate-500">
              Reporting period:{" "}
              <span className="font-medium text-slate-700">{data.month_start}</span>
              {" · "}
              {data.clinics.length} clinic{data.clinics.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Loading…" : "↺ Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Trigger feedback */}
      {triggerMessage && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          {triggerMessage}
        </div>
      )}

      {/* Pipeline run panel */}
      <PipelineRunPanel run={run} onTrigger={handleTrigger} triggering={triggering} />

      {/* Loading skeleton */}
      {loading && (
        <div className="text-sm text-slate-400 italic">Loading reporting data…</div>
      )}

      {/* KPI summary cards */}
      {!loading && data && data.clinics.length > 0 && (
        <SummaryCards clinics={data.clinics} />
      )}

      {/* US clinics */}
      {!loading && data && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700">🇺🇸 US Clinics (USD)</h2>
          <ClinicTable clinics={data.clinics} country="US" />
        </section>
      )}

      {/* UK clinics */}
      {!loading && data && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700">🇬🇧 UK Clinics (GBP)</h2>
          <ClinicTable clinics={data.clinics} country="UK" />
        </section>
      )}

      {/* Empty state */}
      {!loading && data && data.clinics.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          No data for this month yet. Run the pipeline to generate the first report.
        </div>
      )}
    </main>
  );
}
