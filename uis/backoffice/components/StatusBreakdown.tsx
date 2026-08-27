import type { AnalysisResult } from "@/types/incident";
import { STATUS_COLORS, type IncidentStatus } from "@/types/incident";

interface StatusBreakdownProps {
  data: AnalysisResult["status_breakdown"];
}

export function StatusBreakdown({ data }: StatusBreakdownProps) {
  return (
    <section aria-labelledby="status-heading">
      <h3 id="status-heading" className="mb-3 text-sm font-semibold text-slate-700">
        Desglose por estado
      </h3>
      <div className="space-y-2">
        {data.map((item) => {
          const colors = STATUS_COLORS[item.status as IncidentStatus] ?? {
            bg: "bg-slate-100",
            text: "text-slate-700",
            dot: "bg-slate-400",
          };

          return (
            <div
              key={item.status}
              className={`flex items-center justify-between rounded-md px-3 py-2 ${colors.bg}`}
            >
              <span className={`flex items-center gap-2 text-sm font-medium ${colors.text}`}>
                <span
                  className={`inline-block h-2 w-2 rounded-full ${colors.dot}`}
                  aria-hidden="true"
                />
                {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
              </span>
              <span className="text-sm tabular-nums text-slate-500">
                {item.count}{" "}
                <span className="text-slate-400">({item.percentage.toFixed(1)}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}