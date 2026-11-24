"use client";

import { useEffect, useRef } from "react";

import { FormTracker, type FormId } from "../lib/form-telemetry";
import type { Section } from "../lib/telemetry-domain";

/**
 * One FormTracker per mounted form. Unmounting a started, unsent form (the
 * user navigated away) emits form_abandoned with exit_type "navigation".
 */
export function useFormTelemetry(formId: FormId, section: Section, fieldsTotal: number): FormTracker {
  const ref = useRef<FormTracker | null>(null);
  if (ref.current === null) ref.current = new FormTracker(formId, section, fieldsTotal);
  const tracker = ref.current;

  useEffect(() => {
    return () => tracker.abandon("navigation");
  }, [tracker]);

  return tracker;
}
