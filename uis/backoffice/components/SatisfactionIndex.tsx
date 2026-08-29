import type { AnalysisResult } from "@/types/incident";

interface SatisfactionIndexProps {
  data: AnalysisResult["satisfaction"];
}

export function SatisfactionIndex({ data }: SatisfactionIndexProps) {
  const maxDistCount = Math.max(...data.distribution.map((d) => d.count), 1);

  return (
    <section aria-labelledby="satisfaction-heading">
      <h3 id="satisfaction-heading" className="mb-3 text-sm font-semibold text-slate-700">
        Índice de satisfacción
      </h3>

      {/* Average score destacado */}
      <div className="mb-4 rounded-lg bg-teal-50 p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-600">
          Puntuación promedio
        </p>
        <p className="mt-1 text-3xl font-bold text-teal-800">
          {data.average_score.toFixed(2)}
          <span className="text-lg font-normal text-teal-500"> / 5.00</span>
        </p>
        <p className="mt-1 text-xs text-teal-600">
          {data.scored_cases} de {data.closed_cases} casos cerrados tienen puntuación
        </p>
      </div>

      {/* Distribución 1-5 */}
      <div className="space-y-1.5">
        {/* Labels de la escala */}
        {data.distribution.map((item) => {
          const widthPct = (item.count / maxDistCount) * 100;

          return (
            <div
              key={item.score}
              className="grid grid-cols-[110px_1fr_36px] items-center gap-2 text-sm"
            >
              <span className="text-xs text-slate-500">
                {item.score} — {item.label}
              </span>
              <div className="h-4 w-full rounded bg-slate-100">
                <div
                  className="h-4 rounded bg-teal-400 transition-all"
                  style={{ width: `${widthPct}%` }}
                  role="progressbar"
                  aria-valuenow={item.count}
                  aria-valuemin={0}
                  aria-valuemax={maxDistCount}
                  aria-label={`Score ${item.score}: ${item.count} casos`}
                />
              </div>
              <span className="text-right text-xs tabular-nums text-slate-500">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}