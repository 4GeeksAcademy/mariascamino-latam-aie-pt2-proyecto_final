import { statusLabel } from "@/lib/labels";
import type { CandidateStatus } from "@/types/candidate";

const STATUS_STYLES: Record<CandidateStatus, string> = {
  received: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  selected: "bg-green-100 text-green-700",
  discarded: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: CandidateStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {statusLabel(status)}
    </span>
  );

}