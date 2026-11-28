/**
 * Just enough browser for the TelemetryService in Jest's node environment:
 * window (+ listeners, storages, location), document.visibilityState,
 * navigator.sendBeacon and a fetch mock that records every batch.
 */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { __resetTelemetryForTests, type TelemetryEvent } from "../../lib/telemetry";

type Listener = (event: unknown) => void;

function storage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

export const ENDPOINT = "http://collector.test/telemetry/events";

export function installFakeBrowser(opts: { endpoint?: string | null; userAgent?: string } = {}) {
  const listeners = new Map<string, Listener[]>();
  const on = (type: string, fn: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), fn]);
  const off = (type: string, fn: Listener) => listeners.set(type, (listeners.get(type) ?? []).filter((l) => l !== fn));
  const fire = (type: string, event: unknown = {}) => (listeners.get(type) ?? []).forEach((l) => l(event));

  const location = { href: "/inventory/products", pathname: "/inventory/products" };
  const doc = { visibilityState: "visible", addEventListener: on, removeEventListener: off };
  const beacons: { url: string; events: TelemetryEvent[]; type: string }[] = [];
  const beaconBodies: Promise<void>[] = [];
  const navigatorStub = {
    userAgent:
      opts.userAgent ??
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    sendBeacon: jest.fn((url: string, blob: Blob) => {
      beaconBodies.push(blob.text().then((t) => void beacons.push({ url, events: JSON.parse(t).events, type: blob.type })));
      return true;
    }),
  };

  const g = globalThis as unknown as Record<string, unknown>;
  g.window = {
    localStorage: storage(),
    sessionStorage: storage(),
    location,
    addEventListener: on,
    removeEventListener: off,
  };
  g.document = doc;
  Object.defineProperty(globalThis, "navigator", { value: navigatorStub, configurable: true, writable: true });

  const batches: TelemetryEvent[][] = [];
  const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
    batches.push(JSON.parse(String(init?.body)).events);
    return new Response(JSON.stringify({ received: 1 }), { status: 200 });
  });
  g.fetch = fetchMock;

  if (opts.endpoint === null) delete process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT;
  else process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT = opts.endpoint ?? ENDPOINT;
  process.env.NEXT_PUBLIC_APP_ENV = "staging"; // quiet: no dev console warnings

  __resetTelemetryForTests();

  return {
    location,
    document: doc,
    navigator: navigatorStub,
    fetchMock,
    batches,
    beacons,
    /** Resolves once every Blob passed to sendBeacon has been read. */
    beaconsRead: () => Promise.all(beaconBodies),
    fire,
    hide() {
      doc.visibilityState = "hidden";
      fire("visibilitychange");
    },
    /** All events sent so far (fetch + beacon), flattened. */
    sent(): TelemetryEvent[] {
      return [...batches.flat(), ...beacons.flatMap((b) => b.events)];
    },
  };
}

export function removeFakeBrowser() {
  __resetTelemetryForTests();
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.window;
  delete g.document;
  delete process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT;
  delete process.env.NEXT_PUBLIC_APP_ENV;
}

// ---------- approved contract (JSON Schema draft-07) ----------

const schemaJson = JSON.parse(
  readFileSync(resolve(__dirname, "../../../../docs/telemetry/event-schemas.json"), "utf8")
);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schemaJson);

/** Validates a full event (envelope + properties) against event-schemas.json. */
export function schemaErrors(event: unknown): string[] {
  return validateSchema(event)
    ? []
    : (validateSchema.errors ?? []).map((e) => `${e.instancePath} ${e.message}`);
}
