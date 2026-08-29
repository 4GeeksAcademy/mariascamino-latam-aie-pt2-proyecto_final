"use client";

import { useState, type FormEvent } from "react";
import type { CandidateNote } from "@/types/candidate";

interface NotesPanelProps {
  notes: CandidateNote[];
  onAdd: (content: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}

export function NotesPanel({ notes, onAdd, onDelete }: NotesPanelProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(content.trim());
      setContent("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Agregar una nota..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={submitting} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          Agregar
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no hay notas.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="flex items-start justify-between rounded-md border border-slate-200 p-3 text-sm">
              <div>
                <p className="text-slate-800">{note.content}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
              <button onClick={() => onDelete(note.id)} className="ml-4 text-xs text-red-600 hover:underline">
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}