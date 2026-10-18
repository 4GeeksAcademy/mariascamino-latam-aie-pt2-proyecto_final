"use client";

/**
 * Último recurso: reemplaza TODO el layout si este mismo falla, por eso
 * incluye su propio <html> y <body> y no depende de ningún componente.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1.5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Algo salió mal</h1>
        <p style={{ marginTop: "0.5rem", color: "#475569" }}>
          La aplicación tuvo un problema inesperado. Puedes intentar de nuevo o contactar al
          equipo de soporte de HealthCore Digital si continúa.
        </p>
        <p style={{ marginTop: "1.25rem" }}>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", cursor: "pointer" }}
          >
            Reintentar
          </button>{" "}
          <a href="/" style={{ marginLeft: "0.75rem", textDecoration: "underline" }}>
            Volver al inicio
          </a>
        </p>
      </body>
    </html>
  );
}
