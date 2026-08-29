import type { AnalysisResult } from "@/types/incident";

interface InvalidBreakdownProps {
  data: AnalysisResult["invalid_breakdown"];
  totalRecords: number;
}

export function InvalidBreakdown({ data, totalRecords }: InvalidBreakdownProps) {
  const invalidTotal = data.reduce((acc, d) => acc + d.count, 0);
  if (invalidTotal === 0) return null;

  return (
    <section aria-labelledby="invalid-heading">
      <h3 id="invalid-heading" className="mb-3 text-sm font-semibold text-slate-700">
        Registros inválidos
      </h3>
      <div className="space-y-1.5">
        {data
          .filter((d) => d.count > 0)
          .map((item) => (
            <div
              key={item.rule}
              className="flex items-center justify-between rounded-md bg-red-50 px-3 py-1.5 text-sm"
            >
              <span className="text-red-800">{item.label}</span>
              <span className="tabular-nums text-red-600">{item.count}</span>
            </div>
          ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {invalidTotal} de {totalRecords} registros tienen al menos un problema.
      </p>
    </section>
  );
}