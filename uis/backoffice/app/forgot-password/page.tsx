"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { API_URL, ApiError, buildApiError } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        throw await buildApiError(res);
      }
      // La API siempre responde 200, exista o no la cuenta -- así diseñado
      // para no revelar qué emails están registrados. El mensaje que
      // mostramos es siempre el mismo, sin importar la respuesta.
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo conectar con la API. Intenta de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="text-sm text-slate-600">
          Ingresa tu email y, si tienes una cuenta, te mandamos un enlace para
          restablecer tu contraseña.
        </p>
      </div>

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
            disabled={submitted}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        {submitted && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Si ese correo está registrado, vas a recibir un enlace para
            restablecer tu contraseña en unos minutos.
          </p>
        )}
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || submitted}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitted ? "Enlace enviado" : submitting ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        <Link href="/login" className="font-medium text-slate-900 underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
