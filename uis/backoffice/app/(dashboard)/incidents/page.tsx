"use client";

import { useState, useCallback } from "react";
import { analyzeIncidents, exportResults } from "@/lib/api";
import { IncidentUpload } from "@/components/IncidentUpload";
import { IncidentSummary } from "@/components/IncidentSummary";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import type { AnalysisResult } from "@/types/incident";

type PageState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "success"; result: AnalysisResult };

export default function IncidentsPage() {
  const [state, setState] = useState<PageState>({ phase: "idle" });
  const [isDownloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (file: File) => {
    setState({ phase: "loading" });
    setDownloadError(null);

    try {
      const result = await analyzeIncidents(file);
      setState({ phase: "success", result });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error de red — verifica que el backend esté corriendo.";
      setState({ phase: "error", message });
    }
  }, []);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadError(null);

    try {
      const blob = await exportResults();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "results.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo descargar el archivo.";
      setDownloadError(message);
    } finally {
      setDownloading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setState({ phase: "idle" });
    setDownloadError(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-lg font-bold text-slate-800">Incident Analyzer</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sube un archivo CSV con reportes de incidentes de pacientes para obtener un
          resumen estructurado con validación, desgloses e índice de satisfacción.
        </p>
      </div>

      {/* Upload (visible always) */}
      <IncidentUpload
        onFileSelected={handleFileSelected}
        isLoading={state.phase === "loading"}
      />

      {/* Estados */}
      {state.phase === "loading" && <LoadingState label="Analizando archivo..." />}

      {state.phase === "error" && (
        <ErrorState message={state.message} onRetry={handleRetry} />
      )}

      {state.phase === "success" && (
        <IncidentSummary
          result={state.result}
          onDownload={handleDownload}
          isDownloading={isDownloading}
          downloadError={downloadError}
        />
      )}

      {state.phase === "idle" && (
        <EmptyState message="Selecciona o arrastra un archivo CSV para comenzar el análisis." />
      )}
    </div>
  );
}