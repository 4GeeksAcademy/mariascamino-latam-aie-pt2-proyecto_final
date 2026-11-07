export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

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
 * Single place for every call to the Supplier API: builds the URL, sends JSON,
 * and turns non-2xx responses into an Error with a readable message
 * (including FastAPI/Pydantic `detail` arrays).
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; init?: RequestInit } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options.init,
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = payload?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d: { msg?: string }) => d.msg).join(" · ")
      : detail || `La API respondió con el código ${res.status}.`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function getSuppliers(filters: SupplierFilters, init?: RequestInit) {
  const params = new URLSearchParams();
  if (filters.country) params.set("country", filters.country);
  if (filters.category) params.set("category", filters.category);
  return apiRequest<Supplier[]>(`/suppliers?${params.toString()}`, { init });
}
