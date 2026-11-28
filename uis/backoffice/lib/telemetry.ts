/**
 * HealthCore TelemetryService — the ONLY way the backoffice emits telemetry.
 *
 *   track(eventType, properties)
 *
 * Components describe WHAT happened (event_type + allowlisted properties from
 * docs/telemetry/event-schemas.json). This module adds the envelope
 * (eventId, timestamp, sessionId, userId, actorType, schemaVersion,
 * requestId, source, environment, appVersion), validates the event against
 * the approved contract and delivers it:
 *
 *   - Local queue: events accumulate in memory.
 *   - Batch + debounce: the queue is POSTed as { events: [...] } 10 s after
 *     the first queued event, or as soon as it holds 20 events.
 *   - Reliable flush: when the tab is hidden or closed, pending events go out
 *     with navigator.sendBeacon (survives the page being destroyed).
 *   - Retry with backoff: a failed batch is retried up to 3 times
 *     (1 s, 2 s, 4 s) and then discarded — telemetry never blocks the app.
 *
 * The collector URL comes from NEXT_PUBLIC_TELEMETRY_ENDPOINT. Without it,
 * telemetry is disabled (events are dropped), never sent to a guessed URL.
 * No other file may call fetch/sendBeacon for telemetry.
 */
import { TELEMETRY_CONTRACT, type EventContract } from "./telemetry-contract.generated";

// ---------- configuration ----------

export const FLUSH_INTERVAL_MS = 10_000;
export const MAX_BATCH_SIZE = 20;
export const MAX_RETRIES = 3;
export const RETRY_BASE_DELAY_MS = 1_000;
/** Hard cap on memory: if the collector is down for long, oldest events go first. */
export const MAX_QUEUE_SIZE = 500;
/** A requestId noted by the HTTP layer is reused by events tracked within this window. */
export const REQUEST_CORRELATION_WINDOW_MS = 1_500;
/** telemetry_event_rejected: max 1 per (event_type, reason) per minute (plan §7.2). */
const REJECTION_THROTTLE_MS = 60_000;

type Environment = "development" | "staging" | "production";

function endpoint(): string | undefined {
  return process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT || undefined;
}

function environment(): Environment {
  const declared = process.env.NEXT_PUBLIC_APP_ENV;
  if (declared === "development" || declared === "staging" || declared === "production") return declared;
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function appVersion(): string | undefined {
  const sha = process.env.NEXT_PUBLIC_APP_VERSION;
  return sha && /^[a-f0-9]{7,40}$/.test(sha) ? sha : undefined;
}

const isDev = () => environment() === "development";

// ---------- envelope ----------

export type TelemetryEvent = {
  eventId: string;
  timestamp: string;
  sessionId: string | null;
  userId: string | null;
  actorType: "user" | "anonymous" | "system";
  event_type: string;
  schemaVersion: string;
  requestId: string;
  source: "backoffice";
  environment: Environment;
  appVersion?: string;
  properties: Record<string, unknown>;
};

export type TelemetryIdentity = {
  /** Pseudonymous users.uuid (GET /auth/me → telemetry_id). Never the email. */
  userId: string;
  role: "admin" | "manager" | "user";
  /** `sid` claim of the JWT: one per login. */
  sessionId: string | null;
};

export function uuidv4(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Fallback for old browsers: RFC 4122 v4 layout from Math.random.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------- state (module singleton: one queue per tab) ----------

const IDENTITY_KEY = "healthcore_telemetry_identity";
const ANON_SESSION_KEY = "healthcore_telemetry_anon_sid";

let queue: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
/** Batches waiting for a retry: still flushed by sendBeacon if the tab closes. */
const retrying = new Map<
  number,
  { events: TelemetryEvent[]; timer: ReturnType<typeof setTimeout>; resolve: () => void }
>();
/** Retry ids whose events already left through sendBeacon (tab hidden meanwhile). */
const retryingWasFlushed = new Set<number>();
let retryId = 0;
/** Bumped by the test reset so in-flight retries of a previous test stop. */
let generation = 0;
let identity: TelemetryIdentity | null = null;
let identityLoaded = false;
let anonSessionId: string | null = null;
let lastRequest: { id: string; at: number } | null = null;
const rejectionThrottle = new Map<string, { last: number; suppressed: number }>();
const pageHideHooks = new Set<() => void>();
let installed = false;
let warnedDisabled = false;

function sessionStore(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage ?? null : null;
  } catch {
    return null;
  }
}

/** Set by the auth layer when the user is known (and null on logout). */
export function setTelemetryIdentity(next: TelemetryIdentity | null): void {
  identity = next;
  identityLoaded = true;
  const store = sessionStore();
  try {
    if (next) store?.setItem(IDENTITY_KEY, JSON.stringify(next));
    else store?.removeItem(IDENTITY_KEY);
  } catch {
    // storage unavailable: identity stays in memory only
  }
}

function currentIdentity(): TelemetryIdentity | null {
  if (!identityLoaded) {
    // After a reload, events captured before GET /auth/me resolves (e.g. an
    // expired session) still belong to the user of this tab.
    identityLoaded = true;
    try {
      const raw = sessionStore()?.getItem(IDENTITY_KEY);
      identity = raw ? (JSON.parse(raw) as TelemetryIdentity) : null;
    } catch {
      identity = null;
    }
  }
  return identity;
}

/** Role of the signed-in user, for events whose allowlist has `actor_role`. */
export function currentActorRole(): TelemetryIdentity["role"] | null {
  return currentIdentity()?.role ?? null;
}

function sessionId(): string {
  const fromToken = currentIdentity()?.sessionId;
  if (fromToken) return fromToken;
  // Anonymous browser session (login, forgot-password…): one per tab.
  if (!anonSessionId) {
    const store = sessionStore();
    try {
      anonSessionId = store?.getItem(ANON_SESSION_KEY) ?? null;
    } catch {
      anonSessionId = null;
    }
    if (!anonSessionId) {
      anonSessionId = uuidv4();
      try {
        store?.setItem(ANON_SESSION_KEY, anonSessionId);
      } catch {
        // memory only
      }
    }
  }
  return anonSessionId;
}

// ---------- requestId correlation ----------

/** New id for an outgoing API call (sent as X-Request-ID). */
export function newRequestId(): string {
  return uuidv4();
}

/**
 * Called by the HTTP layer when an API response arrives. Events tracked right
 * after it (the confirmation of that request) carry the same requestId, so a
 * frontend event can be joined with the API log line and backend events.
 */
export function noteApiRequest(requestId: string): void {
  lastRequest = { id: requestId, at: Date.now() };
}

function correlatedRequestId(): string {
  if (lastRequest && Date.now() - lastRequest.at <= REQUEST_CORRELATION_WINDOW_MS) return lastRequest.id;
  return uuidv4();
}

// ---------- contract validation (plan §5.5) ----------

const PII_PATTERNS: { name: string; re: RegExp; skipKeys?: string[] }[] = [
  { name: "email", re: /[^@\s]+@[^@\s]+\.[a-z]{2,}/i },
  { name: "phone", re: /\+\d{1,3}[\s\d]{7,}/ },
  { name: "patient_id", re: /\bHC-[A-Z0-9]{6}\b/ },
  { name: "ssn", re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { name: "nhs_number", re: /\b\d{3}\s?\d{3}\s?\d{4}\b/ },
  { name: "date_of_birth", re: /\b(19|20)\d{2}-\d{2}-\d{2}\b/, skipKeys: ["expiry_date"] },
];

export type RejectionReason =
  | "unknown_property_stripped"
  | "required_missing"
  | "type_mismatch"
  | "pii_pattern_detected"
  | "unknown_event_type";

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function matchesSpec(value: unknown, spec: EventContract["properties"][string]): boolean {
  const t = typeOf(value);
  const typeOk = spec.types.includes(t) || (t === "integer" && spec.types.includes("number"));
  if (!typeOk) return false;
  if (value === null) return true;
  if (spec.enum && !spec.enum.includes(value)) return false;
  if (typeof value === "number") {
    if (spec.minimum !== undefined && value < spec.minimum) return false;
    if (spec.maximum !== undefined && value > spec.maximum) return false;
  }
  if (typeof value === "string") {
    if (spec.maxLength !== undefined && value.length > spec.maxLength) return false;
    if (spec.pattern && !new RegExp(spec.pattern).test(value)) return false;
  }
  if (Array.isArray(value)) {
    if (spec.maxItems !== undefined && value.length > spec.maxItems) return false;
    if (spec.itemPattern && !value.every((v) => typeof v === "string" && new RegExp(spec.itemPattern as string).test(v))) {
      return false;
    }
  }
  return true;
}

function containsPii(key: string, value: unknown): boolean {
  const strings = typeof value === "string" ? [value] : Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  return strings.some((s) => PII_PATTERNS.some((p) => !(p.skipKeys ?? []).includes(key) && p.re.test(s as string)));
}

type Validation =
  | { ok: true; properties: Record<string, unknown>; stripped: string[] }
  | { ok: false; reason: RejectionReason; keys: string[] };

export function validateEvent(eventType: string, properties: Record<string, unknown>): Validation {
  const contract = TELEMETRY_CONTRACT[eventType];
  if (!contract) return { ok: false, reason: "unknown_event_type", keys: [] };

  const clean: Record<string, unknown> = {};
  const stripped: string[] = [];
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (value === undefined) continue;
    if (!(key in contract.properties)) stripped.push(key);
    else clean[key] = value;
  }

  const missing = contract.required.filter((key) => !(key in clean));
  if (missing.length) return { ok: false, reason: "required_missing", keys: missing };

  const wrong = Object.entries(clean)
    .filter(([key, value]) => !matchesSpec(value, contract.properties[key]))
    .map(([key]) => key);
  if (wrong.length) return { ok: false, reason: "type_mismatch", keys: wrong };

  const pii = Object.entries(clean)
    .filter(([key, value]) => containsPii(key, value))
    .map(([key]) => key);
  if (pii.length) return { ok: false, reason: "pii_pattern_detected", keys: pii };

  return { ok: true, properties: clean, stripped };
}

function reportRejection(eventType: string, reason: RejectionReason, keys: string[]): void {
  if (isDev()) {
    // Loud in development so the emitter gets fixed (plan §5.5); never throws in the UI.
    console.warn(`[telemetry] ${eventType} → ${reason}`, keys);
  }
  const throttleKey = `${eventType}:${reason}`;
  const now = Date.now();
  const entry = rejectionThrottle.get(throttleKey);
  if (entry && now - entry.last < REJECTION_THROTTLE_MS) {
    entry.suppressed += 1;
    return;
  }
  const occurrence = (entry?.suppressed ?? 0) + 1;
  rejectionThrottle.set(throttleKey, { last: now, suppressed: 0 });
  enqueue(
    buildEnvelope(
      "telemetry_event_rejected",
      {
        rejected_event_type: eventType.slice(0, 60),
        reason,
        property_names: keys.filter((k) => /^[a-z_]{1,40}$/.test(k)).slice(0, 30),
        emitter_source: "backoffice",
        occurrence_count: occurrence,
      },
      { system: true }
    )
  );
}

function buildEnvelope(
  eventType: string,
  properties: Record<string, unknown>,
  opts: { system?: boolean } = {}
): TelemetryEvent {
  const who = opts.system ? null : currentIdentity();
  const event: TelemetryEvent = {
    eventId: uuidv4(),
    timestamp: new Date().toISOString(), // capture time, UTC with ms and Z
    // System events (telemetry_event_rejected) belong to no session or user.
    sessionId: opts.system ? null : sessionId(),
    userId: who?.userId ?? null,
    actorType: opts.system ? "system" : who ? "user" : "anonymous",
    event_type: eventType,
    schemaVersion: TELEMETRY_CONTRACT[eventType].schemaVersion,
    requestId: correlatedRequestId(),
    source: "backoffice",
    environment: environment(),
    properties,
  };
  const version = appVersion();
  if (version) event.appVersion = version;
  return event;
}

// ---------- public API ----------

/**
 * Record that something happened in the backoffice. Never throws, never
 * awaits: telemetry must not break or slow down the UI.
 */
export function track(eventType: string, properties: Record<string, unknown>): void {
  try {
    if (!endpoint()) {
      if (!warnedDisabled && isDev()) {
        warnedDisabled = true;
        console.warn("[telemetry] NEXT_PUBLIC_TELEMETRY_ENDPOINT is not set: events are not sent.");
      }
      return;
    }
    const result = validateEvent(eventType, properties);
    if (!result.ok) {
      reportRejection(eventType, result.reason, result.keys);
      return;
    }
    if (result.stripped.length) reportRejection(eventType, "unknown_property_stripped", result.stripped);
    enqueue(buildEnvelope(eventType, result.properties));
  } catch (err) {
    if (isDev()) console.warn("[telemetry] track failed", err);
  }
}

function enqueue(event: TelemetryEvent): void {
  queue.push(event);
  if (queue.length > MAX_QUEUE_SIZE) queue.splice(0, queue.length - MAX_QUEUE_SIZE);
  if (queue.length >= MAX_BATCH_SIZE) {
    void flushTelemetry();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushTelemetry();
    }, FLUSH_INTERVAL_MS);
  }
}

function clearFlushTimer(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

/** Send everything queued now, in batches of MAX_BATCH_SIZE, with fetch + retry. */
export async function flushTelemetry(): Promise<void> {
  clearFlushTimer();
  const url = endpoint();
  if (!url) return;
  const sends: Promise<void>[] = [];
  while (queue.length) sends.push(sendWithRetry(url, queue.splice(0, MAX_BATCH_SIZE), 0));
  await Promise.all(sends);
}

async function sendWithRetry(url: string, events: TelemetryEvent[], attempt: number): Promise<void> {
  let status = 0;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
    status = res.status;
    if (res.ok) return;
  } catch {
    status = 0; // network error / collector down
  }

  // 4xx other than 408/429: the batch itself is wrong; retrying won't fix it.
  const retryable = status === 0 || status === 408 || status === 429 || status >= 500;
  if (!retryable || attempt >= MAX_RETRIES) {
    if (isDev()) console.warn(`[telemetry] batch of ${events.length} discarded (status ${status}, attempt ${attempt + 1})`);
    return;
  }

  const delay = RETRY_BASE_DELAY_MS * 2 ** attempt; // 1 s, 2 s, 4 s
  const id = ++retryId;
  const gen = generation;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      retrying.delete(id);
      resolve();
    }, delay);
    retrying.set(id, { events, timer, resolve });
  });
  if (retryingWasFlushed.delete(id)) return; // already delivered by flushWithBeacon
  if (gen !== generation) return;
  await sendWithRetry(url, events, attempt + 1);
}

/**
 * Flush for a page that may be about to die: navigator.sendBeacon is queued
 * by the browser and delivered even after the tab closes. text/plain is a
 * CORS-safelisted type, so no preflight is needed.
 */
export function flushWithBeacon(): void {
  clearFlushTimer();
  const url = endpoint();
  if (!url) return;
  const pending: TelemetryEvent[] = [];
  for (const [id, entry] of retrying) {
    clearTimeout(entry.timer);
    retrying.delete(id);
    retryingWasFlushed.add(id);
    pending.push(...entry.events);
    entry.resolve();
  }
  pending.push(...queue.splice(0));
  for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
    const events = pending.slice(i, i + MAX_BATCH_SIZE);
    const body = JSON.stringify({ events });
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    const sent =
      typeof nav?.sendBeacon === "function" &&
      nav.sendBeacon(url, new Blob([body], { type: "text/plain;charset=UTF-8" }));
    if (!sent) {
      // Beacon unavailable or refused (payload too big): best effort keepalive fetch.
      void fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body, keepalive: true }).catch(
        () => undefined
      );
    }
  }
}

/**
 * Run `hook` right before the final flush when the page is being left
 * (pagehide). Used by forms to emit form_abandoned with exit_type tab_closed.
 */
export function onPageHide(hook: () => void): () => void {
  pageHideHooks.add(hook);
  return () => pageHideHooks.delete(hook);
}

/** Attach the browser listeners once per tab (called by <TelemetryProvider>). */
export function installTelemetry(): void {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushWithBeacon();
  });
  window.addEventListener("pagehide", () => {
    for (const hook of [...pageHideHooks]) {
      try {
        hook();
      } catch {
        // a broken hook never blocks the flush
      }
    }
    flushWithBeacon();
  });
}

// ---------- test helpers ----------

export function __pendingEventsForTests(): TelemetryEvent[] {
  return [...queue];
}

export function __resetTelemetryForTests(): void {
  generation += 1;
  clearFlushTimer();
  for (const entry of retrying.values()) {
    clearTimeout(entry.timer);
    entry.resolve();
  }
  retrying.clear();
  retryingWasFlushed.clear();
  queue = [];
  identity = null;
  identityLoaded = false;
  anonSessionId = null;
  lastRequest = null;
  rejectionThrottle.clear();
  pageHideHooks.clear();
  installed = false;
  warnedDisabled = false;
}
