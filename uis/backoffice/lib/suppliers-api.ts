import { requestJson } from "@/lib/api";

export type Supplier = {
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

export type SupplierFilters = { country: string; category: string };

/**
 * Single place for every Supplier API call. Delegates to the authenticated
 * requestJson() (Bearer token, 401 -> /login, friendly ApiError messages).
 */
export function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  return requestJson<T>(path, {
    method: options.method ?? "GET",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

export function getSuppliers(filters: SupplierFilters) {
  const params = new URLSearchParams();
  if (filters.country) params.set("country", filters.country);
  if (filters.category) params.set("category", filters.category);
  return apiRequest<Supplier[]>(`/suppliers?${params.toString()}`);
}
