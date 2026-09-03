import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">HealthCore Digital — Backoffice</h1>
      <p className="text-slate-600">
        Panel interno para el equipo de HealthCore Digital.
      </p>
      <Link
        href="/suppliers"
        className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Ir al Directorio de Proveedores →
      </Link>
    </div>
  );
}