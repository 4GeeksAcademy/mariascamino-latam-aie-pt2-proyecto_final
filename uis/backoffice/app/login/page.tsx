"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo conectar con la API. Intenta de nuevo.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
        <p className="text-sm text-slate-600">
          Accede al panel interno de HealthCore Digital.
        </p>
      </div>

      {justReset && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Tu contraseña fue actualizada. Ya puedes iniciar sesión.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
      >
        <div>
          <label className="block text-xs font-medium text-slate-500">Email</label>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-slate-500">Contraseña</label>
            <Link href="/forgot-password" className="text-xs font-medium text-slate-600 underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-medium text-slate-900 underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Cargando…</p>}>
      <LoginForm />
    </Suspense>
  );
}
