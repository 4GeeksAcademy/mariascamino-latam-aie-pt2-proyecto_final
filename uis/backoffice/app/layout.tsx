import type { Metadata } from "next";
import "./globals.css";

import Nav from "../components/Nav";
import { AuthProvider } from "../lib/auth-context";

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
        <AuthProvider>
          <header className="border-b border-slate-200 bg-white">
            <Nav />
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
