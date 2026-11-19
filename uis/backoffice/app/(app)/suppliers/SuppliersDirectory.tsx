"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSuppliers } from "@/hooks/useSuppliers";
import type { Supplier } from "@/lib/suppliers-api";
import { Field } from "@/components/Field";
import ErrorState from "@/components/LazyErrorState";
import { CATEGORIES, categoryLabel } from "./supplier-options";

// Lazy loading #1 — the create form is only needed when someone registers a
// supplier, so its code is split into its own chunk and fetched on demand.
const loadNewSupplierForm = () => import("./NewSupplierForm");
const NewSupplierForm = dynamic(loadNewSupplierForm, {
  loading: () => <p className="mt-4 text-sm text-slate-400">Cargando formulario…</p>,
});

export default function SuppliersDirectory({
  initialSuppliers,
}: {
  initialSuppliers: Supplier[] | null;
}) {
  const {
    suppliers,
    loading,
    loadError,
    refresh,
    countryFilter,
    setCountryFilter,
    categoryFilter,
    setCategoryFilter,
    createSupplier,
    updateRate,
    toggleStatus,
  } = useSuppliers(initialSuppliers);

  // Lives here (not in the form) so the open/closed state survives re-renders.
  const [showForm, setShowForm] = useState(false);

  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});
  const [rowError, setRowError] = useState<Record<number, string>>({});

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
      await updateRate(supplierId, rateNumber);
      setRateDrafts((prev) => ({ ...prev, [supplierId]: "" }));
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [supplierId]:
          err instanceof Error ? err.message : "No pudimos actualizar la tarifa. Inténtalo de nuevo.",
      }));
    }
  };

  const handleStatusToggle = async (supplier: Supplier) => {
    try {
      await toggleStatus(supplier);
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [supplier.id]:
          err instanceof Error ? err.message : "No pudimos cambiar el estado. Inténtalo de nuevo.",
      }));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Directorio de Proveedores</h1>
        <p className="text-slate-600">
          Proveedores clínicos y tecnológicos de HealthCore, con visibilidad de
          tarifa y estado.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="País">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
          </select>
        </Field>
        <Field label="Categoría">
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
        </Field>
      </div>

      {loadError && (
        <ErrorState
          title="No pudimos cargar los proveedores"
          message={loadError}
          onRetry={refresh}
        />
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
              <th className="px-4 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  Cargando proveedores…
                </td>
              </tr>
            )}
            {!loading && suppliers.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  No hay proveedores con estos filtros.
                </td>
              </tr>
            )}
            {suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {supplier.name}
                </td>
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
                    <p className="mt-1 text-xs text-red-600">
                      {rowError[supplier.id]}
                    </p>
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
        <button
          type="button"
          aria-expanded={showForm}
          onClick={() => setShowForm((open) => !open)}
          // Warm-up: start downloading the chunk when the pointer gets close,
          // so by the time the click lands the form is (usually) ready.
          onMouseEnter={() => void loadNewSupplierForm()}
          onFocus={() => void loadNewSupplierForm()}
          className="text-lg font-semibold text-slate-900 hover:underline"
        >
          {showForm ? "▾" : "▸"} Registrar nuevo proveedor
        </button>
        {showForm && <NewSupplierForm onCreate={createSupplier} />}
      </div>
    </div>
  );
}
