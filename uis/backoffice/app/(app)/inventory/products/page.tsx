"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  CATEGORY_LABELS,
  LOW_STOCK_THRESHOLD,
  listSupplies,
  stockLevel,
  type MedicalSupply,
  type StockLevel,
} from "../../../../lib/inventory";

// Colour + text label (never colour alone) for each stock level.
const LEVEL_STYLES: Record<StockLevel, { badge: string; label: string }> = {
  out: { badge: "bg-red-100 text-red-800 ring-red-300", label: "Out of stock" },
  low: { badge: "bg-amber-100 text-amber-800 ring-amber-300", label: "Low stock" },
  healthy: { badge: "bg-green-100 text-green-800 ring-green-300", label: "Healthy" },
};

export default function MedicalSuppliesPage() {
  const [supplies, setSupplies] = useState<MedicalSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSupplies()
      .then(setSupplies)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load medical supplies."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Medical supplies</h1>
          <p className="text-sm text-slate-500">
            Current stock is the net of vendor deliveries minus clinical consumptions. Low stock: fewer than{" "}
            {LOW_STOCK_THRESHOLD} units.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/orders" className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Order history
          </Link>
          <Link href="/inventory/orders/inbound" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700">
            Log delivery
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading medical supplies…</p>
      ) : (
        !error && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Supply</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3 text-right">Current stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supplies.map((s) => {
                  const level = LEVEL_STYLES[stockLevel(s.current_stock)];
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.sku}</td>
                      <td className="px-4 py-3 text-slate-700">{CATEGORY_LABELS[s.category] ?? s.category}</td>
                      <td className="px-4 py-3 text-slate-700">{s.unit}</td>
                      <td className="px-4 py-3 text-slate-700">{s.country}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{s.current_stock}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${level.badge}`}>
                          {level.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3 whitespace-nowrap">
                          <Link href={`/inventory/orders/inbound?supply_id=${s.id}`} className="text-green-700 underline hover:text-green-900">
                            + Log delivery
                          </Link>
                          <Link href={`/inventory/orders/outbound?supply_id=${s.id}`} className="text-red-700 underline hover:text-red-900">
                            − Log consumption
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {supplies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                      No medical supplies registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
