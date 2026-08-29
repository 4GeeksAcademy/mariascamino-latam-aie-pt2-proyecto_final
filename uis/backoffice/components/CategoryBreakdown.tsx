import type { AnalysisResult } from "@/types/incident";
import { CATEGORY_COLORS, type Category } from "@/types/incident";

interface CategoryBreakdownProps {
  data: AnalysisResult["category_breakdown"];
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <section aria-labelledby="category-heading">
      <h3 id="category-heading" className="mb-3 text-sm font-semibold text-slate-700">
        Desglose por categoría
      </h3>
      <div className="space-y-2.5">
        {data.map((item) => {
          const barColor =
            CATEGORY_COLORS[item.category as Category] ?? "bg-slate-400";
          const widthPct = (item.count / maxCount) * 100;

          return (
            <div key={item.category} className="grid grid-cols-[140px_1fr_60px] items-center gap-2 text-sm">
              <span className="truncate text-xs font-medium text-slate-600">
                {item.category.replace(/_/g, " ")}
              </span>
              <div className="h-5 w-full rounded bg-slate-100">
                <div
                  className={`h-5 rounded ${barColor} transition-all`}
                  style={{ width: `${widthPct}%` }}
                  role="progressbar"
                  aria-valuenow={item.count}
                  aria-valuemin={0}
                  aria-valuemax={maxCount}
                  aria-label={`${item.category}: ${item.count} incidentes`}
                />
              </div>
              <span className="text-right text-xs tabular-nums text-slate-500">
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