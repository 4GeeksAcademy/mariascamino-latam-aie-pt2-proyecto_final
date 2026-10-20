"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";

import {
  CLINICS,
  CONSUMPTION_TYPES,
  InventoryApiError,
  createConsumption,
  getSupply,
  listSupplies,
  supplyIdFromUrl,
  type MedicalSupply,
  type NewSupplyConsumption,
} from "../../../../../lib/inventory";

type FormValues = { supply_id: string; quantity: string; consumption_type: string; clinic_id: string };
type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = { supply_id: "", quantity: "", consumption_type: "", clinic_id: "" };

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none";

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function NewSupplyConsumptionPage() {
  const [supplies, setSupplies] = useState<MedicalSupply[]>([]);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Live stock of the selected supply, fetched every time the selection changes.
  const [stock, setStock] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  useEffect(() => {
    setValues((v) => ({ ...v, supply_id: supplyIdFromUrl() }));
    listSupplies()
      .then(setSupplies)
      .catch((e) => setFormError(e instanceof Error ? e.message : "Could not load medical supplies."));
  }, []);

  useEffect(() => {
    if (!values.supply_id) {
      setStock(null);
      setStockError(null);
      return;
    }
    let cancelled = false;
    setStockLoading(true);
    setStockError(null);
    getSupply(Number(values.supply_id))
      .then((s) => !cancelled && setStock(s.current_stock))
      .catch((e) => !cancelled && setStockError(e instanceof Error ? e.message : "Could not load the current stock."))
      .finally(() => !cancelled && setStockLoading(false));
    return () => {
      cancelled = true;
    };
  }, [values.supply_id]);

  function update(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSuccess(null);
    setFormError(null);
  }

  const selected = supplies.find((s) => String(s.id) === values.supply_id);
  const qty = Number(values.quantity);
  // Client-side UX guard only: the API is the one that really enforces the rule.
  const exceedsStock = stock !== null && values.quantity !== "" && qty > stock;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const clientErrors: FormErrors = {};
    if (!values.supply_id) clientErrors.supply_id = "Select a medical supply.";
    if (!Number.isInteger(qty) || qty <= 0) clientErrors.quantity = "Enter a whole number greater than 0.";
    if (!values.consumption_type) clientErrors.consumption_type = "Select the consumption type.";
    if (!values.clinic_id) clientErrors.clinic_id = "Select the clinic where it was consumed.";
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      await createConsumption({
        supply_id: Number(values.supply_id),
        quantity: qty,
        consumption_type: values.consumption_type as NewSupplyConsumption["consumption_type"],
        clinic_id: Number(values.clinic_id),
      });
      setSuccess(`Consumption registered: ${qty} × ${selected?.name ?? "supply"}.`);
      setValues(EMPTY);
      setErrors({});
    } catch (err) {
      if (err instanceof InventoryApiError && err.status === 400) {
        // Insufficient stock: show the API message right below the quantity field.
        setErrors({ quantity: err.message });
        // Refresh the displayed stock in case someone else consumed in the meantime.
        getSupply(Number(values.supply_id)).then((s) => setStock(s.current_stock)).catch(() => {});
      } else if (err instanceof InventoryApiError) {
        setErrors(err.fields as FormErrors);
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Log a supply consumption</h1>
      <p className="mb-6 text-sm text-slate-500">
        Register supplies used in patient care or discarded because they expired. It removes stock.
      </p>

      {success && (
        <div role="status" className="mb-6 rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">{success}</p>
          <Link href="/inventory/orders" className="underline">
            View order history
          </Link>
        </div>
      )}

      {formError && (
        <div role="alert" className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="Medical supply *" error={errors.supply_id}>
          <select className={inputClass} value={values.supply_id} onChange={(e) => update("supply_id", e.target.value)}>
            <option value="">Select a supply…</option>
            {supplies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.sku}) — {s.country}
              </option>
            ))}
          </select>
        </Field>

        {values.supply_id && (
          <div aria-live="polite" className="rounded-md border border-slate-200 bg-white p-4 text-sm">
            {stockLoading ? (
              <span className="text-slate-400">Checking available stock…</span>
            ) : stockError ? (
              <span className="text-red-700">{stockError}</span>
            ) : (
              stock !== null && (
                <span className="text-slate-700">
                  Available stock:{" "}
                  <strong className={stock === 0 ? "text-red-700" : "text-slate-900"}>
                    {stock} {selected?.unit ?? "units"}
                  </strong>
                </span>
              )
            )}
          </div>
        )}

        <Field label="Quantity consumed *" error={errors.quantity}>
          <input
            type="number"
            min={1}
            step={1}
            className={`${inputClass} ${exceedsStock ? "border-amber-500 ring-1 ring-amber-400" : ""}`}
            value={values.quantity}
            onChange={(e) => update("quantity", e.target.value)}
          />
          {exceedsStock && !errors.quantity && (
            <p className="mt-1 text-sm font-medium text-amber-700">
              ⚠ You are entering {qty}, but only {stock} are available. This consumption will be rejected.
            </p>
          )}
        </Field>

        <Field label="Consumption type *" error={errors.consumption_type}>
          <select className={inputClass} value={values.consumption_type} onChange={(e) => update("consumption_type", e.target.value)}>
            <option value="">Select a type…</option>
            {CONSUMPTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Clinic *" error={errors.clinic_id}>
          <select className={inputClass} value={values.clinic_id} onChange={(e) => update("clinic_id", e.target.value)}>
            <option value="">Select a clinic…</option>
            {CLINICS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Register consumption"}
        </button>
      </form>
    </div>
  );
}
