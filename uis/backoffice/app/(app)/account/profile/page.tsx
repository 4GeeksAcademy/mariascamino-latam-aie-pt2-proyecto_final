"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { apiFetch } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth-context";

type FormState = { name: string; phone: string; address: string };

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  user: "Usuario",
};

export default function ProfilePage() {
  const { user, refresh } = useAuth();

  const [form, setForm] = useState<FormState>({ name: "", phone: "", address: "" });
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Precargamos el formulario con los datos que ya trae GET /auth/me, una
  // sola vez (para no pisar lo que el usuario esté escribiendo si refresh()
  // se vuelve a llamar después de guardar).
  useEffect(() => {
    if (user && !initialized) {
      setForm({
        name: user.profile?.name ?? "",
        phone: user.profile?.phone ?? "",
        address: user.profile?.address ?? "",
      });
      setInitialized(true);
    }
  }, [user, initialized]);

  if (!user) {
    // El layout guardián del grupo (app) ya se encarga de redirigir; esto es
    // solo para que TypeScript sepa que de aquí en adelante `user` existe.
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const res = await apiFetch("/profiles/me", {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || `No se pudo actualizar el perfil (código ${res.status}).`);
      }
      await refresh();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mi perfil</h1>
        <p className="text-sm text-slate-600">
          {user.email} · {roleLabel[user.role] ?? user.role}
        </p>
        <p className="mt-1 text-sm">
          <Link href="/account/change-password" className="font-medium text-slate-900 underline">
            Cambiar mi contraseña
          </Link>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
      >
        <div>
          <label className="block text-xs font-medium text-slate-500">Nombre</label>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Teléfono</label>
          <input
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Dirección</label>
          <input
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {success && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Perfil actualizado.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
