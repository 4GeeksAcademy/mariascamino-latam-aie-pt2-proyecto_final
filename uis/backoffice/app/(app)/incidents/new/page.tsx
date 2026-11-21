"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";

import {
  BRANCHES,
  CATEGORIES,
  IncidentApiError,
  ORIGINS,
  STATUSES,
  createIncident,
} from "../../../../lib/incidents";

type FormValues = {
  title: string;
  description: string;
  category: string;
  status: string;
  origin: string;
  branch: string;
};
type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = { title: "", description: "", category: "", status: "open", origin: "", branch: "" };
const REQUIRED: (keyof FormValues)[] = ["title", "description", "category", "origin", "branch"];
const LABELS: Record<keyof FormValues, string> = {
  title: "Title",
  description: "Description",
  category: "Category",
  status: "Status",
  origin: "Origin",
  branch: "Branch",
};

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none";

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function NewIncidentPage() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSuccess(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);

    // Client-side validation of required fields
    const clientErrors: FormErrors = {};
    for (const field of REQUIRED) {
      if (!values[field].trim()) clientErrors[field] = `${LABELS[field]} is required.`;
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      await createIncident({
        ...values,
        title: values.title.trim(),
        description: values.description.trim(),
      });
      setValues(EMPTY);
      setErrors({});
      setSuccess(true);
    } catch (err) {
      if (err instanceof IncidentApiError) {
        setErrors(err.fieldErrors as FormErrors);
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const reportingFromBranch = values.origin === "branch";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Log a new incident</h1>
      <p className="mb-6 text-sm text-slate-500">
        Anyone in the company can register an incident. All fields marked * are required.
      </p>

      {success && (
        <div role="status" className="mb-6 rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">Incident registered successfully.</p>
          <Link href="/incidents" className="underline">
            View all incidents
          </Link>
        </div>
      )}

      {formError && (
        <div role="alert" className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="Origin *" error={errors.origin}>
          <select className={inputClass} value={values.origin} onChange={(e) => update("origin", e.target.value)}>
            <option value="">Select an origin…</option>
            {ORIGINS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        {/* Highlighted when origin = branch */}
        <div
          className={
            reportingFromBranch
              ? "rounded-md border-2 border-amber-400 bg-amber-50 p-3"
              : "rounded-md border-2 border-transparent p-3"
          }
        >
          <Field label="Branch *" error={errors.branch}>
            <select className={inputClass} value={values.branch} onChange={(e) => update("branch", e.target.value)}>
              <option value="">Select a branch…</option>
              {BRANCHES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
          {reportingFromBranch && (
            <p className="mt-2 text-sm font-medium text-amber-800">
              You are reporting from a specific location. Make sure you pick your own branch.
            </p>
          )}
        </div>

        <Field label="Category *" error={errors.category}>
          <select className={inputClass} value={values.category} onChange={(e) => update("category", e.target.value)}>
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status" error={errors.status}>
          <select className={inputClass} value={values.status} onChange={(e) => update("status", e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        {/* Compliance requirement: prominent, before the free-text fields */}
        <div role="note" className="rounded-md border-2 border-red-500 bg-red-50 p-4 text-sm text-red-900">
          <p className="mb-1 text-base font-bold">⚠ Do not enter patient personal data</p>
          <p>
            Never type patient names, dates of birth, medical record numbers or contact details in the title or the
            description. If a patient is involved, refer to them only by an opaque internal identifier. This is a
            HIPAA / UK GDPR compliance requirement.
          </p>
        </div>

        <Field label="Title *" error={errors.title}>
          <input
            type="text"
            className={inputClass}
            value={values.title}
            maxLength={200}
            onChange={(e) => update("title", e.target.value)}
          />
        </Field>

        <Field label="Description *" error={errors.description}>
          <textarea
            rows={5}
            className={inputClass}
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Register incident"}
        </button>
      </form>
    </div>
  );
}
