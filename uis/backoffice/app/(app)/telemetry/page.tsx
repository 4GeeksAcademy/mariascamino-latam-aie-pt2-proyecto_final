"use client";

import { useCallback, useEffect, useState } from "react";
import ErrorState from "../../../components/LazyErrorState";
import {
  METRIC_INFO,
  formatCell,
  getTelemetryReport,
  type Row,
  type TelemetryReport,
} from "../../../lib/telemetry-report";

function MetricCard({ name, rows }: { name: string; rows: Row[] }) {
  const info = METRIC_INFO[name] ?? { title: name, question: "" };
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const bar = info.bar && columns.includes(info.bar) ? info.bar : undefined;
  const max = bar ? Math.max(...rows.map((r) => Number(r[bar]) || 0), 0) : 0;

  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase text-slate-500">{info.title}</h2>
      <p className="mb-3 text-sm text-slate-600">{info.question}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No events in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                {columns.map((c) => (
                  <th key={c} className="py-1 pr-4 font-medium">
                    {c}
                  </th>
                ))}
                {bar && <th className="w-40 py-1" aria-hidden />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {columns.map((c) => (
                    <td key={c} className="py-1 pr-4 text-slate-800">
                      {formatCell(c, row[c])}
                    </td>
                  ))}
                  {bar && (
                    <td className="py-1" aria-hidden>
                      <div
                        className="h-2 rounded bg-slate-700"
                        style={{ width: `${max ? (Number(row[bar]) / max) * 100 : 0}%` }}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function TelemetryPage() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [report, setReport] = useState<TelemetryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s?: string, e?: string) => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getTelemetryReport(s, e));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Telemetry — technical report</h1>

      <form
        className="flex flex-wrap items-end gap-3 text-sm"
        onSubmit={(ev) => {
          ev.preventDefault();
          load(start || undefined, end || undefined);
        }}
      >
        <label className="flex flex-col text-slate-600">
          From
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="rounded border border-slate-300 px-2 py-1" />
        </label>
        <label className="flex flex-col text-slate-600">
          To
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded border border-slate-300 px-2 py-1" />
        </label>
        <button type="submit" className="rounded bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700">
          Update
        </button>
        <span className="text-slate-400">Empty = last 7 days</span>
      </form>

      {loading && <p className="text-sm text-slate-500">Loading report…</p>}

      {!loading && error && (
        <ErrorState title="We couldn't load the report" message={error} onRetry={() => load(start || undefined, end || undefined)} retryLabel="Retry" homeLabel="Back to home" />
      )}

      {!loading && !error && report && (
        <>
          <p className="text-sm text-slate-700">
            Period (UTC): <strong>{report.period.from}</strong> → <strong>{report.period.to}</strong>
          </p>
          <div className="space-y-4">
            {Object.entries(report.metrics).map(([name, rows]) => (
              <MetricCard key={name} name={name} rows={rows} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
