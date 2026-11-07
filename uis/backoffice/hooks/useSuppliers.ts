"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, getSuppliers, type Supplier } from "@/lib/suppliers-api";

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
      setLoadError(err instanceof Error ? err.message : "No se pudo conectar con la API");
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
    await apiRequest(`/suppliers/${id}/rate`, {
      method: "PATCH",
      body: { monthly_rate: monthlyRate },
    });
    await refresh();
  };

  const toggleStatus = async (supplier: Supplier) => {
    const status = supplier.status === "active" ? "suspended" : "active";
    await apiRequest(`/suppliers/${supplier.id}/status`, { method: "PATCH", body: { status } });
    await refresh();
  };

  return {
    suppliers,
    loading,
    loadError,
    countryFilter,
    setCountryFilter,
    categoryFilter,
    setCategoryFilter,
    createSupplier,
    updateRate,
    toggleStatus,
  };
}
