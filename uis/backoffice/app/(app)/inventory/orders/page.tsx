"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listOrders, type SupplyOrder } from "../../../../lib/inventory";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function SupplyOrdersPage() {
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the order history."))
      .finally(() => setLoading(false));
  }, []);

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
                  <th className="px-4 py-3">Created by (user_uuid)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
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
                        <span className="font-medium text-slate-900">{o.supply.name}</span>
                        <span className="ml-2 font-mono text-xs text-slate-500">{o.supply.sku}</span>
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
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.user_uuid}</td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      No orders registered yet.
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
