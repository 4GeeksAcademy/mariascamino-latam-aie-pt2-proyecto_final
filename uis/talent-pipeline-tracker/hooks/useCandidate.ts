"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCandidate,
  fetchNotes,
  patchCandidate,
  addNote,
  deleteNote,
} from "@/lib/api";
import { ApiError } from "@/lib/http";
import type { Candidate, CandidateNote } from "@/types/candidate";

type FetchState = "loading" | "success" | "error";

export function useCandidate(id: string) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [candidateData, notesData] = await Promise.all([
        fetchCandidate(id),
        fetchNotes(id),
      ]);
      setCandidate(candidateData);
      setNotes(notesData);
      setState("success");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo cargar el candidato."
      );
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(newStatus: string) {
    const updated = await patchCandidate(id, { status: newStatus });
    setCandidate(updated);
  }

  async function updateStage(newStage: string) {
    const updated = await patchCandidate(id, { stage: newStage });
    setCandidate(updated);
  }

  async function createNote(content: string) {
    await addNote(id, content);
    const updatedNotes = await fetchNotes(id);
    setNotes(updatedNotes);
    setCandidate((prev) => (prev ? { ...prev, notes_count: updatedNotes.length } : prev));
  }

  async function removeNote(noteId: string) {
    await deleteNote(id, noteId);
    const updatedNotes = await fetchNotes(id);
    setNotes(updatedNotes);
    setCandidate((prev) => (prev ? { ...prev, notes_count: updatedNotes.length } : prev));
  }

  return {
    candidate,
    notes,
    state,
    error,
    updateStatus,
    updateStage,
    createNote,
    removeNote,
    reload: load,
  };
}