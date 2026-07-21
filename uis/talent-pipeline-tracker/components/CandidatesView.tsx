"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCandidates } from "@/hooks/useCandidates";
import { Filters } from "./Filters";
import { CandidateTable } from "./CandidateTable";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";

export function CandidatesView() {
  const searchParams = useSearchParams();
  const filters = {
    status: searchParams.get("status") ?? undefined,
    stage: searchParams.get("stage") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  };

  const { candidates, total, state, error } = useCandidates(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Candidatos</h1>
        <Link
          href="/candidates/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Nuevo candidato
        </Link>
      </div>

      <Filters />

      {state === "loading" && <LoadingState label="Cargando candidatos..." />}
      {state === "error" && <ErrorState message={error ?? "Ocurrió un error."} />}
      {state === "success" && candidates.length === 0 && (
        <EmptyState message="No se encontraron candidatos con estos filtros." />
      )}
      {state === "success" && candidates.length > 0 && (
        <>
          <p className="text-sm text-slate-500">{total} candidato(s)</p>
          <CandidateTable candidates={candidates} />
        </>
      )}
    </div>
  );
}