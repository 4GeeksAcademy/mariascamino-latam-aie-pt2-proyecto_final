"use client";

import { useEffect, useState, FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const CATEGORIES = [
  "medical_supplies",
  "laboratory_services",
  "pharmaceutical",
  "clinical_software",
  "it_infrastructure",
  "hr_and_payroll_software",
  "cleaning_and_facilities",
  "patient_communication",
  "billing_and_coding_software",
  "training_platforms",
] as const;

const COUNTRY_CURRENCY: Record<string, string> = { USA: "USD", UK: "GBP" };

type Supplier = {
  id: number;
  name: string;
  country: "USA" | "UK";
  categories: string[];
  monthly_rate: number;
  currency: "USD" | "GBP";
  status: "active" | "suspended";
  contact_email: string | null;
  notes: string | null;
  updated_at: string;
};

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

const categoryLabel = (cat: string) =>
  cat
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [countryFilter, setCountryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [form, setForm] = useState<NewSupplierForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});
  const [rowError, setRowError] = useState<Record<number, string>>({});

  const fetchSuppliers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (countryFilter) params.set("country", countryFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`${API_URL}/suppliers?${params.toString()}`);
      if (!res.ok) throw new Error(`Error ${res.status} al cargar proveedores`);
      const data: Supplier[] = await res.json();
      setSuppliers(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "No se pudo conectar con la API"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryFilter, categoryFilter]);

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
      const res = await fetch(`${API_URL}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          country: form.country,
          categories: form.categories,
          monthly_rate: rateNumber,
          currency: COUNTRY_CURRENCY[form.country],
          contact_email: form.contact_email || null,
          notes: form.notes || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = body?.detail;
        const message = Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg).join(" · ")
          : detail || `La API rechazó el proveedor (código ${res.status}).`;
        throw new Error(message);
      }

      setForm(emptyForm);
      await fetchSuppliers();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "No se pudo registrar el proveedor."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRateUpdate = async (supplierId: number) => {
    const draft = rateDrafts[supplierId];
    const rateNumber = Number(draft);
    setRowError((prev) => ({ ...prev, [supplierId]: "" }));

    if (!draft || Number.isNaN(rateNumber) || rateNumber <= 0) {
      setRowError((prev) => ({
        ...prev,
        [supplierId]: "La tarifa debe ser mayor a 0.",
      }));
      return;
    }

    try {
      const res = await fetch(`${API_URL}/suppliers/${supplierId}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_rate: rateNumber }),
      });
      if (!res.ok) throw new Error(`Error ${res.status} al actualizar la tarifa`);
      await fetchSuppliers();
      setRateDrafts((prev) => ({ ...prev, [supplierId]: "" }));
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [supplierId]: err instanceof Error ? err.message : "No se pudo actualizar.",
      }));
    }
  };

  const handleStatusToggle = async (supplier: Supplier) => {
    const nextStatus = supplier.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`${API_URL}/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(`Error ${res.status} al cambiar el estado`);
      await fetchSuppliers();
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [supplier.id]: err instanceof Error ? err.message : "No se pudo cambiar el estado.",
      }));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Directorio de Proveedores</h1>
        <p className="text-slate-600">
          Proveedores clínicos y tecnológicos de HealthCore, con visibilidad de tarifa y estado.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-slate-500">País</label>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Categoría</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabel(cat)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadError && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          {loadError}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">País</th>
              <th className="px-4 py-3">Categorías</th>
              <th className="px-4 py-3">Tarifa mensual</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Actualizar tarifa</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Cargando proveedores…
                </td>
              </tr>
            )}
            {!loading && suppliers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No hay proveedores con estos filtros.
                </td>
              </tr>
            )}
            {suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{supplier.name}</td>
                <td className="px-4 py-3">{supplier.country}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {supplier.categories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {categoryLabel(cat)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {supplier.monthly_rate.toLocaleString()} {supplier.currency}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      supplier.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {supplier.status === "active" ? "Activo" : "Suspendido"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Nueva tarifa"
                      value={rateDrafts[supplier.id] ?? ""}
                      onChange={(e) =>
                        setRateDrafts((prev) => ({
                          ...prev,
                          [supplier.id]: e.target.value,
                        }))
                      }
                      className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => handleRateUpdate(supplier.id)}
                      className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                    >
                      Guardar
                    </button>
                  </div>
                  {rowError[supplier.id] && (
                    <p className="mt-1 text-xs text-red-600">{rowError[supplier.id]}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleStatusToggle(supplier)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {supplier.status === "active" ? "Suspender" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Registrar nuevo proveedor</h2>
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-500">Nombre</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">País</label>
            <select
              value={form.country}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, country: e.target.value as "USA" | "UK" }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="USA">USA (moneda: USD)</option>
              <option value="UK">UK (moneda: GBP)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500">Categorías</label>
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
                    className="hidden"
                    checked={form.categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                  {categoryLabel(cat)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">
              Tarifa mensual ({COUNTRY_CURRENCY[form.country]})
            </label>
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
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">
              Email de contacto (opcional)
            </label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contact_email: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500">
              Notas (opcional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              rows={2}
            />
          </div>

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
      </div>
    </div>
  );
}