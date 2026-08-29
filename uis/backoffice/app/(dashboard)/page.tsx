import {
  patientInquiries,
  sampleLocations,
  sampleClaims,
  sampleAppointments,
  sampleClinicians,
} from "../../../../src/data";
import {
  countByServiceType,
  averageAge,
  oldestPatientAge,
  youngestPatientAge,
} from "../../../../src/aggregations";
import { filterInquiries } from "../../../../src/filters";
import { validatePatientInquiry } from "../../../../src/validations";
import {
  calculateDenialRate,
  denialRateByPayer,
  flagHighDenialPayers,
  noShowRateByLocation,
  generateCMEReport,
  getCliniciansAtRisk,
  getCliniciansWithExpiringLicences,
} from "../../../../src/utils/transformations";
import { filterClaims } from "../../../../src/utils/collections";

// ─────────────────────────────────────────────────────────────────
//  Static computation — runs once at build time
// ─────────────────────────────────────────────────────────────────
const serviceBreakdown = countByServiceType(patientInquiries);
const totalInquiries = patientInquiries.length;
const avgAge = averageAge(patientInquiries).toFixed(1);
const oldest = oldestPatientAge(patientInquiries);
const youngest = youngestPatientAge(patientInquiries);

const insured = filterInquiries(patientInquiries, { hasInsurance: true }).length;
const uninsured = totalInquiries - insured;

const allValidations = patientInquiries.map((p) => ({
  name: `${p.firstName} ${p.lastName}`,
  errors: validatePatientInquiry(p),
}));
const validatedOk = allValidations.filter((v) => v.errors.length === 0).length;
const validatedErrors = allValidations.filter((v) => v.errors.length > 0).length;

const totalClaims = sampleClaims.length;
const denialRate = calculateDenialRate(sampleClaims);
const payersOverThreshold = flagHighDenialPayers(sampleClaims);
const denialByPayer = denialRateByPayer(sampleClaims);

const approvedClaims = filterClaims(sampleClaims, { status: "approved" });
const deniedClaims = filterClaims(sampleClaims, { status: "denied" });
const pendingClaims = filterClaims(sampleClaims, { status: "pending" });

const noShowRates = noShowRateByLocation(sampleAppointments);

const cmeReport = generateCMEReport(sampleClinicians, "2025-09-01");
const atRisk = getCliniciansAtRisk(sampleClinicians, "2025-09-01");
const expiringLicences = getCliniciansWithExpiringLicences(sampleClinicians, "2025-09-01", 90);

const locationName = Object.fromEntries(
  sampleLocations.map((l) => [l.locationId, l.name])
);

// ─────────────────────────────────────────────────────────────────
//  Page component
// ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <section aria-labelledby="dashboard-title" className="space-y-8">
      <div>
        <h1 id="dashboard-title" className="text-2xl font-bold text-slate-900">
          Dashboard — Backoffice
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Datos procesados con la lógica de negocio del Hito 2, importada directamente
          desde <code className="rounded bg-slate-200 px-1 text-xs">src/</code>.
        </p>
      </div>

      {/* ── row 1: Patient inquiries stats ── */}
      <section aria-labelledby="section-patients">
        <h2 id="section-patients" className="mb-3 text-lg font-semibold text-slate-800">
          Consultas de pacientes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total consultas" value={totalInquiries} />
          <StatCard label="Edad promedio" value={`${avgAge} años`} />
          <StatCard label="Paciente + veterano" value={oldest !== null ? `${oldest} años` : "—"} />
          <StatCard label="Paciente + joven" value={youngest !== null ? `${youngest} años` : "—"} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatCard label="Con seguro" value={insured} color="emerald" />
          <StatCard label="Sin seguro" value={uninsured} color="amber" />
          <StatCard
            label="Validaciones OK / Errores"
            value={`${validatedOk} / ${validatedErrors}`}
            color={validatedErrors === 0 ? "emerald" : "rose"}
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-4 py-3 font-medium">Servicio</th>
                <th className="px-4 py-3 font-medium">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(serviceBreakdown).map(([service, count]) => (
                <tr key={service} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{service}</td>
                  <td className="px-4 py-2.5 text-slate-600">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── row 2: Claims & Denial analysis ── */}
      <section aria-labelledby="section-claims">
        <h2 id="section-claims" className="mb-3 text-lg font-semibold text-slate-800">
          Reclamos (Claims) &amp; Denials
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Total claims" value={totalClaims} />
          <StatCard label="Tasa de denegación" value={`${denialRate}%`} color="rose" />
          <StatCard label="Aprobados" value={approvedClaims.length} color="emerald" />
          <StatCard label="Denegados" value={deniedClaims.length} color="rose" />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tasa por pagador
            </p>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="pb-1 pr-2 font-medium">Pagador</th>
                  <th className="pb-1 font-medium">Tasa</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(denialByPayer).map(([payer, rate]) => (
                  <tr key={payer} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 pr-2 text-slate-900">{payer}</td>
                    <td className="py-1.5 text-slate-600">{rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Alertas
            </p>
            {payersOverThreshold.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {payersOverThreshold.map((payer) => (
                  <li key={payer} className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-rose-800">
                    <span aria-hidden="true">⚠️</span> {payer} supera el umbral del 8%
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Ningún pagador supera el umbral.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── row 3: No-show rates ── */}
      <section aria-labelledby="section-noshow">
        <h2 id="section-noshow" className="mb-3 text-lg font-semibold text-slate-800">
          Inasistencias (No-show)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(noShowRates).map(([locId, rate]) => (
            <StatCard
              key={locId}
              label={locationName[locId] ?? locId}
              value={`${rate}%`}
              color={rate > 20 ? "rose" : rate > 10 ? "amber" : "emerald"}
            />
          ))}
        </div>
      </section>

      {/* ── row 4: CME compliance ── */}
      <section aria-labelledby="section-cme">
        <h2 id="section-cme" className="mb-3 text-lg font-semibold text-slate-800">
          Cumplimiento CME &amp; Licencias
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-4 py-3 font-medium">Clínico</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">% CME</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Licencia (días)</th>
              </tr>
            </thead>
            <tbody>
              {cmeReport.map((r) => (
                <tr key={r.clinicianId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.fullName}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.role}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.percentComplete}%</td>
                  <td className="px-4 py-2.5">
                    <CMEBadge status={r.complianceStatus} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {r.licenceDaysRemaining >= 0 ? `${r.licenceDaysRemaining}` : "Vencida"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {atRisk.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                ⚠️ Clínicos en riesgo ({atRisk.length})
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-700">
                {atRisk.map((c) => (
                  <li key={c.clinicianId}>
                    {c.firstName} {c.lastName} — {c.role}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {expiringLicences.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-800">
                ⚠️ Licencias por vencer ({expiringLicences.length})
              </p>
              <ul className="mt-2 space-y-1 text-sm text-rose-700">
                {expiringLicences.map((c) => (
                  <li key={c.clinicianId}>
                    {c.firstName} {c.lastName} — vence {c.licenceExpiryDate}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ── row 5: Validation samples ── */}
      <section aria-labelledby="section-validations">
        <h2 id="section-validations" className="mb-3 text-lg font-semibold text-slate-800">
          Validaciones
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Errores</th>
              </tr>
            </thead>
            <tbody>
              {allValidations.map((v) => (
                <tr key={v.name} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{v.name}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        v.errors.length === 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {v.errors.length === 0 ? "OK" : `${v.errors.length} error(es)`}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-2.5 text-xs text-slate-500">
                    {v.errors.length > 0 ? v.errors.join("; ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Small helper components
// ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color = "teal",
}: {
  label: string;
  value: string | number;
  color?: "teal" | "emerald" | "amber" | "rose" | "blue" | "indigo";
}) {
  const colorMap: Record<string, string> = {
    teal: "bg-teal-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-2 h-2 w-10 rounded-full ${colorMap[color]}`} aria-hidden="true" />
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </article>
  );
}

function CMEBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    complete: "bg-emerald-100 text-emerald-800",
    on_track: "bg-blue-100 text-blue-800",
    at_risk: "bg-amber-100 text-amber-800",
    overdue: "bg-rose-100 text-rose-800",
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
        styles[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}