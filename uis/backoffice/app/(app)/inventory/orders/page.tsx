"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  filterOrders,
  listOrders,
  summarizeOrders,
  type OrderTypeFilter,
  type SupplyOrder,
} from "../../../../lib/inventory";

// Rows rendered per step. The full history (~24 000 orders with realistic
// data) took ~7 s to put on screen when every row was rendered at once.
const PAGE_SIZE = 200;

// One formatter for the whole page. `toLocaleString(...)` builds a new
// Intl.DateTimeFormat on EVERY call, which is slow when repeated per row.
const DATE_TIME = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return DATE_TIME.format(d);
}

const TYPE_OPTIONS: { value: OrderTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "inbound", label: "Deliveries (inbound)" },
  { value: "outbound", label: "Consumptions (outbound)" },
];

export default function SupplyOrdersPage() {
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the order history."))
      .finally(() => setLoading(false));
  }, []);

  // useMemo #1 — totals over the WHOLE history (one O(n) pass over ~24 000
  // orders). They only depend on `orders`, so changing the type filter or
  // clicking "Show more" re-renders the page without recomputing them.
  const totals = useMemo(() => summarizeOrders(orders), [orders]);

  // useMemo #2 — the filtered list. Recomputed only when the data or the
  // filter changes; "Show more" just takes a bigger slice of the same array.
  const filtered = useMemo(() => filterOrders(orders, typeFilter), [orders, typeFilter]);

  const visible = filtered.slice(0, visibleCount);

  function changeType(value: OrderTypeFilter) {
    setTypeFilter(value);
    setVisibleCount(PAGE_SIZE); // a new filter starts again from the top
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Supply order history</h1>
          <p className="text-sm text-slate-500">All vendor deliveries and clinical consumptions. Read-only.</p>
        </div>
        <Link href="/inventory/products" className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Medical supplies
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading orders…</p>
      ) : (
        !error && (
          <>
            <dl className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <dt className="text-xs uppercase text-slate-500">Units delivered</dt>
                <dd className="text-xl font-semibold tabular-nums text-green-700">
                  {totals.unitsDelivered.toLocaleString("en-GB")}
                </dd>
                <dd className="text-xs text-slate-500">{totals.inboundOrders.toLocaleString("en-GB")} deliveries</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <dt className="text-xs uppercase text-slate-500">Units consumed</dt>
                <dd className="text-xl font-semibold tabular-nums text-red-700">
                  {totals.unitsConsumed.toLocaleString("en-GB")}
                </dd>
                <dd className="text-xs text-slate-500">{totals.outboundOrders.toLocaleString("en-GB")} consumptions</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <dt className="text-xs uppercase text-slate-500">Expiry waste</dt>
                <dd className="text-xl font-semibold tabular-nums text-slate-900">{totals.wastePct}%</dd>
                <dd className="text-xs text-slate-500">{totals.unitsWasted.toLocaleString("en-GB")} units discarded</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <dt className="text-xs uppercase text-slate-500">Most consumed</dt>
                <dd className="truncate text-sm font-semibold text-slate-900">{totals.topConsumed?.name ?? "—"}</dd>
                <dd className="text-xs text-slate-500">
                  {totals.topConsumed ? `${totals.topConsumed.units.toLocaleString("en-GB")} units` : "No consumptions yet"}
                </dd>
              </div>
            </dl>

            <label className="block text-sm text-slate-700">
              <span className="mr-2">Show</span>
              <select
                value={typeFilter}
                onChange={(e) => changeType(e.target.value as OrderTypeFilter)}
                className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Supply</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3">Clinic</th>
                    <th className="px-4 py-3">Detail</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Created by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((o) => {
                    const inbound = o.order_type === "inbound";
                    return (
                      <tr key={`${o.order_type}-${o.id}`} className={inbound ? "bg-green-50/40" : "bg-red-50/40"}>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              inbound ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {inbound ? "↓ Delivery (inbound)" : "↑ Consumption (outbound)"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{o.supply_name}</span>
                          <span className="ml-2 font-mono text-xs text-slate-500">{o.supply_sku}</span>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold tabular-nums ${inbound ? "text-green-700" : "text-red-700"}`}>
                          {inbound ? "+" : "−"}
                          {o.quantity}
                        </td>
                        <td className="px-4 py-3 text-slate-700">Clinic {o.clinic_id}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {inbound ? o.vendor_name : o.consumption_type === "expiry_waste" ? "Expiry waste" : "Clinical use"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDateTime(o.created_at)}</td>
                        <td className="px-4 py-3 text-slate-700">{o.created_by}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                        No orders registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>
                  Showing {visible.length.toLocaleString("en-GB")} of {filtered.length.toLocaleString("en-GB")} orders
                </span>
                {visible.length < filtered.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                    className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                  >
                    Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
                  </button>
                )}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
