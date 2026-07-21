import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { StageBadge } from "./StageBadge";
import type { Candidate } from "@/types/candidate";

export function CandidateTable({ candidates }: { candidates: Candidate[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-slate-500">
          <th className="py-2 pr-4 font-medium">Nombre</th>
          <th className="py-2 pr-4 font-medium">Posición</th>
          <th className="py-2 pr-4 font-medium">Estado</th>
          <th className="py-2 pr-4 font-medium">Etapa</th>
          <th className="py-2 pr-4 font-medium">Experiencia</th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((candidate) => (
          <tr key={candidate.id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-2 pr-4">
              <Link
                href={`/candidates/${candidate.id}`}
                className="font-medium text-slate-900 hover:underline"
              >
                {candidate.full_name}
              </Link>
            </td>
            <td className="py-2 pr-4 text-slate-600">{candidate.position}</td>
            <td className="py-2 pr-4">
              <StatusBadge status={candidate.status} />
            </td>
            <td className="py-2 pr-4">
              <StageBadge stage={candidate.stage} />
            </td>
            <td className="py-2 pr-4 text-slate-600">{candidate.experience_years} años</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}