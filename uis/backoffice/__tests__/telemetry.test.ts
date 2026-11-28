/**
 * lib/telemetry.ts — the TelemetryService.
 * Queue + batch (10 s / 20 events), sendBeacon on hide, retry with backoff,
 * automatic envelope, and enforcement of the approved contract.
 */
import {
  FLUSH_INTERVAL_MS,
  MAX_BATCH_SIZE,
  __pendingEventsForTests,
  flushTelemetry,
  newRequestId,
  noteApiRequest,
  onPageHide,
  installTelemetry,
  setTelemetryIdentity,
  track,
} from "../lib/telemetry";
import { ENDPOINT, installFakeBrowser, removeFakeBrowser, schemaErrors } from "./support/fakeBrowser";

const USER = { userId: "3b1f8a52-7c4e-4f0e-9a51-2d6b8f0c1e77", role: "manager" as const, sessionId: "1f7c9a20-4b6e-4d1f-8e0a-5c3b2a1d9e47" };
const PAGE = { section: "inventory_products", route_template: "/inventory/products", referrer_section: null, actor_role: "manager" };

let browser: ReturnType<typeof installFakeBrowser>;

beforeEach(() => {
  jest.useFakeTimers();
  browser = installFakeBrowser();
});

afterEach(() => {
  removeFakeBrowser();
  jest.useRealTimers();
});

async function settle() {
  // Let pending promise chains (fetch → retry timers) run.
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe("envelope", () => {
  test("track() adds every envelope field; the caller only passes event_type and properties", async () => {
    setTelemetryIdentity(USER);
    track("page_viewed", PAGE);
    await flushTelemetry();

    const [event] = browser.batches[0];
    expect(Object.keys(event).sort()).toEqual(
      ["actorType", "environment", "eventId", "event_type", "properties", "requestId", "schemaVersion", "sessionId", "source", "timestamp", "userId"].sort()
    );
    expect(event).toMatchObject({
      event_type: "page_viewed",
      userId: USER.userId,
      sessionId: USER.sessionId,
      actorType: "user",
      schemaVersion: "1.0.0",
      source: "backoffice",
      environment: "staging",
      properties: PAGE,
    });
    expect(event.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(schemaErrors(event)).toEqual([]);
  });

  test("timestamp is the moment of capture, not of sending", async () => {
    jest.setSystemTime(new Date("2026-11-23T10:00:00.000Z"));
    track("page_viewed", PAGE);
    jest.setSystemTime(new Date("2026-11-23T10:00:09.000Z"));
    await flushTelemetry();
    expect(browser.batches[0][0].timestamp).toBe("2026-11-23T10:00:00.000Z");
  });

  test("without a session the event is anonymous with a per-tab session id", async () => {
    track("page_viewed", { ...PAGE, actor_role: null });
    track("page_viewed", { ...PAGE, actor_role: null });
    await flushTelemetry();
    const [a, b] = browser.batches[0];
    expect(a.userId).toBeNull();
    expect(a.actorType).toBe("anonymous");
    expect(a.sessionId).toBe(b.sessionId);
    expect(a.eventId).not.toBe(b.eventId);
    expect(schemaErrors(a)).toEqual([]);
  });

  test("identity survives a reload of the tab (sessionStorage)", async () => {
    setTelemetryIdentity(USER);
    const { __resetTelemetryForTests } = await import("../lib/telemetry");
    const storage = (window as unknown as { sessionStorage: Storage }).sessionStorage;
    const saved = storage.getItem("healthcore_telemetry_identity");
    __resetTelemetryForTests(); // simulates a fresh module after reload
    storage.setItem("healthcore_telemetry_identity", saved as string);
    track("page_viewed", PAGE);
    expect(__pendingEventsForTests()[0].userId).toBe(USER.userId);
  });

  test("requestId reuses the X-Request-ID of the API call that just answered", () => {
    const rid = newRequestId();
    noteApiRequest(rid);
    track("page_viewed", PAGE);
    jest.advanceTimersByTime(2_000);
    track("page_viewed", PAGE);
    const [correlated, later] = __pendingEventsForTests();
    expect(correlated.requestId).toBe(rid);
    expect(later.requestId).not.toBe(rid);
  });
});

describe("queue, batch and debounce", () => {
  test("events wait in the local queue; nothing is sent one by one", () => {
    for (let i = 0; i < 5; i++) track("page_viewed", PAGE);
    expect(browser.fetchMock).not.toHaveBeenCalled();
    expect(__pendingEventsForTests()).toHaveLength(5);
  });

  test("the queue is sent 10 s after the first event", async () => {
    track("page_viewed", PAGE);
    jest.advanceTimersByTime(FLUSH_INTERVAL_MS - 1);
    expect(browser.fetchMock).not.toHaveBeenCalled();
    track("page_viewed", PAGE);
    jest.advanceTimersByTime(1);
    await settle();
    expect(browser.fetchMock).toHaveBeenCalledTimes(1);
    expect(browser.batches[0]).toHaveLength(2);
    const [url, init] = browser.fetchMock.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(Object.keys(JSON.parse(String(init?.body)))).toEqual(["events"]);
  });

  test("reaching 20 events sends the batch immediately", async () => {
    for (let i = 0; i < MAX_BATCH_SIZE; i++) track("page_viewed", PAGE);
    await settle();
    expect(browser.fetchMock).toHaveBeenCalledTimes(1);
    expect(browser.batches[0]).toHaveLength(MAX_BATCH_SIZE);
    expect(__pendingEventsForTests()).toHaveLength(0);
  });

  test("the endpoint comes from NEXT_PUBLIC_TELEMETRY_ENDPOINT; without it nothing is sent", async () => {
    removeFakeBrowser();
    browser = installFakeBrowser({ endpoint: null });
    track("page_viewed", PAGE);
    await flushTelemetry();
    expect(__pendingEventsForTests()).toHaveLength(0);
    expect(browser.fetchMock).not.toHaveBeenCalled();
  });
});

describe("retry with exponential backoff", () => {
  test("a failed batch is retried after 1 s, 2 s and 4 s, then discarded", async () => {
    browser.fetchMock.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    track("page_viewed", PAGE);
    const done = flushTelemetry();
    await settle();
    expect(browser.fetchMock).toHaveBeenCalledTimes(1);

    for (const [delay, calls] of [[1_000, 2], [2_000, 3], [4_000, 4]] as const) {
      jest.advanceTimersByTime(delay - 1);
      await settle();
      expect(browser.fetchMock).toHaveBeenCalledTimes(calls - 1);
      jest.advanceTimersByTime(1);
      await settle();
      expect(browser.fetchMock).toHaveBeenCalledTimes(calls);
    }
    jest.advanceTimersByTime(60_000);
    await done;
    expect(browser.fetchMock).toHaveBeenCalledTimes(4); // 1 + 3 retries, then dropped
  });

  test("a retry that succeeds delivers the same events", async () => {
    browser.fetchMock.mockImplementationOnce(async () => new Response("", { status: 503 }));
    track("page_viewed", PAGE);
    const done = flushTelemetry();
    await settle();
    jest.advanceTimersByTime(1_000);
    await done;
    const bodies = browser.fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).events[0].eventId);
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toBe(bodies[0]);
  });

  test("a 4xx (malformed batch) is not retried", async () => {
    browser.fetchMock.mockImplementationOnce(async () => new Response("", { status: 422 }));
    track("page_viewed", PAGE);
    await flushTelemetry();
    jest.advanceTimersByTime(10_000);
    await settle();
    expect(browser.fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("reliable flush with sendBeacon", () => {
  beforeEach(() => installTelemetry());

  test("hiding the tab sends the pending queue with sendBeacon (text/plain, no preflight)", async () => {
    track("page_viewed", PAGE);
    track("page_viewed", PAGE);
    browser.hide();
    await browser.beaconsRead();

    expect(browser.navigator.sendBeacon).toHaveBeenCalledTimes(1);
    expect(browser.beacons[0].url).toBe(ENDPOINT);
    expect(browser.beacons[0].type).toBe("text/plain;charset=utf-8");
    expect(browser.beacons[0].events).toHaveLength(2);
    expect(__pendingEventsForTests()).toHaveLength(0);
    expect(browser.fetchMock).not.toHaveBeenCalled();
  });

  test("batches waiting for a retry also leave with the beacon (and are not re-sent)", async () => {
    browser.fetchMock.mockImplementationOnce(async () => new Response("", { status: 500 }));
    track("page_viewed", PAGE);
    const done = flushTelemetry();
    await settle();
    browser.hide();
    await browser.beaconsRead();
    await done;
    jest.advanceTimersByTime(10_000);
    await settle();

    expect(browser.beacons[0].events).toHaveLength(1);
    expect(browser.fetchMock).toHaveBeenCalledTimes(1);
  });

  test("pagehide runs the registered hooks BEFORE the final flush", async () => {
    onPageHide(() => track("page_viewed", { ...PAGE, section: "home", route_template: "/" }));
    browser.fire("pagehide");
    await browser.beaconsRead();
    expect(browser.beacons[0].events[0].properties.section).toBe("home");
  });

  test("more than 20 pending events are split into several beacons", async () => {
    browser.fetchMock.mockImplementation(async () => new Response("", { status: 500 }));
    for (let i = 0; i < 45; i++) track("page_viewed", PAGE);
    await settle(); // the two full batches failed and wait for their retry
    browser.hide();
    await browser.beaconsRead();
    expect(browser.beacons.map((b) => b.events.length)).toEqual([20, 20, 5]);
    expect(browser.navigator.sendBeacon).toHaveBeenCalledTimes(3);
  });
});

describe("contract enforcement (plan §5.5)", () => {
  async function sentTypes() {
    await flushTelemetry();
    return browser.sent();
  }

  test("a property outside the allowlist is stripped and reported", async () => {
    track("page_viewed", { ...PAGE, patient_name: "x" });
    const events = await sentTypes();
    const event = events.find((e) => e.event_type === "page_viewed")!;
    const rejected = events.find((e) => e.event_type === "telemetry_event_rejected")!;
    expect(event.properties).not.toHaveProperty("patient_name");
    expect(rejected).toMatchObject({
      event_type: "telemetry_event_rejected",
      actorType: "system",
      userId: null,
      properties: { rejected_event_type: "page_viewed", reason: "unknown_property_stripped", property_names: ["patient_name"], emitter_source: "backoffice" },
    });
    expect(schemaErrors(rejected)).toEqual([]);
  });

  test.each([
    ["unknown event type", "stock_level_snapshot", { a: 1 }, "unknown_event_type"],
    ["missing required property", "page_viewed", { section: "home" }, "required_missing"],
    ["wrong type", "page_viewed", { ...PAGE, section: 42 }, "type_mismatch"],
    ["value outside the enum", "page_viewed", { ...PAGE, section: "patients" }, "type_mismatch"],
    ["value breaking the property pattern (email as a field name)", "inventory_order_validation_failed", { order_type: "inbound", product_id: null, clinic_id: null, field_names: ["maria@example.com"], error_codes: ["missing"] }, "type_mismatch"],
  ])("%s → event dropped, rejection reported", async (_label, type, props, reason) => {
    track(type, props);
    const events = await sentTypes();
    expect(events).toHaveLength(1);
    expect(events[0].properties).toMatchObject({ reason });
  });

  test("a PII pattern in an otherwise valid value drops the event", async () => {
    track("inbound_order_created", {
      order_id: 1, clinic_id: 1, country: "US", region: "TX", product_id: 1, product_category: "ppe",
      quantity: 5, unit: "box", supplier_id: null, vendor_in_directory: false,
      vendor_name: "call +44 7700 900123", stock_after: 5,
    });
    const events = await sentTypes();
    expect(events.map((e) => e.event_type)).toEqual(["telemetry_event_rejected"]);
    expect(events[0].properties).toMatchObject({ reason: "pii_pattern_detected", property_names: ["vendor_name"] });
  });

  test("repeated rejections are throttled to one per minute with occurrence_count", async () => {
    for (let i = 0; i < 4; i++) track("nope_event", {});
    jest.advanceTimersByTime(61_000);
    track("nope_event", {});
    const events = await sentTypes();
    expect(events.map((e) => e.properties.occurrence_count)).toEqual([1, 4]);
  });

  test("track() never throws", () => {
    expect(() => track("page_viewed", null as unknown as Record<string, unknown>)).not.toThrow();
  });
});
