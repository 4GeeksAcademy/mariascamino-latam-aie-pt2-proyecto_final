import Link from "next/link";

type ErrorStateProps = {
  /** Mensaje legible para la persona usuaria (nunca texto técnico). */
  message: string;
  /** Si se pasa, muestra el botón "Reintentar". */
  onRetry?: () => void;
  title?: string;
  /** Muestra el enlace de regreso al inicio (por defecto sí). */
  showHome?: boolean;
  /** Textos (español por defecto; las pantallas de incidentes están en inglés). */
  retryLabel?: string;
  homeLabel?: string;
  supportText?: string;
};

/**
 * Estado de error estándar: explica qué pasó y ofrece una salida clara
 * (reintentar, volver al inicio o contactar a soporte).
 */
export default function ErrorState({
  message,
  onRetry,
  title = "Algo salió mal",
  showHome = true,
  retryLabel = "Reintentar",
  homeLabel = "Volver al inicio",
  supportText = "Si el problema continúa, contacta al equipo de soporte de HealthCore Digital.",
}: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{message}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 font-medium text-red-800 hover:bg-red-100"
          >
            {retryLabel}
          </button>
        )}
        {showHome && (
          <Link href="/" className="font-medium underline">
            {homeLabel}
          </Link>
        )}
      </div>
      <p className="mt-3 text-xs text-red-700">{supportText}</p>
    </div>
  );
}
