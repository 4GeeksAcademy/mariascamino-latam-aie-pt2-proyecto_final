import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-3 py-10 text-center">
      <h1 className="text-2xl font-semibold">No encontramos esa página</h1>
      <p className="text-sm text-slate-600">
        Es posible que el enlace esté mal escrito o que la página ya no exista.
      </p>
      <Link href="/" className="inline-block font-medium text-slate-900 underline">
        Volver al inicio
      </Link>
    </div>
  );
}
