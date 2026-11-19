"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";

import {
  CLINICS,
  InventoryApiError,
  createDelivery,
  listSupplies,
  supplyIdFromUrl,
  type MedicalSupply,
} from "../../../../../lib/inventory";

type FormValues = { supply_id: string; quantity: string; vendor_name: string; clinic_id: string };
type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = { supply_id: "", quantity: "", vendor_name: "", clinic_id: "" };

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

export default function NewSupplyDeliveryPage() {
  const [supplies, setSupplies] = useState<MedicalSupply[]>([]);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Pre-select the supply when coming from the products page.
    setValues((v) => ({ ...v, supply_id: supplyIdFromUrl() }));
    listSupplies()
      .then(setSupplies)
      .catch((e) => setFormError(e instanceof Error ? e.message : "Could not load medical supplies."));
  }, []);

  function update(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSuccess(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const clientErrors: FormErrors = {};
    if (!values.supply_id) clientErrors.supply_id = "Select a medical supply.";
    const qty = Number(values.quantity);
    if (!Number.isInteger(qty) || qty <= 0) clientErrors.quantity = "Enter a whole number greater than 0.";
    if (!values.vendor_name.trim()) clientErrors.vendor_name = "Vendor name is required.";
    if (!values.clinic_id) clientErrors.clinic_id = "Select the receiving clinic.";
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      await createDelivery({
        supply_id: Number(values.supply_id),
        quantity: qty,
        vendor_name: values.vendor_name.trim(),
        clinic_id: Number(values.clinic_id),
      });
      const supply = supplies.find((s) => String(s.id) === values.supply_id);
      setSuccess(`Delivery registered: ${qty} × ${supply?.name ?? "supply"}.`);
      setValues(EMPTY);
      setErrors({});
    } catch (err) {
      if (err instanceof InventoryApiError) {
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
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Log a supply delivery</h1>
      <p className="mb-6 text-sm text-slate-500">Register a vendor shipment received at a HealthCore clinic. It adds stock.</p>

      {success && (
        <div role="status" className="mb-6 rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">{success}</p>
          <Link href="/inventory/products" className="underline">
            View medical supplies
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

        <Field label="Quantity received *" error={errors.quantity}>
          <input type="number" min={1} step={1} className={inputClass} value={values.quantity} onChange={(e) => update("quantity", e.target.value)} />
        </Field>

        <Field label="Vendor name *" error={errors.vendor_name}>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. MedLine Industries, Cardinal Health UK"
            value={values.vendor_name}
            onChange={(e) => update("vendor_name", e.target.value)}
          />
        </Field>

        <Field label="Receiving clinic *" error={errors.clinic_id}>
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
          {submitting ? "Saving…" : "Register delivery"}
        </button>
      </form>
    </div>
  );
}
