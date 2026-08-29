import { apiFetch, apiDownload } from "./http";
import type { AnalysisResult } from "@/types/incident";

/**
 * POST /api/incidents/analyze
 * Sube un archivo CSV al backend y devuelve el resumen del análisis.
 */
export async function analyzeIncidents(file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<AnalysisResult>("/api/incidents/analyze", {
    method: "POST",
    body: formData,
    // No establecemos Content-Type manualmente: fetch lo fija a
    // multipart/form-data con el boundary correcto cuando el body es FormData.
  });
}

/**
 * GET /api/incidents/results/export
 * Descarga el último análisis como archivo CSV.
 */
export async function exportResults(): Promise<Blob> {
  return apiDownload("/api/incidents/results/export");
}