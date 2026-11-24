"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/api";
import { apiRequest, getSuppliers, type Supplier } from "@/lib/suppliers-api";
import { track } from "@/lib/telemetry";

/** PATCH /suppliers/{id}/status|rate answer with the full supplier. */
type SupplierDetail = Supplier & { compliance_agreement: "BAA" | "DPA" | "both" | null };

export type NewSupplierPayload = {
  name: string;
  country: "USA" | "UK";
  categories: string[];
  monthly_rate: number;
  currency: string;
  contact_email: string | null;
  notes: string | null;
};

/**
 * Owns the supplier list: filters, loading/error state and every mutation.
 * Mutations re-fetch the list so the table always reflects the API.
 *
 * `initialSuppliers` comes from the server render: when present, the first
 * client fetch is skipped so the table is not replaced (no layout shift).
 */
export function useSuppliers(initialSuppliers: Supplier[] | null = null) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers ?? []);
  const [loading, setLoading] = useState(initialSuppliers === null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setSuppliers(await getSuppliers({ country: countryFilter, category: categoryFilter }));
    } catch (err) {
      setLoadError(getErrorMessage(err, "No pudimos cargar los proveedores."));
    } finally {
      setLoading(false);
    }
  }, [countryFilter, categoryFilter]);

  const skipInitialFetch = useRef(initialSuppliers !== null);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    refresh();
  }, [refresh]);

  const createSupplier = async (payload: NewSupplierPayload) => {
    await apiRequest("/suppliers", { method: "POST", body: payload });
    await refresh();
  };

  const updateRate = async (id: number, monthlyRate: number) => {
    const previous = suppliers.find((s) => s.id === id);
    const updated = await apiRequest<SupplierDetail>(`/suppliers/${id}/rate`, {
      method: "PATCH",
      body: { monthly_rate: monthlyRate },
    });
    if (previous && previous.monthly_rate > 0 && previous.monthly_rate !== updated.monthly_rate) {
      // Only the % change: the exact rate is commercial data (plan §8.2).
      track("supplier_rate_changed", {
        supplier_id: updated.id,
        currency: updated.currency,
        change_pct: Math.round(((updated.monthly_rate - previous.monthly_rate) / previous.monthly_rate) * 10_000) / 100,
      });
    }
    await refresh();
  };

  const toggleStatus = async (supplier: Supplier) => {
    const status = supplier.status === "active" ? "suspended" : "active";
    const updated = await apiRequest<SupplierDetail>(`/suppliers/${supplier.id}/status`, {
      method: "PATCH",
      body: { status },
    });
    track("supplier_status_changed", {
      supplier_id: updated.id,
      previous_status: supplier.status,
      new_status: updated.status,
      country: updated.country,
      compliance_agreement: updated.compliance_agreement ?? null,
    });
    await refresh();
  };

  return {
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
  };
}
