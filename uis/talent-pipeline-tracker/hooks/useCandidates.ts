"use client";

import { useEffect, useState } from "react";
import { fetchCandidates, type CandidateFilters } from "@/lib/api";
import { ApiError } from "@/lib/http";
import type { Candidate } from "@/types/candidate";

type FetchState = "loading" | "success" | "error";

export function useCandidates(filters: CandidateFilters) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<FetchState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      setError(null);
      try {
        const response = await fetchCandidates(filters);
        if (cancelled) return;
        setCandidates(response.data);
        setTotal(response.total);
        setState("success");
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "No se pudo cargar la lista de candidatos."
        );
        setState("error");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.stage, filters.search]);

  return { candidates, total, state, error };
}