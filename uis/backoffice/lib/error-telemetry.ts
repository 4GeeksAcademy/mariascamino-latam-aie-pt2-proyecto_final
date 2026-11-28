/**
 * frontend_error_occurred (Errores y fiabilidad).
 *
 * Captured in the three places an uncaught error can land: the route error
 * boundary (app/error.tsx), the global one (app/global-error.tsx) and the
 * window handlers (window.onerror / unhandledrejection). Only the error NAME
 * and a fingerprint of its stack frames are sent; the message and raw stack
 * never leave the browser (they can contain what the user typed).
 */
import { track } from "./telemetry";
import { appRelease, currentRouteInfo, errorFingerprint, safeErrorName } from "./telemetry-domain";

export type Boundary = "route" | "global" | "window";

/** Same fingerprint: max 1 event per minute, with occurrence_count (plan §7.2). */
const THROTTLE_MS = 60_000;
const seen = new Map<string, { last: number; suppressed: number }>();

export function reportFrontendError(error: unknown, boundary: Boundary, now = Date.now()): void {
  const err = (error instanceof Error ? error : { name: "NonErrorRejection", stack: "" }) as Error;
  const fingerprint = errorFingerprint(err);
  const entry = seen.get(fingerprint);
  if (entry && now - entry.last < THROTTLE_MS) {
    entry.suppressed += 1;
    return;
  }
  seen.set(fingerprint, { last: now, suppressed: 0 });
  track("frontend_error_occurred", {
    section: currentRouteInfo().section,
    error_name: safeErrorName(err),
    error_fingerprint: fingerprint,
    boundary,
    app_release: appRelease(),
    occurrence_count: (entry?.suppressed ?? 0) + 1,
  });
}

/** window.onerror + unhandledrejection. Returns the cleanup function. */
export function installWindowErrorHandlers(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onError = (event: ErrorEvent) => reportFrontendError(event.error ?? new Error("ScriptError"), "window");
  const onRejection = (event: PromiseRejectionEvent) => reportFrontendError(event.reason, "window");
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

export function __resetErrorTelemetryForTests(): void {
  seen.clear();
}
