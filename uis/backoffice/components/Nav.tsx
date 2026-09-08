"use client";

import Link from "next/link";

import { useAuth } from "../lib/auth-context";

export default function Nav() {
  const { user, loading, logout } = useAuth();

  return (
    <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
      <span className="font-semibold text-slate-800">HealthCore Digital</span>
      <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
        Inicio
      </Link>
      {user && (
        <>
          <Link href="/suppliers" className="text-sm text-slate-600 hover:text-slate-900">
            Directorio de Proveedores
          </Link>
          <Link href="/account/profile" className="text-sm text-slate-600 hover:text-slate-900">
            Mi perfil
          </Link>
        </>
      )}

      <div className="ml-auto flex items-center gap-4">
        {loading ? null : user ? (
          <>
            <span className="text-sm text-slate-500">{user.email}</span>
            <button
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Registrarse
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
