"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCandidate } from "@/hooks/useCandidate";
import { StatusBadge } from "./StatusBadge";
import { StageBadge } from "./StageBadge";
import { NotesPanel } from "./NotesPanel";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { STATUS_OPTIONS, STAGE_OPTIONS } from "@/lib/labels";

export function CandidateDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const {
    candidate,
    notes,
    state,
    error,
    updateStatus,
    updateStage,
    createNote,
    removeNote,
  } = useCandidate(id);

  if (state === "loading") return <LoadingState label="Cargando candidato..." />;
  if (state === "error") return <ErrorState message={error ?? "Ocurrió un error."} />;
  if (!candidate) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{candidate.full_name}</h1>
          <p className="text-sm text-slate-500">{candidate.position}</p>
        </div>
        <Link
          href={`/candidates/${candidate.id}/edit`}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500">Email</p>
          <p className="text-slate-900">{candidate.email}</p>
        </div>
        <div>
          <p className="text-slate-500">Teléfono</p>
          <p className="text-slate-900">{candidate.phone}</p>
        </div>
        <div>
          <p className="text-slate-500">Experiencia</p>
          <p className="text-slate-900">{candidate.experience_years} años</p>
        </div>
        <div>
          <p className="text-slate-500">Aplicó el</p>
          <p className="text-slate-900">
            {new Date(candidate.applied_at).toLocaleDateString()}
          </p>
        </div>
       {candidate.linkedin_url && (
          <div>
            <p className="text-slate-500">LinkedIn</p>
            <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              Ver perfil
            </a>
          </div>
        )}
        {candidate.cv_url && (
          <div>
            <p className="text-slate-500">CV</p>
            <a href={candidate.cv_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              Ver CV
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Estado:</span>
          <StatusBadge status={candidate.status} />
          <select
            value={candidate.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Etapa:</span>
          <StageBadge stage={candidate.stage} />
          <select
            value={candidate.stage}
            onChange={(e) => updateStage(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {STAGE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Notas ({candidate.notes_count})
        </h2>
        <NotesPanel notes={notes} onAdd={createNote} onDelete={removeNote} />
      </div>
    </div>
  );
}