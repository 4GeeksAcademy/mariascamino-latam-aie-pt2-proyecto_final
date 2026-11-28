/**
 * lib/inventory.ts — derived data for the order-history page
 * (the values the page memoizes with useMemo).
 */
import { filterOrders, summarizeOrders, type SupplyOrder } from "../lib/inventory";

function order(over: Partial<SupplyOrder>): SupplyOrder {
  return {
    id: 1,
    order_type: "inbound",
    quantity: 10,
    clinic_id: 1,
    created_at: "2026-11-01T10:00:00Z",
    created_by: "Maria",
    vendor_name: "MedLine",
    consumption_type: null,
    supply_id: 1,
    supply_name: "Gloves",
    supply_sku: "HCR-PPE-001",
    ...over,
  };
}

const ORDERS: SupplyOrder[] = [
  order({ id: 1, quantity: 500 }),
  order({ id: 2, quantity: 300, supply_id: 2, supply_name: "Masks", supply_sku: "HCR-PPE-002" }),
  order({ id: 3, order_type: "outbound", quantity: 120, consumption_type: "clinical_use", vendor_name: null }),
  order({ id: 4, order_type: "outbound", quantity: 30, consumption_type: "expiry_waste", vendor_name: null }),
  order({
    id: 5, order_type: "outbound", quantity: 40, consumption_type: "clinical_use", vendor_name: null,
    supply_id: 2, supply_name: "Masks", supply_sku: "HCR-PPE-002",
  }),
];

describe("summarizeOrders", () => {
  it("totals units and orders by type", () => {
    const t = summarizeOrders(ORDERS);
    expect(t.inboundOrders).toBe(2);
    expect(t.outboundOrders).toBe(3);
    expect(t.unitsDelivered).toBe(800);
    expect(t.unitsConsumed).toBe(190);
  });

  it("computes expiry waste as a share of consumption", () => {
    const t = summarizeOrders(ORDERS);
    expect(t.unitsWasted).toBe(30);
    expect(t.wastePct).toBe(15.8); // 30 / 190
  });

  it("finds the most consumed supply", () => {
    expect(summarizeOrders(ORDERS).topConsumed).toEqual({ name: "Gloves", sku: "HCR-PPE-001", units: 150 });
  });

  it("handles an empty history", () => {
    const t = summarizeOrders([]);
    expect(t.wastePct).toBe(0);
    expect(t.topConsumed).toBeNull();
  });
});

describe("filterOrders", () => {
  it("returns the same array for 'all' (no copy)", () => {
    expect(filterOrders(ORDERS, "all")).toBe(ORDERS);
  });

  it("keeps only the requested type", () => {
    expect(filterOrders(ORDERS, "outbound").map((o) => o.id)).toEqual([3, 4, 5]);
    expect(filterOrders(ORDERS, "inbound").map((o) => o.id)).toEqual([1, 2]);
  });
});
