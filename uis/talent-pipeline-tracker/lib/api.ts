import { apiFetch } from "./http";
import type {
  Candidate,
  CandidateInput,
  CandidateNote,
  CandidatesListResponse,
  NotesListResponse,
} from "@/types/candidate";

export interface CandidateFilters {
  status?: string;
  stage?: string;
  search?: string;
}

export async function fetchCandidates(
  filters: CandidateFilters = {}
): Promise<CandidatesListResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.search) params.set("search", filters.search);
  // El API trae 20 resultados por página por defecto; pedimos un límite alto
  // para que el equipo de People vea a todos los candidatos en una sola pantalla,
  // tal como pide el encargo ("Show all candidates in a list").
  params.set("limit", "200");

  return apiFetch<CandidatesListResponse>(`/records?${params.toString()}`);
}

export async function fetchCandidate(id: string): Promise<Candidate> {
  return apiFetch<Candidate>(`/records/${id}`);
}

export async function createCandidate(payload: CandidateInput): Promise<Candidate> {
  return apiFetch<Candidate>(`/records`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function replaceCandidate(
  id: string,
  payload: CandidateInput
): Promise<Candidate> {
  return apiFetch<Candidate>(`/records/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function patchCandidate(
  id: string,
  payload: { status?: string; stage?: string }
): Promise<Candidate> {
  return apiFetch<Candidate>(`/records/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchNotes(id: string): Promise<CandidateNote[]> {
  const response = await apiFetch<NotesListResponse>(`/records/${id}/notes`);
  return response.data;
}

export async function addNote(id: string, content: string): Promise<CandidateNote> {
  return apiFetch<CandidateNote>(`/records/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function deleteNote(id: string, noteId: string): Promise<void> {
  return apiFetch<void>(`/records/${id}/notes/${noteId}`, {
    method: "DELETE",
  });
}