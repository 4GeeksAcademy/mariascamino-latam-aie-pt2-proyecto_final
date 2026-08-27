/** Tipos para el Incident Analyzer — refleja exactamente la respuesta JSON de POST /api/incidents/analyze. */

export interface InvalidBreakdownItem {
  rule: string;
  label: string;
  count: number;
}

export interface CategoryBreakdownItem {
  category: string;
  count: number;
  percentage: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
  percentage: number;
}

export interface CountryBreakdownItem {
  country: string;
  count: number;
  percentage: number;
}

export interface SatisfactionDistributionItem {
  score: number;
  label: string;
  count: number;
}

export interface SatisfactionData {
  scored_cases: number;
  closed_cases: number;
  average_score: number;
  distribution: SatisfactionDistributionItem[];
}

export interface AnalysisResult {
  source_file: string | null;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  invalid_breakdown: InvalidBreakdownItem[];
  category_breakdown: CategoryBreakdownItem[];
  status_breakdown: StatusBreakdownItem[];
  country_breakdown: CountryBreakdownItem[];
  satisfaction: SatisfactionData;
}

export type Category = "APPOINTMENT" | "BILLING" | "CLINICAL_CARE" | "ACCESSIBILITY" | "ADMINISTRATIVE";
export type IncidentStatus = "OPEN" | "CLOSED" | "DISCARDED";

/** Colores asociados a cada estado para la UI. */
export const STATUS_COLORS: Record<IncidentStatus, { bg: string; text: string; dot: string }> = {
  OPEN: { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-400" },
  CLOSED: { bg: "bg-green-50", text: "text-green-800", dot: "bg-green-400" },
  DISCARDED: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

/** Colores asociados a cada categoría para barras/gráficos. */
export const CATEGORY_COLORS: Record<Category, string> = {
  APPOINTMENT: "bg-blue-500",
  BILLING: "bg-amber-500",
  CLINICAL_CARE: "bg-red-500",
  ACCESSIBILITY: "bg-purple-500",
  ADMINISTRATIVE: "bg-teal-500",
};