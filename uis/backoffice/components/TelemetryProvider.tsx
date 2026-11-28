"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect, useRef } from "react";

import { useAuth } from "../lib/auth-context";
import { installWindowErrorHandlers } from "../lib/error-telemetry";
import { installTelemetry, track } from "../lib/telemetry";
import { deviceType, routeInfo, type Section } from "../lib/telemetry-domain";

/** Same section within 2 s is not re-emitted (React Strict Mode double effects, plan §7.2). */
const PAGE_VIEW_DEDUPE_MS = 2_000;

const VITALS = new Set(["LCP", "CLS", "INP", "TTFB", "FCP"]);

/**
 * Share of sessions that report Web Vitals (plan §7.2: 25 %). In development
 * every session reports, so the events can be checked in DevTools.
 */
function vitalsSampled(): boolean {
  const configured = Number(process.env.NEXT_PUBLIC_TELEMETRY_SAMPLE_RATE_VITALS);
  const rate = Number.isFinite(configured) && process.env.NEXT_PUBLIC_TELEMETRY_SAMPLE_RATE_VITALS
    ? configured
    : process.env.NODE_ENV === "production"
      ? 0.25
      : 1;
  const key = "healthcore_telemetry_vitals_sampled";
  try {
    const stored = window.sessionStorage.getItem(key);
    if (stored !== null) return stored === "1";
    const sampled = Math.random() < rate;
    window.sessionStorage.setItem(key, sampled ? "1" : "0");
    return sampled;
  } catch {
    return Math.random() < rate;
  }
}

/**
 * Cross-cutting technical baseline, mounted once in the root layout:
 *   - installs the TelemetryService listeners (sendBeacon on hide/close)
 *   - page_viewed on every route change (navigation)
 *   - page_load_recorded from Next.js Web Vitals (performance)
 *   - frontend_error_occurred from window.onerror / unhandledrejection (errors)
 */
export default function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const previous = useRef<{ section: Section; at: number } | null>(null);
  const sampled = useRef<boolean | null>(null);
  const role = useRef<string | null>(null);
  role.current = user?.role ?? null;

  useEffect(() => {
    installTelemetry();
    return installWindowErrorHandlers();
  }, []);

  // Wait for the session check so the view is attributed to the right user/role.
  useEffect(() => {
    if (loading) return;
    const { section, route_template } = routeInfo(pathname);
    const now = Date.now();
    const prev = previous.current;
    if (prev && prev.section === section && now - prev.at < PAGE_VIEW_DEDUPE_MS) return;
    track("page_viewed", {
      section,
      route_template,
      referrer_section: prev?.section ?? null,
      actor_role: role.current,
    });
    previous.current = { section, at: now };
  }, [pathname, loading]);

  useReportWebVitals((metric) => {
    if (!VITALS.has(metric.name)) return;
    if (sampled.current === null) sampled.current = vitalsSampled();
    if (!sampled.current) return;
    track("page_load_recorded", {
      section: routeInfo(window.location.pathname).section,
      metric: metric.name,
      value: Math.max(0, Math.round(metric.value * 1000) / 1000),
      rating: metric.rating,
      device_type: deviceType(),
    });
  });

  return <>{children}</>;
}
