"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

type FormState = {
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
};

const emptyForm: FormState = { email: "", password: "", name: "", phone: "", address: "" };

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    if (form.password.length < 8) {
      setFieldErrors({ password: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }

    setSubmitting(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        name: form.name || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
      });
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setFieldErrors(err.fields);
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("No se pudo conectar con la API. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>
        <p className="text-sm text-slate-600">
          Regístrate para acceder al panel interno de HealthCore Digital.
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
            value={form.email}
            onChange={update("email")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">
            Contraseña (mínimo 8 caracteres)
          </label>
          <input
            required
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">
            Nombre completo (opcional)
          </label>
          <input
            value={form.name}
            onChange={update("name")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Teléfono (opcional)</label>
          <input
            value={form.phone}
            onChange={update("phone")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Dirección (opcional)</label>
          <input
            value={form.address}
            onChange={update("address")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          {fieldErrors.address && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>
          )}
        </div>

        {formError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-slate-900 underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
