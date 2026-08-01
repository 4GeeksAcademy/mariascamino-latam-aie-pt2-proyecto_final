import Link from "next/link";

// ─── Sidebar navigation items ────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: "Gestión",
    items: [
      { href: "/", label: "Dashboard", icon: "□" },
      { href: "/citas", label: "Citas", icon: "◎" },
      { href: "/pacientes", label: "Pacientes", icon: "●" },
      { href: "/clinicas", label: "Clínicas", icon: "■" },
    ],
  },
  {
    label: "Reportes",
    items: [
      { href: "/reportes", label: "Reportes", icon: "△" },
      { href: "/metricas", label: "Métricas", icon: "◇" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/usuarios", label: "Usuarios", icon: "○" },
      { href: "/ajustes", label: "Ajustes", icon: "⚙" },
    ],
  },
];

// ─── Sidebar component ───────────────────────────────────────────────────────
function Sidebar() {
  return (
    <aside
      className="flex h-full w-60 flex-col border-r border-slate-200 bg-white"
      aria-label="Panel de navegación del backoffice"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 64 64"
          role="img"
          aria-label="HealthCore"
          className="h-8 w-8 shrink-0"
        >
          <circle cx="32" cy="32" r="30" fill="#0f766e" />
          <path d="M32 18v28M18 32h28" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <div>
          <p className="text-sm font-bold leading-tight text-teal-800">
            HealthCore
          </p>
          <p className="text-[11px] text-slate-500">Backoffice</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación del dashboard">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
                  >
                    <span className="w-4 text-center text-xs" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 px-4 py-3">
        <a
          href="http://localhost:3001"
          className="block rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
        >
          ← Volver al sitio público
        </a>
      </div>
    </aside>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-5">
      <p className="text-sm font-semibold text-slate-700">Dashboard</p>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>Admin</span>
        <span className="inline-block h-6 w-px bg-slate-200" aria-hidden="true" />
        <span>
          Hoy,{" "}
          {new Date().toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
    </header>
  );
}

// ─── Dashboard Layout ────────────────────────────────────────────────────────
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}