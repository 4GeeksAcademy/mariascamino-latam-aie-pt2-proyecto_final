"use client";

import { useEffect } from "react";

import ErrorState from "../components/ErrorState";
import { reportFrontendError } from "../lib/error-telemetry";

/**
 * Límite de errores de Next.js: si algo falla al renderizar una pantalla, la
 * persona ve esto en lugar de una página en blanco. No mostramos
 * `error.message` (puede contener detalles internos).
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportFrontendError(error, "route");
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-10">
      <ErrorState
        title="Esta pantalla no se pudo mostrar"
        message="Ocurrió un problema inesperado. Puedes intentar de nuevo o volver al inicio."
        onRetry={reset}
      />
    </div>
  );
}
