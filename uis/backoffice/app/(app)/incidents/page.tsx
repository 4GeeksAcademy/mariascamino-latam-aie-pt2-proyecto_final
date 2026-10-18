"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ErrorState from "../../../components/ErrorState";
import {
  BRANCHES,
  CATEGORIES,
  ORIGINS,
  STATUSES,
  STATUS_TRANSITIONS,
  labelOf,
  listIncidents,
  updateIncidentStatus,
  type Incident,
  type IncidentFilters,
} from "../../../lib/incidents";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-800",
  discarded: "bg-slate-200 text-slate-700",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export default function IncidentsPage() {
  const [filters, setFilters] = useState<IncidentFilters>({});
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setIncidents(await listIncidents(filters));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load incidents.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  function setFilter(key: keyof IncidentFilters, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  async function changeStatus(incident: Incident, newStatus: string) {
    if (!newStatus || newStatus === incident.status) return;
    const previous = incidents;
    setNotice(null);
    setPendingId(incident.id);
    // Optimistic update: show the new status right away.
    setIncidents((list) =>
      list.map((i) => (i.id === incident.id ? { ...i, status: newStatus } : i))
    );
    try {
      const updated = await updateIncidentStatus(incident.id, newStatus);
      setIncidents((list) => list.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      // Revert to what we had before and tell the user why.
      setIncidents(previous);
      setNotice(
        `Could not change the status of "${incident.title}". ` +
          (e instanceof Error ? e.message : "Please try again.")
      );
    } finally {
      setPendingId(null);
    }
  }

  const selectClass =
    "rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Incidents</h1>
        <div className="flex gap-2">
          <Link
            href="/incidents/summary"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Summary
          </Link>
          <Link
            href="/incidents/new"
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            New incident
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm text-slate-700">
          <span className="mr-1">Status</span>
          <select
            className={selectClass}
            value={filters.status ?? ""}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">All</option>
            {STATUSES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          <span className="mr-1">Origin</span>
          <select
            className={selectClass}
            value={filters.origin ?? ""}
            onChange={(e) => setFilter("origin", e.target.value)}
          >
            <option value="">All</option>
            {ORIGINS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          <span className="mr-1">Branch</span>
          <select
            className={selectClass}
            value={filters.branch ?? ""}
            onChange={(e) => setFilter("branch", e.target.value)}
          >
            <option value="">All</option>
            {BRANCHES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {notice && (
        <div role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {notice}
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Loading incidents…</p>}

      {!loading && error && (
        <ErrorState
          title="We couldn't load the incidents"
          message={error}
          onRetry={load}
          retryLabel="Retry"
            homeLabel="Back to home"
            supportText="If the problem continues, contact the HealthCore Digital support team."
        />
      )}

      {!loading && !error && incidents.length === 0 && (
        <p className="rounded border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          No incidents found{Object.keys(filters).length > 0 ? " for these filters" : ""}.
        </p>
      )}

      {!loading && !error && incidents.length > 0 && (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Origin</th>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidents.map((i) => {
                const next = STATUS_TRANSITIONS[i.status] ?? [];
                return (
                  <tr key={i.id}>
                    <td className="px-3 py-2 font-medium text-slate-900">{i.title}</td>
                    <td className="px-3 py-2">{labelOf(CATEGORIES, i.category)}</td>
                    <td className="px-3 py-2">{labelOf(ORIGINS, i.origin)}</td>
                    <td className="px-3 py-2">{labelOf(BRANCHES, i.branch)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(i.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            STATUS_STYLES[i.status] ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {labelOf(STATUSES, i.status)}
                        </span>
                        {next.length > 0 && (
                          <select
                            aria-label={`Change status of ${i.title}`}
                            className={selectClass}
                            value=""
                            disabled={pendingId === i.id}
                            onChange={(e) => changeStatus(i, e.target.value)}
                          >
                            <option value="">Change…</option>
                            {next.map((s) => (
                              <option key={s} value={s}>
                                {labelOf(STATUSES, s)}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
