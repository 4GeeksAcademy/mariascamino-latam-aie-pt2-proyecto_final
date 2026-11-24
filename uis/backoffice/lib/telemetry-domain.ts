/**
 * HealthCore domain vocabulary for telemetry properties (pure functions).
 *
 * Everything here comes from docs/telemetry/telemetry-plan.md: the clinic
 * registry (§4.4), the model → BRIEFING category mapping (§4.3), the closed
 * `section` enum (one per page of the backoffice) and the reductions that keep
 * PII out of events (route templates, user-agent family, error fingerprints).
 */

// ---------- clinics (§4.4) ----------

export type ClinicInfo = { country: "US" | "UK"; region: "TX" | "FL" | "GA" | "LND" | "MAN" };

/**
 * clinic_id → country/region. 1–6 come from the public site's CONTEXT; 7–9 and
 * 12 are provisional (risk R4 of the plan, pending confirmation by
 * Operations). Phase 3: the collector re-derives these on the server, which
 * the plan treats as the source of truth (§5.3).
 */
export const CLINIC_REGISTRY: Record<number, ClinicInfo> = {
  1: { country: "US", region: "TX" }, // Austin Central
  2: { country: "US", region: "TX" }, // Austin North
  3: { country: "US", region: "TX" }, // San Antonio
  4: { country: "US", region: "FL" }, // Miami
  5: { country: "US", region: "FL" }, // Orlando
  6: { country: "US", region: "GA" }, // Atlanta
  7: { country: "US", region: "TX" }, // provisional (R4)
  8: { country: "US", region: "FL" }, // provisional (R4)
  9: { country: "US", region: "GA" }, // provisional (R4)
  10: { country: "UK", region: "LND" }, // London
  11: { country: "UK", region: "MAN" }, // Manchester
  12: { country: "UK", region: "LND" }, // provisional (R4)
};

export function clinicInfo(clinicId: number): ClinicInfo | null {
  return CLINIC_REGISTRY[clinicId] ?? null;
}

// ---------- categories (§4.3) ----------

export type BriefingCategory = "medication" | "ppe" | "consumable" | "equipment";

const CATEGORY_MAP: Record<string, BriefingCategory> = {
  medications: "medication",
  ppe: "ppe",
  consumables: "consumable",
  wound_care: "consumable",
  diagnostics: "equipment", // provisional (risk R3): product_subcategory keeps the original
};

/** The model has 5 categories, the BRIEFING 4: telemetry always emits the BRIEFING one. */
export function toBriefingCategory(modelCategory: string): BriefingCategory | null {
  return CATEGORY_MAP[modelCategory] ?? null;
}

/** "Critical supply" per the BRIEFING examples: medication and PPE. */
export function isCriticalCategory(category: BriefingCategory | null): boolean {
  return category === "medication" || category === "ppe";
}

// ---------- departments (P1) ----------

export const DEPARTMENTS = [
  { value: "primary_care", label: "Primary care" },
  { value: "specialty_care", label: "Specialty care" },
  { value: "chronic_care", label: "Chronic care" },
  { value: "preventive_care", label: "Preventive care" },
  { value: "womens_health", label: "Women's health" },
  { value: "paediatric_care", label: "Paediatric care" },
  { value: "mental_health", label: "Mental health" },
  { value: "clinic_operations", label: "Clinic operations (non-clinical)" },
] as const;

// ---------- sections and route templates ----------

export type Section =
  | "home"
  | "suppliers"
  | "incidents"
  | "incidents_new"
  | "incidents_summary"
  | "inventory_products"
  | "inventory_orders"
  | "inventory_inbound"
  | "inventory_outbound"
  | "account_profile"
  | "account_password"
  | "login"
  | "register"
  | "forgot_password"
  | "reset_password"
  | "not_found";

const ROUTES: { path: string; section: Section }[] = [
  { path: "/", section: "home" },
  { path: "/suppliers", section: "suppliers" },
  { path: "/incidents", section: "incidents" },
  { path: "/incidents/new", section: "incidents_new" },
  { path: "/incidents/summary", section: "incidents_summary" },
  { path: "/inventory", section: "inventory_products" }, // redirects to /inventory/products
  { path: "/inventory/products", section: "inventory_products" },
  { path: "/inventory/orders", section: "inventory_orders" },
  { path: "/inventory/orders/inbound", section: "inventory_inbound" },
  { path: "/inventory/orders/outbound", section: "inventory_outbound" },
  { path: "/account/profile", section: "account_profile" },
  { path: "/account/change-password", section: "account_password" },
  { path: "/login", section: "login" },
  { path: "/register", section: "register" },
  { path: "/forgot-password", section: "forgot_password" },
  { path: "/reset-password", section: "reset_password" },
];

/**
 * Section + route template of a pathname. Only the pathname is ever used —
 * never the query string (the reset link carries a secret token) — and an
 * unknown path is reported as the template "/{unknown}", not as the raw URL.
 */
export function routeInfo(pathname: string | null | undefined): { section: Section; route_template: string } {
  const path = (pathname ?? "/").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const match = ROUTES.find((r) => r.path === path);
  return match ? { section: match.section, route_template: match.path } : { section: "not_found", route_template: "/{unknown}" };
}

export function currentRouteInfo(): { section: Section; route_template: string } {
  return routeInfo(typeof window !== "undefined" ? window.location?.pathname : "/");
}

// ---------- device / browser (reduced, never the full user-agent) ----------

export type DeviceType = "desktop" | "tablet" | "mobile";

export function deviceType(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): DeviceType {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(userAgent)) return "mobile";
  return "desktop";
}

/** "Chrome 131" — family + major version only. */
export function userAgentFamily(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): string {
  const patterns: [string, RegExp][] = [
    ["Edge", /Edg\/(\d+)/],
    ["Opera", /OPR\/(\d+)/],
    ["Firefox", /Firefox\/(\d+)/],
    ["Chrome", /Chrome\/(\d+)/],
    ["Safari", /Version\/(\d+).*Safari/],
  ];
  for (const [name, re] of patterns) {
    const m = userAgent.match(re);
    if (m) return `${name} ${m[1]}`;
  }
  return "Other";
}

// ---------- errors ----------

function fnv1a(text: string, seed: number): string {
  let h = seed;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Stable, non-reversible 16-hex hash (two FNV-1a 32-bit passes with different seeds). */
export function hash(text: string): string {
  return fnv1a(text, 0x811c9dc5) + fnv1a(text, 0x01000193);
}

/**
 * Fingerprint = hash(error name + "file:function" of the top 5 stack frames).
 * Line/column numbers, query strings and the error MESSAGE are dropped: the
 * message can contain what the user typed (plan §6.36).
 */
export function errorFingerprint(error: { name?: string; stack?: string } | null | undefined): string {
  const name = error?.name || "Error";
  const frames = (error?.stack ?? "")
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((line) => {
      const fn = line.match(/^at\s+([^\s(]+)\s+\(/)?.[1] ?? line.match(/^([^@]*)@/)?.[1] ?? "anonymous";
      const file = line.match(/([^/\\\s()@]+\.(?:m?js|tsx?))/)?.[1] ?? "unknown";
      return `${file}:${fn || "anonymous"}`;
    });
  return hash([name, ...frames].join("|"));
}

/** Only a letters-only error name (`TypeError`, `ChunkLoadError`) ever leaves the browser. */
export function safeErrorName(error: { name?: string } | null | undefined): string {
  const name = error?.name ?? "Error";
  return /^[A-Za-z]{1,60}$/.test(name) ? name : "Error";
}

/**
 * Short SHA of the deployed commit (next.config.ts injects it at build time).
 * "0000000" = unknown release (local build without git).
 */
export function appRelease(): string {
  const sha = process.env.NEXT_PUBLIC_APP_VERSION;
  return sha && /^[a-f0-9]{7,40}$/.test(sha) ? sha : "0000000";
}

// ---------- dates ----------

/** Whole days from today (local calendar) to an ISO date; negative if past. */
export function daysUntil(isoDate: string, today = new Date()): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const base = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - base) / 86_400_000);
}

export type ExpiryBucket = "d30" | "d14" | "d7" | "expired";

/** Expiry window reached (plan §6.4): 30, 14 or 7 days, or already expired. */
export function expiryBucket(days: number): ExpiryBucket | null {
  if (days < 0) return "expired";
  if (days <= 7) return "d7";
  if (days <= 14) return "d14";
  if (days <= 30) return "d30";
  return null;
}
