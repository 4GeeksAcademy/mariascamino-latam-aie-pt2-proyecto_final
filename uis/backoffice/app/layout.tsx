import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthCore Backoffice",
  description: "Panel interno de HealthCore Digital",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
            <span className="font-semibold text-slate-800">HealthCore Digital</span>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
              Inicio
            </Link>
            <Link href="/suppliers" className="text-sm text-slate-600 hover:text-slate-900">
              Directorio de Proveedores
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}