"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ErrorState from "../../../../components/ErrorState";
import {
  BRANCHES,
  CATEGORIES,
  ORIGINS,
  STATUSES,
  getIncidentSummary,
  labelOf,
  type IncidentSummary,
  type Option,
} from "../../../../lib/incidents";

function Card({
  title,
  counts,
  options,
}: {
  title: string;
  counts: Record<string, number>;
  options: Option[];
}) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">{title}</h2>
      <ul className="space-y-1 text-sm">
        {Object.entries(counts ?? {}).map(([key, n]) => (
          <li key={key} className="flex justify-between">
            <span className="text-slate-700">{labelOf(options, key)}</span>
            <span className="font-medium text-slate-900">{n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function IncidentSummaryPage() {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await getIncidentSummary());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Incident summary</h1>
        <Link
          href="/incidents"
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Back to incidents
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading summary…</p>}

      {!loading && error && (
        <ErrorState
          title="We couldn't load the summary"
          message={error}
          onRetry={load}
          retryLabel="Retry"
            homeLabel="Back to home"
            supportText="If the problem continues, contact the HealthCore Digital support team."
        />
      )}

      {!loading && !error && summary && (
        <>
          <p className="text-lg text-slate-800">
            Total incidents: <strong>{summary.total}</strong>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="By status" counts={summary.by_status} options={STATUSES} />
            <Card title="By origin" counts={summary.by_origin} options={ORIGINS} />
            <Card title="By category" counts={summary.by_category} options={CATEGORIES} />
            <Card title="By branch" counts={summary.by_branch} options={BRANCHES} />
          </div>
        </>
      )}
    </div>
  );
}
