import { requestJson } from "./api";

export type Row = Record<string, string | number | null>;

export type TelemetryReport = {
  period: { from: string; to: string };
  metrics: Record<string, Row[]>;
};

/** What each metric answers — shown as the subtitle of its card. */
export const METRIC_INFO: Record<string, { title: string; question: string; bar?: string }> = {
  events_per_day: {
    title: "Volume — technical events per day",
    question: "How many technical events does each service send per day, and of which type?",
    bar: "events",
  },
  error_share_per_day: {
    title: "Error rate per day",
    question: "Out of all technical events of the day, which fraction were errors?",
    bar: "error_rate",
  },
  error_rate_by_type: {
    title: "Errors by type and place",
    question: "Which errors happen, where, and how many times?",
    bar: "occurrences",
  },
  web_vitals_by_section: {
    title: "Latency — Core Web Vitals",
    question: "How fast do the backoffice pages load for real users? (ms; CLS has no unit)",
    bar: "good_rate",
  },
  auth_failure_rate: {
    title: "Login failure rate",
    question: "Of all login attempts each day, which fraction failed?",
    bar: "failure_rate",
  },
};

/** Builds the query string; empty values are left out so the API uses its defaults. */
export function reportPath(start?: string, end?: string): string {
  const params = new URLSearchParams();
  if (start) params.set("start_date", new Date(start).toISOString());
  if (end) params.set("end_date", new Date(end).toISOString());
  const qs = params.toString();
  return `/telemetry/report${qs ? `?${qs}` : ""}`;
}

export function getTelemetryReport(start?: string, end?: string): Promise<TelemetryReport> {
  return requestJson<TelemetryReport>(reportPath(start, end));
}

/** Rates (0..1) as percentages, other numbers with at most 2 decimals. */
export function formatCell(column: string, value: string | number | null): string {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number") return value;
  if (column.endsWith("_rate")) return `${(value * 100).toFixed(1)} %`;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
