"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import ErrorState from "../../components/ErrorState";
import { useAuth } from "../../lib/auth-context";

/**
 * Guardián de rutas del backoffice.
 *
 * Todo lo que vive bajo el grupo (app) — Inicio, Directorio de Proveedores,
 * Mi perfil — requiere sesión. Este layout es un client component: revisa si
 * el AuthProvider ya resolvió un usuario (es decir, si hay un token válido
 * en localStorage) y, si no lo hay, redirige a /login.
 *
 * Nota: el middleware de Next.js corre en el servidor y no puede leer
 * localStorage, así que la protección de rutas tiene que hacerse en el
 * cliente, como aquí.
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, error, refresh } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !error) {
      router.replace("/login");
    }
  }, [loading, user, error, router]);

  if (loading) {
    return <p className="text-sm text-slate-400">Cargando…</p>;
  }

  if (error) {
    // No pudimos comprobar la sesión por un fallo de red/servidor: ofrecemos reintentar.
    return (
      <div className="mx-auto max-w-lg py-10">
        <ErrorState
          title="No pudimos cargar tu sesión"
          message={error}
          onRetry={() => {
            void refresh();
          }}
        />
      </div>
    );
  }

  if (!user) {
    // A punto de redirigir (efecto de arriba); no mostramos nada protegido.
    return null;
  }

  return <>{children}</>;
}
