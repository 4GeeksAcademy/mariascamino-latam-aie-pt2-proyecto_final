/**
 * HealthCore medical supply inventory — API integration layer.
 *
 * Every call to the /inventory endpoints goes through this module; no
 * component calls fetch directly. Requests carry the session token as
 * `Authorization: Bearer <token>` and API errors are turned into
 * InventoryApiError with a message that is safe to show in the UI.
 */
import { buildApiError } from "./api";
import { getToken } from "./auth-storage";
import { handleSessionExpired } from "./session-telemetry";
import { newRequestId, noteApiRequest } from "./telemetry";

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
  expiry_date: string | null;
  min_stock: number | null;
  /** Stock per clinic (JSON keys are strings): {"1": 380, "4": 300}. */
  stock_by_clinic: Record<string, number>;
};

export type NewMedicalSupply = {
  name: string;
  sku: string;
  category: string;
  unit: string;
  country: string;
  expiry_date: string | null;
  min_stock: number | null;
};

/** Confirmation of an order: the clinic's stock around it + the supply's minimum. */
type OrderStock = { stock_before: number; stock_after: number; min_stock: number | null };

export type InboundOrderResult = {
  id: number;
  supply_id: number;
  quantity: number;
  vendor_name: string;
  clinic_id: number;
  created_at: string;
} & OrderStock;

export type OutboundOrderResult = {
  id: number;
  supply_id: number;
  quantity: number;
  consumption_type: "clinical_use" | "expiry_waste";
  clinic_id: number;
  department: string | null;
  created_at: string;
} & OrderStock;

export type SupplyOrder = {
  id: number;
  order_type: "inbound" | "outbound";
  quantity: number;
  clinic_id: number;
  created_at: string;
  created_by: string;
  vendor_name: string | null;
  consumption_type: string | null;
  supply_id: number;
  supply_name: string;
  supply_sku: string;
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
  department: string | null;
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
  // Correlation id (telemetry-plan §5.3): the API logs it and echoes it back;
  // events tracked on this response carry the same requestId.
  const requestId = newRequestId();
  headers.set("X-Request-ID", requestId);

  let res: Response;
  try {
    res = await fetch(`${INVENTORY_API_URL}${path}`, { ...init, headers });
  } catch {
    throw new InventoryApiError("We couldn't reach the inventory API. Check that the server is running and try again.");
  }
  noteApiRequest(requestId);

  if (res.status === 401) {
    // Expired or invalid session: same behaviour as the rest of the backoffice
    // (session_expired is recorded before the redirect).
    handleSessionExpired(token);
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

export function createSupply(payload: NewMedicalSupply): Promise<MedicalSupply> {
  return request<MedicalSupply>("/inventory/products", { method: "POST", body: JSON.stringify(payload) });
}

/**
 * Stock cannot be edited: it is derived from orders. The API answers this
 * call with 403 on purpose; the products page uses it so an operator who
 * tries to "fix" a number learns the right path (and the attempt is recorded
 * as direct_stock_edit_rejected).
 */
export function requestStockAdjustment(supplyId: number, clinicId: number, currentStock: number) {
  return request(`/inventory/products/${supplyId}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ clinic_id: clinicId, current_stock: currentStock }),
  });
}

export function createDelivery(payload: NewSupplyDelivery): Promise<InboundOrderResult> {
  return request<InboundOrderResult>("/inventory/orders/inbound", { method: "POST", body: JSON.stringify(payload) });
}

export function createConsumption(payload: NewSupplyConsumption): Promise<OutboundOrderResult> {
  return request<OutboundOrderResult>("/inventory/orders/outbound", { method: "POST", body: JSON.stringify(payload) });
}

/** Stock of a supply in one clinic (0 if the clinic never received it). */
export function clinicStock(supply: Pick<MedicalSupply, "stock_by_clinic">, clinicId: number): number {
  return supply.stock_by_clinic?.[String(clinicId)] ?? 0;
}

export function listOrders(): Promise<SupplyOrder[]> {
  return request<SupplyOrder[]>("/inventory/orders");
}

/** Reads ?supply_id=N from the current URL (used by the links on the products page). */
export function supplyIdFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("supply_id") ?? "";
}

// ---------- Order history: derived data (pure, unit-tested) ----------

export type OrderTypeFilter = "all" | "inbound" | "outbound";

export type OrderTotals = {
  inboundOrders: number;
  outboundOrders: number;
  unitsDelivered: number;
  unitsConsumed: number;
  unitsWasted: number;
  /** Share of consumed units that were discarded as expired (0–100, 1 decimal). */
  wastePct: number;
  /** Supply with the most units consumed, if any. */
  topConsumed: { name: string; sku: string; units: number } | null;
};

/**
 * One pass over the whole order history: totals by type, expiry waste and the
 * most-consumed supply. O(n) with a Map; with ~24 000 orders this is the most
 * expensive computation on the page, which is why the page memoizes it.
 */
export function summarizeOrders(orders: SupplyOrder[]): OrderTotals {
  const totals: OrderTotals = {
    inboundOrders: 0,
    outboundOrders: 0,
    unitsDelivered: 0,
    unitsConsumed: 0,
    unitsWasted: 0,
    wastePct: 0,
    topConsumed: null,
  };
  const consumedBySupply = new Map<number, { name: string; sku: string; units: number }>();

  for (const o of orders) {
    if (o.order_type === "inbound") {
      totals.inboundOrders += 1;
      totals.unitsDelivered += o.quantity;
      continue;
    }
    totals.outboundOrders += 1;
    totals.unitsConsumed += o.quantity;
    if (o.consumption_type === "expiry_waste") totals.unitsWasted += o.quantity;
    const entry = consumedBySupply.get(o.supply_id) ?? { name: o.supply_name, sku: o.supply_sku, units: 0 };
    entry.units += o.quantity;
    consumedBySupply.set(o.supply_id, entry);
  }

  for (const entry of consumedBySupply.values()) {
    if (!totals.topConsumed || entry.units > totals.topConsumed.units) totals.topConsumed = entry;
  }
  totals.wastePct =
    totals.unitsConsumed === 0 ? 0 : Math.round((totals.unitsWasted / totals.unitsConsumed) * 1000) / 10;
  return totals;
}

export function filterOrders(orders: SupplyOrder[], type: OrderTypeFilter): SupplyOrder[] {
  return type === "all" ? orders : orders.filter((o) => o.order_type === type);
}
