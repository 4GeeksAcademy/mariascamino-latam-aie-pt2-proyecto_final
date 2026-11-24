/**
 * Mandatory BRIEFING events + inventory opportunities: every event built by
 * lib/inventory-telemetry.ts must validate against the approved JSON Schema
 * (docs/telemetry/event-schemas.json), envelope included.
 */
import type { InboundOrderResult, MedicalSupply, OutboundOrderResult } from "../lib/inventory";
import {
  expiryFlags,
  matchSupplier,
  normalizeVendorName,
  trackDirectStockEditRejected,
  trackInboundOrderCreated,
  trackOutboundOrderCreated,
  trackOutboundOrderRejected,
  trackProductCreated,
  trackProductCreationRejected,
  trackSupplyExpiryFlags,
} from "../lib/inventory-telemetry";
import { flushTelemetry, setTelemetryIdentity, type TelemetryEvent } from "../lib/telemetry";
import { installFakeBrowser, removeFakeBrowser, schemaErrors } from "./support/fakeBrowser";

const GLOVES: MedicalSupply = {
  id: 1,
  name: "Nitrile gloves (box of 100)",
  sku: "HCR-PPE-001",
  category: "ppe",
  unit: "box",
  country: "US",
  current_stock: 680,
  expiry_date: null,
  min_stock: 350,
  stock_by_clinic: { "1": 380, "4": 300 },
};
const SALINE: MedicalSupply = {
  ...GLOVES,
  id: 6,
  name: "0.9% Saline solution 500ml",
  sku: "HCR-MED-001",
  category: "medications",
  unit: "vial",
  current_stock: 70,
  min_stock: 50,
  expiry_date: "2026-12-13",
  stock_by_clinic: { "3": 70, "5": 0 },
};

function outbound(over: Partial<OutboundOrderResult> = {}): OutboundOrderResult {
  return {
    id: 902, supply_id: 1, quantity: 40, consumption_type: "clinical_use", clinic_id: 1,
    department: "primary_care", created_at: "2026-11-23T10:00:00Z",
    stock_before: 380, stock_after: 340, min_stock: 350, ...over,
  };
}

let browser: ReturnType<typeof installFakeBrowser>;

beforeEach(() => {
  browser = installFakeBrowser();
  setTelemetryIdentity({ userId: "3b1f8a52-7c4e-4f0e-9a51-2d6b8f0c1e77", role: "manager", sessionId: "1f7c9a20-4b6e-4d1f-8e0a-5c3b2a1d9e47" });
});
afterEach(() => removeFakeBrowser());

async function sent(): Promise<TelemetryEvent[]> {
  await flushTelemetry();
  const events = browser.sent();
  for (const e of events) expect({ type: e.event_type, errors: schemaErrors(e) }).toEqual({ type: e.event_type, errors: [] });
  return events;
}

describe("inbound_order_created (mandatory)", () => {
  const order: InboundOrderResult = {
    id: 77, supply_id: 1, quantity: 200, vendor_name: "  MedLine   Industries ", clinic_id: 4,
    created_at: "2026-11-23T10:00:00Z", stock_before: 300, stock_after: 500, min_stock: 350,
  };

  test("maps the confirmed order to the BRIEFING properties, with region and directory match", async () => {
    trackInboundOrderCreated(order, GLOVES, [{ id: 9, name: "MedLine Industries" }]);
    const [e] = await sent();
    expect(e.event_type).toBe("inbound_order_created");
    expect(e.properties).toEqual({
      order_id: 77, clinic_id: 4, country: "US", region: "FL", product_id: 1,
      product_category: "ppe", product_subcategory: "ppe", quantity: 200, unit: "box",
      supplier_id: 9, vendor_in_directory: true, vendor_name: "medline industries", stock_after: 500,
    });
  });

  test("a vendor outside the directory is flagged (compliance: no BAA/DPA)", async () => {
    trackInboundOrderCreated(order, GLOVES, []);
    const [e] = await sent();
    expect(e.properties).toMatchObject({ supplier_id: null, vendor_in_directory: false });
  });

  test("vendor names that look like contact data are redacted", () => {
    expect(normalizeVendorName("orders@medline.com")).toBe("redacted");
    expect(normalizeVendorName("+44 7700 900123")).toBe("redacted");
    expect(matchSupplier("CARDINAL health uk", [{ id: 3, name: "Cardinal Health UK" }])).toBe(3);
  });
});

describe("outbound_order_created (mandatory) and threshold crossing", () => {
  test("crossing min_stock emits outbound_order_created + stock_threshold_triggered", async () => {
    trackOutboundOrderCreated(outbound(), GLOVES);
    const events = await sent();
    expect(events.map((e) => e.event_type)).toEqual(["outbound_order_created", "stock_threshold_triggered"]);
    expect(events[0].properties).toMatchObject({ department: "primary_care", consumption_type: "clinical_use", stock_after: 340, region: "TX" });
    expect(events[1].properties).toEqual({
      clinic_id: 1, country: "US", region: "TX", product_id: 1, product_category: "ppe",
      quantity: 340, min_stock: 350, deficit: 10, unit: "box", is_critical: true,
      triggering_order_id: 902, department: "primary_care",
    });
  });

  test("an order that was already below the minimum does not re-trigger (debounce by state)", async () => {
    trackOutboundOrderCreated(outbound({ stock_before: 340, stock_after: 300 }), GLOVES);
    expect((await sent()).map((e) => e.event_type)).toEqual(["outbound_order_created"]);
  });

  test("no min_stock configured → no threshold event", async () => {
    trackOutboundOrderCreated(outbound({ min_stock: null }), GLOVES);
    expect((await sent()).map((e) => e.event_type)).toEqual(["outbound_order_created"]);
  });

  test("reaching exactly 0 also emits stock_depleted", async () => {
    trackOutboundOrderCreated(outbound({ quantity: 380, stock_after: 0 }), GLOVES);
    expect((await sent()).map((e) => e.event_type)).toEqual([
      "outbound_order_created",
      "stock_threshold_triggered",
      "stock_depleted",
    ]);
  });

  test("expiry write-off carries department null", async () => {
    trackOutboundOrderCreated(outbound({ consumption_type: "expiry_waste", department: null, stock_after: 360 }), GLOVES);
    const [e] = await sent();
    expect(e.properties).toMatchObject({ consumption_type: "expiry_waste", department: null });
  });

  test("outbound_order_rejected records the clinic's available stock", async () => {
    trackOutboundOrderRejected({ supply: GLOVES, clinicId: 10, quantity: 5, availableStock: 0, department: "primary_care", reason: "insufficient_stock" });
    const [e] = await sent();
    expect(e.properties).toEqual({
      clinic_id: 10, country: "UK", product_id: 1, product_category: "ppe", quantity: 5,
      available_stock: 0, department: "primary_care", reason: "insufficient_stock",
    });
  });
});

describe("direct_stock_edit_rejected (mandatory)", () => {
  test("records the attempt with the route TEMPLATE and the actor role, never the URL", async () => {
    trackDirectStockEditRejected({ supply: GLOVES, clinicId: 1, attemptedStock: 999, statusCode: 403 });
    const [e] = await sent();
    expect(e.properties).toEqual({
      clinic_id: 1, country: "US", product_id: 1, product_category: "ppe", quantity: 999,
      attempt_channel: "patch_stock", http_method: "PATCH",
      route_template: "/inventory/products/{supply_id}/stock", rejection_status_code: 403, actor_role: "manager",
    });
  });

  test("clinic and value can be unknown (nullable) but the attempt is still recorded", async () => {
    trackDirectStockEditRejected({ supply: GLOVES, clinicId: null, attemptedStock: null, statusCode: 403 });
    const [e] = await sent();
    expect(e.properties).toMatchObject({ clinic_id: null, quantity: null });
  });
});

describe("supply_expiry_flagged (mandatory)", () => {
  const today = new Date(2026, 10, 23); // 23 Nov 2026 → saline expires in 20 days

  test("only clinics with stock inside a window are flagged", () => {
    const flags = expiryFlags([GLOVES, SALINE], today);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ clinicId: 3, quantity: 70, days: 20, bucket: "d30" });
  });

  test("emits once per (product, clinic, bucket, expiry_date)", async () => {
    expect(trackSupplyExpiryFlags([SALINE], today)).toBe(1);
    expect(trackSupplyExpiryFlags([SALINE], today)).toBe(0); // same window, page reloaded
    expect(trackSupplyExpiryFlags([SALINE], new Date(2026, 11, 1))).toBe(1); // now d14
    const events = await sent();
    expect(events.map((e) => e.properties.expiry_bucket)).toEqual(["d30", "d14"]);
    expect(events[0].properties).toEqual({
      clinic_id: 3, country: "US", region: "TX", product_id: 6, product_category: "medication",
      quantity: 70, unit: "vial", expiry_date: "2026-12-13", days_to_expiry: 20, expiry_bucket: "d30",
    });
  });

  test("expired stock is flagged as expired with negative days", () => {
    const [flag] = expiryFlags([SALINE], new Date(2026, 11, 20));
    expect(flag).toMatchObject({ bucket: "expired", days: -7 });
  });
});

describe("catalogue", () => {
  test("product_created and product_creation_rejected never carry the typed name or SKU", async () => {
    trackProductCreated({ ...SALINE, id: 12 });
    trackProductCreationRejected({ status: 400, category: "diagnostics", country: "UK", fieldNames: ["sku"] });
    trackProductCreationRejected({ status: 422, category: "", country: "", fieldNames: ["min_stock", "Bad Key"] });
    const events = await sent();
    expect(events.map((e) => e.event_type)).toEqual(["product_created", "product_creation_rejected", "product_creation_rejected"]);
    expect(events[0].properties).toEqual({
      product_id: 12, product_category: "medication", product_subcategory: "medications", unit: "vial",
      country: "US", has_expiry_date: true, min_stock: 50, actor_role: "manager",
    });
    expect(events[1].properties).toEqual({ reason: "duplicate_sku", product_category: "equipment", country: "UK", field_names: ["sku"] });
    expect(events[2].properties).toEqual({ reason: "validation_error", product_category: null, country: null, field_names: ["min_stock"] });
    expect(JSON.stringify(events)).not.toContain("HCR-");
    expect(JSON.stringify(events)).not.toContain("Saline");
  });
});
