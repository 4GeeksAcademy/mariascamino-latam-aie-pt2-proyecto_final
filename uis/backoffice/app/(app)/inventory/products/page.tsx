"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { useFormTelemetry } from "../../../../hooks/useFormTelemetry";
import {
  CATEGORY_LABELS,
  CLINICS,
  InventoryApiError,
  LOW_STOCK_THRESHOLD,
  createSupply,
  listSupplies,
  requestStockAdjustment,
  stockLevel,
  type MedicalSupply,
  type StockLevel,
} from "../../../../lib/inventory";
import {
  expiryFlags,
  trackDirectStockEditRejected,
  trackProductCreated,
  trackProductCreationRejected,
  trackSupplyExpiryFlags,
} from "../../../../lib/inventory-telemetry";
import { daysUntil, expiryBucket } from "../../../../lib/telemetry-domain";

// Colour + text label (never colour alone) for each stock level.
const LEVEL_STYLES: Record<StockLevel, { badge: string; label: string }> = {
  out: { badge: "bg-red-100 text-red-800 ring-red-300", label: "Out of stock" },
  low: { badge: "bg-amber-100 text-amber-800 ring-amber-300", label: "Low stock" },
  healthy: { badge: "bg-green-100 text-green-800 ring-green-300", label: "Healthy" },
};

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none";

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-slate-400">—</span>;
  const days = daysUntil(date);
  const bucket = expiryBucket(days);
  const style =
    bucket === "expired" || bucket === "d7"
      ? "text-red-700"
      : bucket === "d14" || bucket === "d30"
        ? "text-amber-700"
        : "text-slate-700";
  return (
    <span className={style}>
      {date}
      {bucket && <span className="block text-xs">{days < 0 ? `expired ${-days} d ago` : `in ${days} d`}</span>}
    </span>
  );
}

// ---------- "Adjust stock" (direct edit attempt, IP-7) ----------

function AdjustStock({ supply, onDone }: { supply: MedicalSupply; onDone: () => void }) {
  const [clinicId, setClinicId] = useState("");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const attempted = Number(value);
    try {
      await requestStockAdjustment(supply.id, Number(clinicId) || 0, attempted);
    } catch (err) {
      if (err instanceof InventoryApiError && (err.status === 403 || err.status === 422)) {
        trackDirectStockEditRejected({
          supply,
          clinicId: clinicId ? Number(clinicId) : null,
          attemptedStock: value !== "" && Number.isInteger(attempted) ? attempted : null,
          statusCode: err.status,
        });
        setMessage("blocked");
        return;
      }
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (message === "blocked") {
    return (
      <div role="alert" className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-semibold">Stock can&apos;t be edited directly.</p>
        <p>
          For traceability, stock only changes through orders: log a{" "}
          <Link className="underline" href={`/inventory/orders/inbound?supply_id=${supply.id}`}>
            delivery
          </Link>{" "}
          if it&apos;s missing units, or a{" "}
          <Link className="underline" href={`/inventory/orders/outbound?supply_id=${supply.id}`}>
            consumption / expiry write-off
          </Link>{" "}
          if there are fewer.
        </p>
        <button type="button" className="mt-1 underline" onClick={onDone}>
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2 text-xs">
      <select aria-label="Clinic" className="rounded border border-slate-300 px-2 py-1" value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
        <option value="">Clinic…</option>
        {CLINICS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        aria-label="New stock"
        type="number"
        min={0}
        className="w-24 rounded border border-slate-300 px-2 py-1"
        placeholder="New stock"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" className="rounded bg-slate-700 px-2 py-1 text-white">
        Save
      </button>
      <button type="button" className="underline" onClick={onDone}>
        Cancel
      </button>
      {message && <span className="text-red-700">{message}</span>}
    </form>
  );
}

// ---------- New supply form (IP-3) ----------

type NewSupplyValues = {
  name: string;
  sku: string;
  category: string;
  unit: string;
  country: string;
  expiry_date: string;
  min_stock: string;
};
const EMPTY_SUPPLY: NewSupplyValues = { name: "", sku: "", category: "", unit: "", country: "", expiry_date: "", min_stock: "" };

function NewSupplyForm({ onCreated }: { onCreated: (s: MedicalSupply) => void }) {
  const [values, setValues] = useState<NewSupplyValues>(EMPTY_SUPPLY);
  const [errors, setErrors] = useState<Partial<Record<keyof NewSupplyValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useFormTelemetry("product_create", "inventory_products", 7);

  function update(field: keyof NewSupplyValues, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError(null);
    form.fieldChanged(field, next);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clientErrors: Partial<Record<keyof NewSupplyValues, string>> = {};
    for (const f of ["name", "sku", "category", "unit", "country"] as const) {
      if (!values[f].trim()) clientErrors[f] = "This field is required.";
    }
    const min = values.min_stock === "" ? null : Number(values.min_stock);
    if (min !== null && (!Number.isInteger(min) || min < 1)) clientErrors.min_stock = "Enter a whole number greater than 0.";
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      form.validationFailed(clientErrors, "client");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createSupply({
        name: values.name.trim(),
        sku: values.sku.trim(),
        category: values.category,
        unit: values.unit,
        country: values.country,
        expiry_date: values.expiry_date || null,
        min_stock: min,
      });
      trackProductCreated(created);
      form.submitted();
      setValues(EMPTY_SUPPLY);
      onCreated(created);
    } catch (err) {
      if (err instanceof InventoryApiError && (err.status === 400 || err.status === 422)) {
        const fields = err.status === 400 ? { sku: err.message } : err.fields;
        trackProductCreationRejected({
          status: err.status,
          category: values.category,
          country: values.country,
          fieldNames: Object.keys(fields),
        });
        form.validationFailed(fields, "server");
        setErrors(fields);
      }
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const field = (key: keyof NewSupplyValues, label: string, input: React.ReactNode) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {input}
      {errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4">
      {field("name", "Name *", <input className={inputClass} value={values.name} onChange={(e) => update("name", e.target.value)} />)}
      {field("sku", "SKU *", <input className={inputClass} value={values.sku} onChange={(e) => update("sku", e.target.value)} />)}
      {field(
        "category",
        "Category *",
        <select className={inputClass} value={values.category} onChange={(e) => update("category", e.target.value)}>
          <option value="">Select…</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
      {field(
        "unit",
        "Unit *",
        <select className={inputClass} value={values.unit} onChange={(e) => update("unit", e.target.value)}>
          <option value="">Select…</option>
          {["box", "unit", "pack", "vial"].map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      )}
      {field(
        "country",
        "Country *",
        <select className={inputClass} value={values.country} onChange={(e) => update("country", e.target.value)}>
          <option value="">Select…</option>
          <option value="US">US</option>
          <option value="UK">UK</option>
        </select>
      )}
      {field(
        "expiry_date",
        "Expiry date",
        <input type="date" className={inputClass} value={values.expiry_date} onChange={(e) => update("expiry_date", e.target.value)} />
      )}
      {field(
        "min_stock",
        "Minimum stock per clinic",
        <input type="number" min={1} className={inputClass} value={values.min_stock} onChange={(e) => update("min_stock", e.target.value)} />
      )}
      <div className="flex items-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Add supply"}
        </button>
      </div>
      {formError && <p className="text-sm text-red-700 sm:col-span-4">{formError}</p>}
    </form>
  );
}

// ---------- page ----------

export default function MedicalSuppliesPage() {
  const [supplies, setSupplies] = useState<MedicalSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(() => {
    listSupplies()
      .then((list) => {
        setSupplies(list);
        // Expiry windows reached by stock the operator is looking at (mandatory metric).
        trackSupplyExpiryFlags(list);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load medical supplies."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const expiring = expiryFlags(supplies);

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
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {showNew ? "Close" : "+ New supply"}
          </button>
          <Link href="/inventory/orders" className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Order history
          </Link>
          <Link href="/inventory/orders/inbound" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700">
            Log delivery
          </Link>
        </div>
      </div>

      {showNew && (
        <NewSupplyForm
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}

      {expiring.length > 0 && (
        <div role="status" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Supplies close to expiry</p>
          <ul className="mt-1 list-disc pl-5">
            {expiring.map((f) => (
              <li key={`${f.supply.id}-${f.clinicId}`}>
                {f.supply.name} — clinic {f.clinicId}: {f.quantity} {f.supply.unit}
                {f.days < 0 ? ` expired ${-f.days} day(s) ago` : ` expire in ${f.days} day(s)`}
              </li>
            ))}
          </ul>
        </div>
      )}

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
                  <th className="px-4 py-3 text-right">Min / clinic</th>
                  <th className="px-4 py-3">Expiry</th>
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
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{s.min_stock ?? "—"}</td>
                      <td className="px-4 py-3">
                        <ExpiryBadge date={s.expiry_date} />
                      </td>
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
                          <button type="button" onClick={() => setAdjusting(s.id)} className="text-slate-600 underline hover:text-slate-900">
                            Adjust stock
                          </button>
                        </div>
                        {adjusting === s.id && <AdjustStock supply={s} onDone={() => setAdjusting(null)} />}
                      </td>
                    </tr>
                  );
                })}
                {supplies.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
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
