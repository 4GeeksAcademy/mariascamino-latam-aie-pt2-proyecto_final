/**
 * Authentication-side telemetry (Autenticación y accesos), captured in the
 * auth layer — never page by page:
 *
 *   - identity: the envelope's userId/sessionId come from GET /auth/me
 *     (`telemetry_id`, pseudonymous) and the JWT `sid` claim.
 *   - login_succeeded: AuthProvider.login().
 *   - session_expired: any authenticated call answered 401 (lib/api.ts,
 *     lib/inventory.ts), before the redirect to /login.
 *
 * login_failed is deliberately NOT emitted here: the approved schema needs
 * account_ref/ip_ref, HMACs keyed with a server secret, so it can only be
 * produced by the API (Phase 3). The email or password typed never enter any
 * event.
 */
import { clearToken } from "./auth-storage";
import { abandonStartedForms, startedForm } from "./form-telemetry";
import { flushWithBeacon, setTelemetryIdentity, track, type TelemetryIdentity } from "./telemetry";
import { currentRouteInfo, deviceType, userAgentFamily } from "./telemetry-domain";

type Claims = { sid?: string; iat?: number; exp?: number };

/** Payload of a JWT (not verified: only the non-secret sid/iat are read). */
export function tokenClaims(token: string | null): Claims {
  if (!token) return {};
  try {
    const part = token.split(".")[1] ?? "";
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json =
      typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json) as Claims;
  } catch {
    return {};
  }
}

export function identityFor(
  user: { telemetry_id?: string; role: TelemetryIdentity["role"] },
  token: string | null
): TelemetryIdentity | null {
  if (!user.telemetry_id) return null;
  const sid = tokenClaims(token).sid;
  return { userId: user.telemetry_id, role: user.role, sessionId: typeof sid === "string" ? sid : null };
}

export function syncTelemetryIdentity(
  user: { telemetry_id?: string; role: TelemetryIdentity["role"] } | null,
  token: string | null
): void {
  setTelemetryIdentity(user ? identityFor(user, token) : null);
}

// ---------- login_succeeded ----------

const FAILED_LOGINS_KEY = "healthcore_telemetry_failed_logins";
const FAILED_WINDOW_MS = 15 * 60_000;

function failedLoginTimes(now: number): number[] {
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(FAILED_LOGINS_KEY) ?? "[]") as number[];
    return raw.filter((t) => now - t <= FAILED_WINDOW_MS);
  } catch {
    return [];
  }
}

/**
 * Remember a failed attempt in this tab (only a timestamp: no email). Feeds
 * failed_attempts_before of the next login_succeeded.
 */
export function recordFailedLogin(now = Date.now()): void {
  try {
    window.sessionStorage.setItem(FAILED_LOGINS_KEY, JSON.stringify([...failedLoginTimes(now), now]));
  } catch {
    // storage unavailable
  }
}

export function trackLoginSucceeded(role: TelemetryIdentity["role"], now = Date.now()): void {
  const failedBefore = typeof window !== "undefined" ? failedLoginTimes(now).length : 0;
  try {
    window.sessionStorage.removeItem(FAILED_LOGINS_KEY);
  } catch {
    // storage unavailable
  }
  track("login_succeeded", {
    actor_role: role,
    user_agent_family: userAgentFamily(),
    device_type: deviceType(),
    failed_attempts_before: failedBefore,
  });
}

// ---------- session_expired ----------

/**
 * A protected call came back 401. If there WAS a token, the session expired
 * under the user's feet: record it (with the form they were filling, if
 * any), close that form's funnel, flush with sendBeacon and go to /login.
 */
export function handleSessionExpired(token: string | null, now = Date.now()): void {
  if (token) {
    const form = startedForm();
    const iat = tokenClaims(token).iat;
    track("session_expired", {
      section: currentRouteInfo().section,
      session_age_minutes: typeof iat === "number" ? Math.max(0, Math.floor((now - iat * 1000) / 60_000)) : 0,
      had_unsaved_form: form !== null,
      form_id: form?.formId,
    });
    abandonStartedForms("session_expired");
  }
  clearToken();
  setTelemetryIdentity(null);
  if (typeof window !== "undefined") {
    flushWithBeacon();
    window.location.href = "/login";
  }
}
