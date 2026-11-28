/**
 * Inventory events (Negocio · Inventario + Compliance), built from what the
 * API just confirmed. Every function here ends in track(): the envelope is
 * added by the TelemetryService, these only map HealthCore data to the
 * allowlisted properties of docs/telemetry/event-schemas.json.
 *
 * Mandatory BRIEFING events: inbound_order_created, outbound_order_created,
 * stock_threshold_triggered, direct_stock_edit_rejected, supply_expiry_flagged.
 */
import type { InboundOrderResult, MedicalSupply, OutboundOrderResult } from "./inventory";
import { currentActorRole, track } from "./telemetry";
import {
  clinicInfo,
  daysUntil,
  expiryBucket,
  isCriticalCategory,
  toBriefingCategory,
  type ExpiryBucket,
} from "./telemetry-domain";

type SupplyRef = Pick<MedicalSupply, "id" | "category" | "unit" | "country">;

function productProps(supply: SupplyRef) {
  return {
    product_id: supply.id,
    product_category: toBriefingCategory(supply.category),
  };
}

function clinicProps(clinicId: number) {
  const info = clinicInfo(clinicId);
  return { clinic_id: clinicId, country: info?.country, region: info?.region };
}

// ---------- vendor (the only free text allowed, §8.2) ----------

const EMAIL_OR_PHONE = /[^@\s]+@[^@\s]+\.[a-z]{2,}|\+?\d[\d\s-]{6,}/i;

/** trim + lower-case + max 100; anything that looks like contact data is redacted. */
export function normalizeVendorName(name: string): string {
  const clean = name.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 100);
  return EMAIL_OR_PHONE.test(clean) ? "redacted" : clean;
}

export type DirectorySupplier = { id: number; name: string };

/** Match the typed vendor against the supplier directory (vendor_in_directory, §3.2). */
export function matchSupplier(vendorName: string, directory: DirectorySupplier[]): number | null {
  const wanted = normalizeVendorName(vendorName);
  return directory.find((s) => normalizeVendorName(s.name) === wanted)?.id ?? null;
}

// ---------- IP-4: inbound order ----------

export function trackInboundOrderCreated(
  order: InboundOrderResult,
  supply: SupplyRef,
  directory: DirectorySupplier[]
): void {
  const supplierId = matchSupplier(order.vendor_name, directory);
  track("inbound_order_created", {
    order_id: order.id,
    ...clinicProps(order.clinic_id),
    ...productProps(supply),
    product_subcategory: supply.category,
    quantity: order.quantity,
    unit: supply.unit,
    supplier_id: supplierId,
    vendor_in_directory: supplierId !== null,
    vendor_name: normalizeVendorName(order.vendor_name),
    stock_after: order.stock_after,
  });
}

// ---------- IP-5 / IP-6: outbound order and threshold crossing ----------

export function trackOutboundOrderCreated(order: OutboundOrderResult, supply: SupplyRef): void {
  const product = productProps(supply);
  track("outbound_order_created", {
    order_id: order.id,
    ...clinicProps(order.clinic_id),
    ...product,
    product_subcategory: supply.category,
    quantity: order.quantity,
    unit: supply.unit,
    department: order.department,
    consumption_type: order.consumption_type,
    stock_after: order.stock_after,
  });

  // Debounce by state (§7.2): only the order that CROSSES the minimum fires,
  // later orders below it don't (the alert stays open until stock recovers).
  const min = order.min_stock;
  if (min !== null && order.stock_before >= min && order.stock_after < min) {
    track("stock_threshold_triggered", {
      ...clinicProps(order.clinic_id),
      ...product,
      quantity: order.stock_after,
      min_stock: min,
      deficit: min - order.stock_after,
      unit: supply.unit,
      is_critical: isCriticalCategory(product.product_category),
      triggering_order_id: order.id,
      department: order.department,
    });
  }

  if (order.stock_before > 0 && order.stock_after === 0) {
    track("stock_depleted", {
      ...clinicProps(order.clinic_id),
      ...product,
      is_critical: isCriticalCategory(product.product_category),
      triggering_order_id: order.id,
      department: order.department,
    });
  }
}

export function trackOutboundOrderRejected(params: {
  supply: SupplyRef;
  clinicId: number;
  quantity: number;
  availableStock: number;
  department: string | null;
  reason: "insufficient_stock" | "product_not_found";
}): void {
  const { country } = clinicProps(params.clinicId);
  track("outbound_order_rejected", {
    clinic_id: params.clinicId,
    country,
    ...productProps(params.supply),
    quantity: params.quantity,
    available_stock: params.availableStock,
    department: params.department,
    reason: params.reason,
  });
}

// ---------- IP-7: direct stock edit attempt ----------

export function trackDirectStockEditRejected(params: {
  supply: SupplyRef;
  clinicId: number | null;
  attemptedStock: number | null;
  statusCode: 403 | 422;
}): void {
  track("direct_stock_edit_rejected", {
    clinic_id: params.clinicId,
    country: params.supply.country === "US" || params.supply.country === "UK" ? params.supply.country : null,
    ...productProps(params.supply),
    quantity: params.attemptedStock,
    attempt_channel: "patch_stock",
    http_method: "PATCH",
    route_template: "/inventory/products/{supply_id}/stock",
    rejection_status_code: params.statusCode,
    actor_role: currentActorRole(),
  });
}

// ---------- IP-8: expiry ----------

const EXPIRY_SEEN_KEY = "healthcore_telemetry_expiry_flags";

function seenExpiryKeys(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(EXPIRY_SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function rememberExpiryKeys(keys: Set<string>): void {
  try {
    // Keep the newest 500 keys: enough for the catalogue × 12 clinics × 4 buckets.
    window.localStorage.setItem(EXPIRY_SEEN_KEY, JSON.stringify([...keys].slice(-500)));
  } catch {
    // storage unavailable: worst case the flag is re-sent (the collector dedupes)
  }
}

export type ExpiryFlag = { supply: MedicalSupply; clinicId: number; quantity: number; days: number; bucket: ExpiryBucket };

/** Products with stock in a clinic that reached an expiry window (30/14/7 days or expired). */
export function expiryFlags(supplies: MedicalSupply[], today = new Date()): ExpiryFlag[] {
  const flags: ExpiryFlag[] = [];
  for (const supply of supplies) {
    if (!supply.expiry_date) continue;
    const days = daysUntil(supply.expiry_date, today);
    const bucket = expiryBucket(days);
    if (!bucket) continue;
    for (const [clinic, stock] of Object.entries(supply.stock_by_clinic ?? {})) {
      if (stock > 0) flags.push({ supply, clinicId: Number(clinic), quantity: stock, days, bucket });
    }
  }
  return flags;
}

/**
 * supply_expiry_flagged, once per (product, clinic, bucket, expiry_date) — the
 * idempotency key of the plan (§7.2). The plan's long-term emitter is the
 * daily `expiry_scan` job; until it exists the backoffice flags a window the
 * moment an operator sees the product in the inventory list.
 */
export function trackSupplyExpiryFlags(supplies: MedicalSupply[], today = new Date()): number {
  const seen = seenExpiryKeys();
  let emitted = 0;
  for (const flag of expiryFlags(supplies, today)) {
    const key = `${flag.supply.id}:${flag.clinicId}:${flag.bucket}:${flag.supply.expiry_date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    emitted += 1;
    track("supply_expiry_flagged", {
      ...clinicProps(flag.clinicId),
      ...productProps(flag.supply),
      quantity: flag.quantity,
      unit: flag.supply.unit,
      expiry_date: flag.supply.expiry_date,
      days_to_expiry: flag.days,
      expiry_bucket: flag.bucket,
    });
  }
  if (emitted) rememberExpiryKeys(seen);
  return emitted;
}

// ---------- IP-3: catalogue ----------

/** Field NAMES only (never values), in the schema's `^[a-z_]{1,40}$` form. */
function fieldNames(names: string[]): string[] | undefined {
  const clean = [...new Set(names.filter((n) => /^[a-z_]{1,40}$/.test(n)))].slice(0, 30);
  return clean.length ? clean : undefined;
}

export function trackProductCreated(supply: MedicalSupply): void {
  track("product_created", {
    ...productProps(supply),
    product_subcategory: supply.category,
    unit: supply.unit,
    country: supply.country,
    has_expiry_date: Boolean(supply.expiry_date),
    min_stock: supply.min_stock,
    actor_role: currentActorRole(),
  });
}

export function trackProductCreationRejected(params: {
  status: number;
  category: string;
  country: string;
  fieldNames: string[];
}): void {
  track("product_creation_rejected", {
    reason: params.status === 400 ? "duplicate_sku" : "validation_error",
    product_category: toBriefingCategory(params.category),
    country: params.country === "US" || params.country === "UK" ? params.country : null,
    field_names: fieldNames(params.fieldNames),
  });
}
