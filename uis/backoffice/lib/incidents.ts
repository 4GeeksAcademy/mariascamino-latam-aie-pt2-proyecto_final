import { apiFetch } from "./api";

export type Option = { value: string; label: string };

export const BRANCHES: Option[] = [
  { value: "central", label: "Central — Austin Main Clinic" },
  { value: "austin_north", label: "Austin — North" },
  { value: "dallas_uptown", label: "Dallas Uptown" },
  { value: "houston_med_center", label: "Houston Medical Center" },
  { value: "san_antonio_west", label: "San Antonio West" },
  { value: "miami_brickell", label: "Miami Brickell" },
  { value: "miami_doral", label: "Miami Doral" },
  { value: "orlando_east", label: "Orlando East" },
  { value: "tampa_bay", label: "Tampa Bay" },
  { value: "atlanta_midtown", label: "Atlanta Midtown" },
  { value: "savannah", label: "Savannah" },
  { value: "london_city", label: "London City" },
  { value: "london_west", label: "London West End" },
  { value: "manchester_central", label: "Manchester Central" },
];

export const CATEGORIES: Option[] = [
  { value: "clinical_equipment", label: "Clinical equipment" },
  { value: "it_system", label: "IT system" },
  { value: "billing_error", label: "Billing error" },
  { value: "compliance_breach", label: "Compliance breach" },
  { value: "patient_experience", label: "Patient experience" },
  { value: "staff_issue", label: "Staff issue" },
  { value: "facility_issue", label: "Facility issue" },
  { value: "referral_issue", label: "Referral issue" },
  { value: "other", label: "Other" },
];

export const STATUSES: Option[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "discarded", label: "Discarded" },
];

export const ORIGINS: Option[] = [
  { value: "customer", label: "Customer" },
  { value: "branch", label: "Branch" },
  { value: "internal", label: "Internal" },
];

// Same lifecycle rules as the API. resolved / discarded are final.
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress", "discarded"],
  in_progress: ["resolved", "discarded"],
  resolved: [],
  discarded: [],
};

export function labelOf(options: Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export type Incident = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  origin: string;
  branch: string;
  created_at: string;
  updated_at: string;
};

export type NewIncident = Omit<Incident, "id" | "created_at" | "updated_at">;

export type IncidentFilters = { status?: string; origin?: string; branch?: string };

export type IncidentSummary = {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
};

/** Error with a message that is safe to show to the user (never raw server text). */
export class IncidentApiError extends Error {
  status?: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status?: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "IncidentApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(path, init);
  } catch {
    throw new IncidentApiError("We couldn't reach the server. Check your connection and try again.");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);

    if (res.status === 400) {
      const fieldErrors: Record<string, string> = {};
      if (Array.isArray(data?.errors)) {
        for (const e of data.errors) {
          if (e?.field && e?.message) fieldErrors[String(e.field)] = String(e.message);
        }
      }
      const message = Object.values(fieldErrors).join(" ") || "Some of the data you sent is not valid.";
      throw new IncidentApiError(message, 400, fieldErrors);
    }
    if (res.status === 404) {
      throw new IncidentApiError("That incident could not be found. It may have been removed.", 404);
    }
    if (res.status === 403) {
      throw new IncidentApiError("You don't have permission to do that.", 403);
    }
    throw new IncidentApiError("Something went wrong on our side. Please try again in a moment.", res.status);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new IncidentApiError("We received an unexpected response from the server. Please try again.", res.status);
  }
}

export function listIncidents(filters: IncidentFilters = {}): Promise<Incident[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return request<Incident[]>(`/api/incidents${query ? `?${query}` : ""}`);
}

export function createIncident(payload: NewIncident): Promise<Incident> {
  return request<Incident>("/api/incidents", { method: "POST", body: JSON.stringify(payload) });
}

export function updateIncidentStatus(id: number, status: string): Promise<Incident> {
  return request<Incident>(`/api/incidents/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getIncidentSummary(): Promise<IncidentSummary> {
  return request<IncidentSummary>("/api/incidents/summary");
}
