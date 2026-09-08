"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

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
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <p className="text-sm text-slate-400">Cargando…</p>;
  }

  if (!user) {
    // A punto de redirigir (efecto de arriba); no mostramos nada protegido.
    return null;
  }

  return <>{children}</>;
}
