/**
 * HealthCore medical supply inventory — API integration layer.
 *
 * Every call to the /inventory endpoints goes through this module; no
 * component calls fetch directly. Requests carry the session token as
 * `Authorization: Bearer <token>` and API errors are turned into
 * InventoryApiError with a message that is safe to show in the UI.
 */
import { buildApiError } from "./api";
import { clearToken, getToken } from "./auth-storage";

export const INVENTORY_API_URL =
  process.env.NEXT_PUBLIC_INVENTORY_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ---------- Domain types (names from the HealthCore BRIEFING) ----------

export type MedicalSupply = {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit: string;
  country: string;
  current_stock: number;
};

export type SupplySummary = Pick<MedicalSupply, "id" | "name" | "sku" | "unit" | "country">;

export type SupplyOrder = {
  id: number;
  order_type: "inbound" | "outbound";
  quantity: number;
  clinic_id: number;
  created_at: string;
  user_uuid: string;
  vendor_name: string | null;
  consumption_type: string | null;
  supply: SupplySummary;
};

export type NewSupplyDelivery = {
  supply_id: number;
  quantity: number;
  vendor_name: string;
  clinic_id: number;
};

export type NewSupplyConsumption = {
  supply_id: number;
  quantity: number;
  consumption_type: "clinical_use" | "expiry_waste";
  clinic_id: number;
};

// ---------- Labels and business constants ----------

export const CATEGORY_LABELS: Record<string, string> = {
  ppe: "PPE",
  wound_care: "Wound care",
  diagnostics: "Diagnostics",
  medications: "Medications",
  consumables: "Consumables",
};

export const CONSUMPTION_TYPES = [
  { value: "clinical_use", label: "Clinical use (patient care)" },
  { value: "expiry_waste", label: "Expiry waste (expired and discarded)" },
] as const;

/** HealthCore clinics: 1–9 are in the US, 10–12 in the UK. */
export const CLINICS = Array.from({ length: 12 }, (_, i) => {
  const id = i + 1;
  return { id, label: `Clinic ${id} (${id <= 9 ? "US" : "UK"})` };
});

/**
 * Stock-level thresholds for the colour indicators:
 *   - 0           -> "out"     (red)    nothing left, cannot be consumed
 *   - 1 to 99     -> "low"     (amber)  reorder soon
 *   - 100 or more -> "healthy" (green)
 */
export const LOW_STOCK_THRESHOLD = 100;

export type StockLevel = "out" | "low" | "healthy";

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "out";
  if (stock < LOW_STOCK_THRESHOLD) return "low";
  return "healthy";
}

// ---------- HTTP ----------

export class InventoryApiError extends Error {
  status?: number;
  fields: Record<string, string>;

  constructor(message: string, status?: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = "InventoryApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${INVENTORY_API_URL}${path}`, { ...init, headers });
  } catch {
    throw new InventoryApiError("We couldn't reach the inventory API. Check that the server is running and try again.");
  }

  if (res.status === 401) {
    // Expired or invalid session: same behaviour as the rest of the backoffice.
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new InventoryApiError("Your session has expired. Please log in again.", 401);
  }

  if (!res.ok) {
    // 400 (e.g. insufficient stock) and 422 (validation) carry a readable
    // message from the API in `detail`; buildApiError extracts it.
    const apiError = await buildApiError(res);
    const message =
      res.status >= 500 ? "Something went wrong on the server. Please try again in a moment." : apiError.message;
    throw new InventoryApiError(message, res.status, apiError.fields ?? {});
  }

  return (await res.json()) as T;
}

// ---------- Endpoints ----------

export function listSupplies(): Promise<MedicalSupply[]> {
  return request<MedicalSupply[]>("/inventory/products");
}

export function getSupply(id: number): Promise<MedicalSupply> {
  return request<MedicalSupply>(`/inventory/products/${id}`);
}

export function createDelivery(payload: NewSupplyDelivery) {
  return request("/inventory/orders/inbound", { method: "POST", body: JSON.stringify(payload) });
}

export function createConsumption(payload: NewSupplyConsumption) {
  return request("/inventory/orders/outbound", { method: "POST", body: JSON.stringify(payload) });
}

export function listOrders(): Promise<SupplyOrder[]> {
  return request<SupplyOrder[]>("/inventory/orders");
}

/** Reads ?supply_id=N from the current URL (used by the links on the products page). */
export function supplyIdFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("supply_id") ?? "";
}
