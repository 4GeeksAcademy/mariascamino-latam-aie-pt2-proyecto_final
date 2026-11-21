"use client";

import ErrorState from "../components/ErrorState";

/**
 * Límite de errores de Next.js: si algo falla al renderizar una pantalla, la
 * persona ve esto en lugar de una página en blanco. No mostramos
 * `error.message` (puede contener detalles internos).
 */
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
