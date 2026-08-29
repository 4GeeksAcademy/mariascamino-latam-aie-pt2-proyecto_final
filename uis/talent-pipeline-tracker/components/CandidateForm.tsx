"use client";

import { useState, type FormEvent } from "react";
import type { CandidateInput } from "@/types/candidate";

interface CandidateFormProps {
  initialValues?: CandidateInput;
  onSubmit: (values: CandidateInput) => Promise<void>;
  submitLabel?: string;
}

const EMPTY_VALUES: CandidateInput = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  linkedin_url: "",
  cv_url: "",
  experience_years: 0,
};

export function CandidateForm({
  initialValues = EMPTY_VALUES,
  onSubmit,
  submitLabel = "Guardar",
}: CandidateFormProps) {
  const [values, setValues] = useState<CandidateInput>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CandidateInput>(key: K, value: CandidateInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el candidato.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Nombre completo</label>
        <input
          type="text"
          required
          value={values.full_name}
          onChange={(e) => updateField("full_name", e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          required
          value={values.email}
          onChange={(e) => updateField("email", e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Teléfono</label>
        <input
          type="tel"
          required
          value={values.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Posición</label>
        <input
          type="text"
          required
          value={values.position}
          onChange={(e) => updateField("position", e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Años de experiencia</label>
        <input
          type="number"
          min={0}
          required
          value={values.experience_years}
          onChange={(e) => updateField("experience_years", Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">LinkedIn (opcional)</label>
        <input
          type="url"
          value={values.linkedin_url ?? ""}
          onChange={(e) => updateField("linkedin_url", e.target.value || null)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">CV (URL, opcional)</label>
        <input
          type="url"
          value={values.cv_url ?? ""}
          onChange={(e) => updateField("cv_url", e.target.value || null)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}