"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CandidateForm } from "./CandidateForm";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { fetchCandidate, replaceCandidate } from "@/lib/api";
import { ApiError } from "@/lib/http";
import type { Candidate, CandidateInput } from "@/types/candidate";

type FetchState = "loading" | "success" | "error";

function toInput(candidate: Candidate): CandidateInput {
  return {
    full_name: candidate.full_name,
    email: candidate.email,
    phone: candidate.phone,
    position: candidate.position,
    linkedin_url: candidate.linkedin_url,
    cv_url: candidate.cv_url,
    experience_years: candidate.experience_years,
  };
}

export function EditCandidateView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [state, setState] = useState<FetchState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState("loading");
      try {
        const data = await fetchCandidate(id);
        if (!cancelled) {
          setCandidate(data);
          setState("success");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "No se pudo cargar el candidato.");
          setState("error");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(values: CandidateInput) {
    await replaceCandidate(id, values);
    router.push(`/candidates/${id}`);
  }

  if (state === "loading") return <LoadingState label="Cargando candidato..." />;
  if (state === "error") return <ErrorState message={error ?? "Ocurrió un error."} />;
  if (!candidate) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Editar candidato</h1>
      <CandidateForm
        initialValues={toInput(candidate)}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
