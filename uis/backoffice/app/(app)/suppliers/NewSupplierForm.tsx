"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/Field";
import type { NewSupplierPayload } from "@/hooks/useSuppliers";
import { CATEGORIES, COUNTRY_CURRENCY, categoryLabel } from "./supplier-options";

/**
 * "Registrar nuevo proveedor" form.
 *
 * Lazy-loaded by SuppliersDirectory with next/dynamic: most visits to the
 * directory only read the table, so this code (and its state) is only
 * downloaded when someone opens the form. Keeping the form state HERE (not in
 * the directory) also means typing a supplier name no longer re-renders the
 * whole supplier table on every keystroke. See CACHING_REPORT.md.
 */
type NewSupplierForm = {
  name: string;
  country: "USA" | "UK";
  categories: string[];
  monthly_rate: string;
  contact_email: string;
  notes: string;
};

const emptyForm: NewSupplierForm = {
  name: "",
  country: "USA",
  categories: [],
  monthly_rate: "",
  contact_email: "",
  notes: "",
};

export default function NewSupplierForm({
  onCreate,
}: {
  onCreate: (payload: NewSupplierPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<NewSupplierForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (form.categories.length === 0) {
      setFormError("Selecciona al menos una categoría.");
      return;
    }
    const rateNumber = Number(form.monthly_rate);
    if (!form.monthly_rate || Number.isNaN(rateNumber) || rateNumber <= 0) {
      setFormError("La tarifa mensual debe ser un número mayor a 0.");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        name: form.name,
        country: form.country,
        categories: form.categories,
        monthly_rate: rateNumber,
        currency: COUNTRY_CURRENCY[form.country],
        contact_email: form.contact_email || null,
        notes: form.notes || null,
      });
      setForm(emptyForm);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "No pudimos registrar el proveedor. Inténtalo de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleCreate}
      className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Field label="Nombre">
        <input
          required
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, name: e.target.value }))
          }
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </Field>
      <Field label="País">
        <select
          value={form.country}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              country: e.target.value as "USA" | "UK",
            }))
          }
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="USA">USA (moneda: USD)</option>
          <option value="UK">UK (moneda: GBP)</option>
        </select>
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="block text-xs font-medium text-slate-500">
          Categorías
        </legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <label
              key={cat}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                form.categories.includes(cat)
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-600"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={form.categories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />
              {categoryLabel(cat)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={<>Tarifa mensual ({COUNTRY_CURRENCY[form.country]})</>}>
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          value={form.monthly_rate}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, monthly_rate: e.target.value }))
          }
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </Field>
      <Field label="Email de contacto (opcional)">
        <input
          type="email"
          value={form.contact_email}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, contact_email: e.target.value }))
          }
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </Field>
      <Field label="Notas (opcional)" className="sm:col-span-2">
        <textarea
          value={form.notes}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, notes: e.target.value }))
          }
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          rows={2}
        />
      </Field>

      {formError && (
        <p className="sm:col-span-2 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? "Registrando…" : "Registrar proveedor"}
        </button>
      </div>
    </form>
  );
}
