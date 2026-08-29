import type { AnalysisResult } from "@/types/incident";
import { InvalidBreakdown } from "./InvalidBreakdown";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { StatusBreakdown } from "./StatusBreakdown";
import { SatisfactionIndex } from "./SatisfactionIndex";
import { ErrorState } from "./ErrorState";

interface IncidentSummaryProps {
  result: AnalysisResult;
  onDownload: () => void;
  isDownloading: boolean;
  downloadError: string | null;
}

export function IncidentSummary({
  result,
  onDownload,
  isDownloading,
  downloadError,
}: IncidentSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Totales */}
      <section aria-labelledby="totals-heading">
        <h2 id="totals-heading" className="mb-3 text-sm font-semibold text-slate-700">
          Totales
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-2xl font-bold text-slate-800">{result.total_records}</p>
            <p className="text-xs text-slate-500">Total registros</p>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-2xl font-bold text-green-700">{result.valid_records}</p>
            <p className="text-xs text-slate-500">Válidos</p>
          </div>
          <div
            className={`rounded-lg p-4 text-center shadow-sm ring-1 ${
              result.invalid_records > 0
                ? "bg-red-50 ring-red-200"
                : "bg-white ring-slate-200"
            }`}
          >
            <p className="text-2xl font-bold text-red-700">{result.invalid_records}</p>
            <p className="text-xs text-slate-500">Inválidos</p>
          </div>
        </div>
        {result.source_file && (
          <p className="mt-2 text-xs text-slate-400">
            Archivo: <span className="font-medium text-slate-600">{result.source_file}</span>
          </p>
        )}
      </section>

      <hr className="border-slate-200" />

      {/* Invalid breakdown */}
      {result.invalid_records > 0 && (
        <>
          <InvalidBreakdown
            data={result.invalid_breakdown}
            totalRecords={result.total_records}
          />
          <hr className="border-slate-200" />
        </>
      )}

      {/* Category breakdown */}
      <CategoryBreakdown data={result.category_breakdown} />
      <hr className="border-slate-200" />

      {/* Status & Country side by side */}
      <div className="grid gap-6 md:grid-cols-2">
        <StatusBreakdown data={result.status_breakdown} />
        <CountryBreakdown data={result.country_breakdown} />
      </div>
      <hr className="border-slate-200" />

      {/* Satisfaction */}
      <SatisfactionIndex data={result.satisfaction} />

      {/* Download */}
      <div>
        {downloadError && (
          <div className="mb-3">
            <ErrorState message={downloadError} onRetry={onDownload} />
          </div>
        )}
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDownloading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Descargando...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download results as CSV
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function CountryBreakdown({
  data,
}: {
  data: AnalysisResult["country_breakdown"];
}) {
  return (
    <section aria-labelledby="country-heading">
      <h3 id="country-heading" className="mb-3 text-sm font-semibold text-slate-700">
        Desglose por país
      </h3>
      <div className="space-y-2">
        {data.map((item) => (
          <div
            key={item.country}
            className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
          >
            <span className="text-sm font-medium text-slate-700">
              {item.country === "US" ? "🇺🇸 Estados Unidos" : "🇬🇧 Reino Unido"}
            </span>
            <span className="text-sm tabular-nums text-slate-500">
              {item.count}{" "}
              <span className="text-slate-400">({item.percentage.toFixed(1)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}