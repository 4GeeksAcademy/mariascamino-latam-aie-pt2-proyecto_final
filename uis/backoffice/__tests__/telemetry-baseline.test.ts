/**
 * Cross-cutting baseline (navigation, forms, auth, errors) and the rules that
 * keep telemetry centralised and PII-free.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { __resetErrorTelemetryForTests, installWindowErrorHandlers, reportFrontendError } from "../lib/error-telemetry";
import { FormTracker, errorCode } from "../lib/form-telemetry";
import { handleSessionExpired, identityFor, recordFailedLogin, tokenClaims, trackLoginSucceeded } from "../lib/session-telemetry";
import { flushTelemetry, installTelemetry, setTelemetryIdentity, type TelemetryEvent } from "../lib/telemetry";
import { TELEMETRY_CONTRACT } from "../lib/telemetry-contract.generated";
import { errorFingerprint, routeInfo, userAgentFamily, deviceType } from "../lib/telemetry-domain";
import { installFakeBrowser, removeFakeBrowser, schemaErrors } from "./support/fakeBrowser";

const USER = { userId: "3b1f8a52-7c4e-4f0e-9a51-2d6b8f0c1e77", role: "user" as const, sessionId: "1f7c9a20-4b6e-4d1f-8e0a-5c3b2a1d9e47" };

function fakeJwt(claims: object): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256" })}.${enc(claims)}.signature`;
}

let browser: ReturnType<typeof installFakeBrowser>;

beforeEach(() => {
  browser = installFakeBrowser();
  __resetErrorTelemetryForTests();
});
afterEach(() => removeFakeBrowser());

async function sent(): Promise<TelemetryEvent[]> {
  await flushTelemetry();
  await browser.beaconsRead();
  const events = browser.sent();
  for (const e of events) expect({ type: e.event_type, errors: schemaErrors(e) }).toEqual({ type: e.event_type, errors: [] });
  return events;
}

describe("navigation: routeInfo", () => {
  test.each([
    ["/", "home", "/"],
    ["/inventory/orders/outbound", "inventory_outbound", "/inventory/orders/outbound"],
    ["/inventory/orders/outbound/", "inventory_outbound", "/inventory/orders/outbound"],
    ["/account/change-password", "account_password", "/account/change-password"],
    ["/reset-password?token=SECRET", "reset_password", "/reset-password"],
    ["/suppliers/42/edit", "not_found", "/{unknown}"],
  ])("%s → %s", (path, section, template) => {
    expect(routeInfo(path)).toEqual({ section, route_template: template });
  });

  test("every section the app can report exists in the contract enum", () => {
    const allowed = TELEMETRY_CONTRACT.page_viewed.properties.section.enum as string[];
    for (const p of ["/", "/suppliers", "/incidents", "/incidents/new", "/incidents/summary", "/inventory", "/inventory/products",
      "/inventory/orders", "/inventory/orders/inbound", "/inventory/orders/outbound", "/account/profile",
      "/account/change-password", "/login", "/register", "/forgot-password", "/reset-password", "/nope"]) {
      expect(allowed).toContain(routeInfo(p).section);
    }
  });
});

describe("forms: started / validation / submitted / abandoned", () => {
  test("the funnel sends field NAMES and timings, never values", async () => {
    let now = 1_000;
    setTelemetryIdentity(USER);
    const form = new FormTracker("outbound_order", "inventory_outbound", 5, () => now);
    form.fieldChanged("supply_id", { supply_id: "3" });
    form.fieldChanged("quantity", { supply_id: "3", quantity: "999999" }); // no second form_started
    form.validationFailed({ department: "Select the department that used it.", quantity: undefined }, "client");
    now = 4_500;
    form.submitted();

    const events = await sent();
    expect(events.map((e) => e.event_type)).toEqual(["form_started", "form_validation_failed", "form_submitted"]);
    expect(events[1].properties).toEqual({ form_id: "outbound_order", field_names: ["department"], error_codes: ["missing"], validation_side: "client" });
    expect(events[2].properties).toEqual({ form_id: "outbound_order", section: "inventory_outbound", time_to_submit_ms: 3_500, validation_errors_before_submit: 1 });
    expect(JSON.stringify(events)).not.toContain("999999");
  });

  test("leaving a started form emits form_abandoned once; an untouched form emits nothing", async () => {
    const touched = new FormTracker("inbound_order", "inventory_inbound", 4);
    const untouched = new FormTracker("incident_create", "incidents_new", 6);
    touched.fieldChanged("vendor_name", { supply_id: "1", vendor_name: "MedLine", quantity: "", clinic_id: "" });
    touched.abandon("navigation");
    touched.abandon("navigation");
    untouched.abandon("navigation");

    const events = await sent();
    expect(events.map((e) => e.event_type)).toEqual(["form_started", "form_abandoned"]);
    expect(events[1].properties).toMatchObject({ last_field: "vendor_name", fields_completed: 2, fields_total: 4, exit_type: "navigation" });
  });

  test("closing the tab abandons the form BEFORE the sendBeacon flush", async () => {
    installTelemetry();
    new FormTracker("inbound_order", "inventory_inbound", 4).fieldChanged("quantity", { quantity: "5" });
    browser.fire("pagehide");
    const events = await sent();
    expect(events.map((e) => [e.event_type, e.properties.exit_type])).toEqual([
      ["form_started", undefined],
      ["form_abandoned", "tab_closed"],
    ]);
    expect(browser.navigator.sendBeacon).toHaveBeenCalled();
  });

  test.each([
    ["Select a medical supply.", "missing"],
    ["Insufficient stock for supply 'Gloves' in clinic 3. Available: 0, requested: 5.", "insufficient_stock"],
    ["A supply with SKU 'X' already exists.", "duplicate"],
    ["Enter a whole number greater than 0.", "missing"],
    ["El valor es demasiado largo.", "string_too_long"],
    ["???", "invalid"],
  ])("error code for %j is %s", (message, code) => {
    expect(errorCode(message)).toBe(code);
  });
});

describe("authentication", () => {
  test("identity uses the pseudonymous telemetry_id and the JWT sid — never the email", () => {
    const token = fakeJwt({ sub: "7", sid: USER.sessionId, iat: 1_700_000_000 });
    expect(identityFor({ telemetry_id: USER.userId, role: "user" }, token)).toEqual(USER);
    expect(tokenClaims("garbage")).toEqual({});
  });

  test("login_succeeded counts the failed attempts of the last 15 min in this tab", async () => {
    setTelemetryIdentity(USER);
    const now = Date.now();
    recordFailedLogin(now - 20 * 60_000); // too old
    recordFailedLogin(now - 60_000);
    recordFailedLogin(now - 30_000);
    trackLoginSucceeded("user", now);
    trackLoginSucceeded("user", now); // counter was reset

    const events = await sent();
    expect(events.map((e) => e.properties.failed_attempts_before)).toEqual([2, 0]);
    expect(events[0].properties).toEqual({
      actor_role: "user", user_agent_family: "Chrome 131", device_type: "desktop", failed_attempts_before: 2,
    });
    expect(JSON.stringify(events)).not.toMatch(/@/);
  });

  test("an expired session records session_expired + the abandoned form, flushes and redirects", async () => {
    setTelemetryIdentity(USER);
    browser.location.pathname = "/inventory/orders/outbound";
    const form = new FormTracker("outbound_order", "inventory_outbound", 5);
    form.fieldChanged("quantity", { quantity: "3" });
    const iat = Math.floor(Date.now() / 1000) - 61 * 60;

    handleSessionExpired(fakeJwt({ sub: "7", sid: USER.sessionId, iat }));

    const events = await sent();
    expect(events.map((e) => e.event_type)).toEqual(["form_started", "session_expired", "form_abandoned"]);
    expect(events[1]).toMatchObject({
      userId: USER.userId,
      sessionId: USER.sessionId,
      properties: { section: "inventory_outbound", session_age_minutes: 61, had_unsaved_form: true, form_id: "outbound_order" },
    });
    expect(events[2].properties.exit_type).toBe("session_expired");
    expect(browser.navigator.sendBeacon).toHaveBeenCalled();
    expect(browser.location.href).toBe("/login");
  });

  test("a 401 without a session (never logged in) is not a session expiry", async () => {
    handleSessionExpired(null);
    expect(await sent()).toEqual([]);
  });
});

describe("errors", () => {
  test("only the error name and a fingerprint are sent; never the message", async () => {
    const err = new TypeError("Cannot read properties of undefined (reading 'maria@example.com')");
    reportFrontendError(err, "window");
    const [e] = await sent();
    expect(e.event_type).toBe("frontend_error_occurred");
    expect(e.properties).toMatchObject({ section: "inventory_products", error_name: "TypeError", boundary: "window", app_release: "0000000", occurrence_count: 1 });
    expect(e.properties.error_fingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(JSON.stringify(e)).not.toContain("maria");
    expect(JSON.stringify(e)).not.toContain("Cannot read");
  });

  test("window.onerror and unhandledrejection are captured with boundary=window", async () => {
    const remove = installWindowErrorHandlers();
    browser.fire("error", { error: new RangeError("bad") });
    browser.fire("unhandledrejection", { reason: "plain string" });
    remove();
    browser.fire("error", { error: new SyntaxError("after cleanup") });
    const events = await sent();
    expect(events.map((e) => [e.properties.error_name, e.properties.boundary])).toEqual([
      ["RangeError", "window"],
      ["NonErrorRejection", "window"],
    ]);
  });

  test("the same error is throttled to one event per minute with occurrence_count", async () => {
    const err = new Error("boom");
    const t0 = 1_000_000;
    reportFrontendError(err, "route", t0);
    reportFrontendError(err, "route", t0 + 1_000);
    reportFrontendError(err, "route", t0 + 2_000);
    reportFrontendError(err, "route", t0 + 61_000);
    const events = await sent();
    expect(events.map((e) => e.properties.occurrence_count)).toEqual([1, 3]);
  });

  test("fingerprint ignores messages and line numbers, separates different code paths", () => {
    const a = { name: "TypeError", stack: "TypeError: x\n    at render (http://localhost:3000/_next/static/chunks/page.js:10:5)" };
    const b = { name: "TypeError", stack: "TypeError: y\n    at render (http://localhost:3000/_next/static/chunks/page.js:99:1)" };
    const c = { name: "TypeError", stack: "TypeError: x\n    at submit (http://localhost:3000/_next/static/chunks/form.js:10:5)" };
    expect(errorFingerprint(a)).toBe(errorFingerprint(b));
    expect(errorFingerprint(a)).not.toBe(errorFingerprint(c));
  });

  test("user agent is reduced to family + major version", () => {
    expect(userAgentFamily("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/131.0.6778.86 Safari/537.36 Edg/131.0.2903.70")).toBe("Edge 131");
    expect(deviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148")).toBe("mobile");
    expect(deviceType("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
  });
});

describe("architecture rules", () => {
  const root = resolve(__dirname, "..");
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return name === "node_modules" || name.startsWith(".") ? [] : sourceFiles(full);
      return /\.(ts|tsx)$/.test(name) ? [full] : [];
    });
  }
  const files = ["app", "components", "hooks", "lib"].flatMap((d) => sourceFiles(join(root, d)));

  test("only lib/telemetry.ts talks to the collector (no fetch/sendBeacon for telemetry elsewhere)", () => {
    const offenders = files
      .filter((f) => /\.sendBeacon\(|NEXT_PUBLIC_TELEMETRY_ENDPOINT|\/telemetry\/events/.test(readFileSync(f, "utf8")))
      .map((f) => relative(root, f));
    expect(offenders).toEqual(["lib/telemetry.ts"]);
  });

  test("every event_type tracked in the code exists in the approved contract", () => {
    const tracked = new Set<string>();
    for (const f of files) {
      for (const m of readFileSync(f, "utf8").matchAll(/track\(\s*"([a-z_]+)"/g)) tracked.add(m[1]);
    }
    expect(tracked.size).toBeGreaterThanOrEqual(20);
    for (const type of tracked) expect(Object.keys(TELEMETRY_CONTRACT)).toContain(type);
  });

  test("the generated contract matches docs/telemetry/event-schemas.json (run npm run telemetry:contract)", () => {
    const script = join(root, "scripts/generate-telemetry-contract.mjs");
    const expected = execFileSync(process.execPath, [
      "--input-type=module",
      "-e",
      `import { readFileSync } from "node:fs";
       import { buildContract, render, SCHEMA_PATH } from ${JSON.stringify(script)};
       process.stdout.write(render(buildContract(JSON.parse(readFileSync(SCHEMA_PATH, "utf8")))));`,
    ]).toString();
    expect(readFileSync(join(root, "lib/telemetry-contract.generated.ts"), "utf8")).toBe(expected);
  });

  test("the five mandatory BRIEFING events are in the contract", () => {
    const mandatory = Object.entries(TELEMETRY_CONTRACT).filter(([, c]) => c.mandatory).map(([t]) => t).sort();
    expect(mandatory).toEqual([
      "direct_stock_edit_rejected",
      "inbound_order_created",
      "outbound_order_created",
      "stock_threshold_triggered",
      "supply_expiry_flagged",
    ]);
  });
});
