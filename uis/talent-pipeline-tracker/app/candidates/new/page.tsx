"use client";

import { useRouter } from "next/navigation";
import { CandidateForm } from "@/components/CandidateForm";
import { createCandidate } from "@/lib/api";
import type { CandidateInput } from "@/types/candidate";

export default function NewCandidatePage() {
  const router = useRouter();

  async function handleSubmit(values: CandidateInput) {
    const created = await createCandidate(values);
    router.push(`/candidates/${created.id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Nuevo candidato</h1>
      <CandidateForm onSubmit={handleSubmit} submitLabel="Crear candidato" />
    </div>
  );
}
