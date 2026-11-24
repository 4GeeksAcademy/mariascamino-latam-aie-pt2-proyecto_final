/**
 * Form funnel events (Navegación / UX): form_started, form_submitted,
 * form_abandoned and form_validation_failed.
 *
 * A FormTracker follows ONE form instance. Only field NAMES and counts are
 * ever sent — never what was typed. The registry of started forms lets the
 * session layer close the funnel with exit_type "session_expired", and the
 * pagehide hook with "tab_closed", before the final sendBeacon flush.
 */
import { onPageHide, track } from "./telemetry";
import type { Section } from "./telemetry-domain";

export type FormId =
  | "inbound_order"
  | "outbound_order"
  | "product_create"
  | "supplier_create"
  | "incident_create"
  | "login"
  | "register"
  | "forgot_password"
  | "reset_password"
  | "change_password"
  | "profile_edit";

export type ExitType = "navigation" | "tab_closed" | "session_expired";

const active = new Set<FormTracker>();

/** Field names as the schema wants them (`^[a-z_]{1,40}$`), unique, max 30. */
function cleanNames(names: string[]): string[] {
  return [...new Set(names.filter((n) => /^[a-z_]{1,40}$/.test(n)))].slice(0, 30);
}

export class FormTracker {
  private startedAt: number | null = null;
  private lastField: string | null = null;
  private errorsBeforeSubmit = 0;
  private values: Record<string, unknown> = {};
  private removePageHide: (() => void) | null = null;

  constructor(
    readonly formId: FormId,
    readonly section: Section,
    readonly fieldsTotal: number,
    private readonly now: () => number = () => Date.now()
  ) {}

  get started(): boolean {
    return this.startedAt !== null;
  }

  /** Call from every onChange. The first one emits form_started. */
  fieldChanged(field: string, values: Record<string, unknown>): void {
    this.values = values;
    this.lastField = /^[a-z_]{1,40}$/.test(field) ? field : this.lastField;
    if (this.startedAt !== null) return;
    this.startedAt = this.now();
    active.add(this);
    this.removePageHide = onPageHide(() => this.abandon("tab_closed"));
    track("form_started", { form_id: this.formId, section: this.section });
  }

  /** Errors shown to the user: client-side checks or a 400/422 from the API. */
  validationFailed(errors: Record<string, string | undefined>, side: "client" | "server"): void {
    const fields = cleanNames(Object.keys(errors).filter((k) => errors[k]));
    if (!fields.length) return;
    this.errorsBeforeSubmit += 1;
    track("form_validation_failed", {
      form_id: this.formId,
      field_names: fields,
      error_codes: fields.map((f) => errorCode(errors[f] ?? "")),
      validation_side: side,
    });
  }

  /** The API accepted the form (2xx). The tracker is reset for the next entry. */
  submitted(): void {
    track("form_submitted", {
      form_id: this.formId,
      section: this.section,
      time_to_submit_ms: this.startedAt === null ? 0 : Math.max(0, this.now() - this.startedAt),
      validation_errors_before_submit: this.errorsBeforeSubmit,
    });
    this.reset();
  }

  /** Started but never submitted: navigation away, tab closed or session expired. */
  abandon(exitType: ExitType): void {
    if (this.startedAt === null) return;
    const filled = Object.values(this.values).filter((v) => v !== "" && v !== null && v !== undefined).length;
    track("form_abandoned", {
      form_id: this.formId,
      section: this.section,
      last_field: this.lastField,
      fields_completed: Math.min(filled, this.fieldsTotal),
      fields_total: this.fieldsTotal,
      time_spent_ms: Math.max(0, this.now() - this.startedAt),
      exit_type: exitType,
    });
    this.reset();
  }

  private reset(): void {
    this.startedAt = null;
    this.lastField = null;
    this.errorsBeforeSubmit = 0;
    this.values = {};
    this.removePageHide?.();
    this.removePageHide = null;
    active.delete(this);
  }
}

/** The form with unsaved input when the session expired, if any. */
export function startedForm(): FormTracker | null {
  return [...active][0] ?? null;
}

export function abandonStartedForms(exitType: ExitType): void {
  for (const tracker of [...active]) tracker.abandon(exitType);
}

/**
 * Error code from the message shown next to a field (the UI's messages are
 * the only thing the form knows). Values never leave the browser: the code is
 * a fixed label such as `missing` or `greater_than`.
 */
export function errorCode(message: string): string {
  const m = message.toLowerCase();
  if (/insufficient|only \d+ (are )?available|exceed/.test(m)) return "insufficient_stock";
  if (/required|obligatorio|select|enter|choose/.test(m)) return "missing";
  if (/already exists|duplicate|ya existe/.test(m)) return "duplicate";
  if (/greater than|at least|too small|pequeño|mayor/.test(m)) return "greater_than";
  if (/too long|largo/.test(m)) return "string_too_long";
  if (/email/.test(m)) return "invalid_email";
  return "invalid";
}
