import { stageLabel } from "@/lib/labels";
import type { CandidateStage } from "@/types/candidate";

const STAGE_STYLES: Record<CandidateStage, string> = {
  pending: "bg-slate-100 text-slate-700",
  review: "bg-indigo-100 text-indigo-700",
  personal_interview: "bg-amber-100 text-amber-700",
  technical_interview: "bg-purple-100 text-purple-700",
  offer_presented: "bg-emerald-100 text-emerald-700",
};

export function StageBadge({ stage }: { stage: CandidateStage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_STYLES[stage]}`}
    >
      {stageLabel(stage)}
    </span>
  );
}