import type { CandidateStatus, CandidateStage } from "@/types/candidate";

// Única fuente de verdad para las etiquetas visibles en pantalla.
// Los valores crudos del API (ej. "in_progress") nunca deben renderizarse
// directamente — siempre pasan por este mapa primero.
export const STATUS_LABELS: Record<CandidateStatus, string> = {
  received: "Recibido",
  in_progress: "En proceso",
  selected: "Seleccionado",
  discarded: "Descartado",
};

export const STAGE_LABELS: Record<CandidateStage, string> = {
  pending: "Pendiente de revision",
  review: "En revision",
  personal_interview: "Entrevista personal",
  technical_interview: "Entrevista tecnica",
  offer_presented: "Oferta presentada",
};

// Arrays de pares [valor_crudo, etiqueta] para armar <select> de filtros
// y formularios sin repetir los mismos strings en cada componente.
export const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [
  CandidateStatus,
  string,
][];

export const STAGE_OPTIONS = Object.entries(STAGE_LABELS) as [
  CandidateStage,
  string,
][];

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as CandidateStatus] ?? status;
}

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage as CandidateStage] ?? stage;
}