import { Claim, Appointment, Clinician, Location, CMEReport, CMEStatus } from "../types";

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function daysBetween(fromStr: string, toStr: string): number {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

function getCycleEndDate(cmeYearStartDate: string): string {
  const start = new Date(cmeYearStartDate);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return end.toISOString().slice(0, 10);
}

// --- Denial rate ---

export function calculateDenialRate(claims: Claim[]): number {
  if (claims.length === 0) {
    throw new Error("Cannot calculate denial rate for an empty claims array");
  }
  const deniedCount = claims.filter((claim) => claim.status === "denied").length;
  return roundTo((deniedCount / claims.length) * 100, 2);
}

export function denialRateByPayer(claims: Claim[]): Record<string, number> {
  const byPayer = claims.reduce((groups, claim) => {
    if (!groups[claim.payerName]) groups[claim.payerName] = [];
    groups[claim.payerName].push(claim);
    return groups;
  }, {} as Record<string, Claim[]>);

  const result: Record<string, number> = {};
  for (const payerName in byPayer) {
    result[payerName] = calculateDenialRate(byPayer[payerName]);
  }
  return result;
}

export function denialRateByLocation(claims: Claim[]): Record<string, number> {
  const byLocation = claims.reduce((groups, claim) => {
    if (!groups[claim.locationId]) groups[claim.locationId] = [];
    groups[claim.locationId].push(claim);
    return groups;
  }, {} as Record<string, Claim[]>);

  const result: Record<string, number> = {};
  for (const locationId in byLocation) {
    result[locationId] = calculateDenialRate(byLocation[locationId]);
  }
  return result;
}

export function flagHighDenialPayers(claims: Claim[], threshold: number = 8): string[] {
  const rates = denialRateByPayer(claims);
  return Object.keys(rates).filter((payerName) => rates[payerName] > threshold);
}

// --- No-show cost/rate ---

export function calculateNoShowCost(appointments: Appointment[], location: Location, weekEndingDate: string): number {
  const noShows = appointments.filter((appointment) => {
    if (appointment.locationId !== location.locationId) return false;
    if (appointment.status !== "no_show") return false;
    const diff = daysBetween(appointment.scheduledDate, weekEndingDate);
    return diff >= 0 && diff <= 6;
  });

  const totalCost = noShows.reduce((sum, appointment) => {
    return sum + location.averageConsultationFee[appointment.serviceType];
  }, 0);

  return roundTo(totalCost, 2);
}

export function noShowRateByLocation(appointments: Appointment[]): Record<string, number> {
  const byLocation = appointments.reduce((groups, appointment) => {
    if (!groups[appointment.locationId]) groups[appointment.locationId] = [];
    groups[appointment.locationId].push(appointment);
    return groups;
  }, {} as Record<string, Appointment[]>);

  const result: Record<string, number> = {};
  for (const locationId in byLocation) {
    const group = byLocation[locationId];
    const noShowCount = group.filter((a) => a.status === "no_show").length;
    result[locationId] = roundTo((noShowCount / group.length) * 100, 2);
  }
  return result;
}

export function flagHighNoShowLocations(appointments: Appointment[], threshold: number = 20): string[] {
  const rates = noShowRateByLocation(appointments);
  return Object.keys(rates).filter((locationId) => rates[locationId] > threshold);
}

// --- CME compliance ---

export function generateCMEReport(clinicians: Clinician[], asOfDate: string): CMEReport[] {
  return clinicians.map((clinician) => {
    const cycleEndDate = getCycleEndDate(clinician.cmeYearStartDate);
    const daysRemainingInCycle = daysBetween(asOfDate, cycleEndDate);
    const totalCycleDays = daysBetween(clinician.cmeYearStartDate, cycleEndDate);
    const daysElapsed = daysBetween(clinician.cmeYearStartDate, asOfDate);
    const percentOfYearElapsed = totalCycleDays > 0 ? (daysElapsed / totalCycleDays) * 100 : 100;

    const hoursRemaining = Math.max(0, clinician.cmeHoursRequired - clinician.cmeHoursLogged);
    const percentComplete =
      clinician.cmeHoursRequired === 0
        ? 100
        : roundTo((clinician.cmeHoursLogged / clinician.cmeHoursRequired) * 100, 1);

    let complianceStatus: CMEStatus;
    if (clinician.cmeHoursLogged >= clinician.cmeHoursRequired) {
      complianceStatus = "complete";
    } else if (daysRemainingInCycle <= 0) {
      complianceStatus = "overdue";
    } else if (percentOfYearElapsed - percentComplete > 15) {
      complianceStatus = "at_risk";
    } else {
      complianceStatus = "on_track";
    }

    return {
      clinicianId: clinician.clinicianId,
      fullName: `${clinician.firstName} ${clinician.lastName}`,
      role: clinician.role,
      locationId: clinician.locationId,
      hoursRequired: clinician.cmeHoursRequired,
      hoursLogged: clinician.cmeHoursLogged,
      hoursRemaining,
      percentComplete,
      daysRemainingInCycle,
      complianceStatus,
      licenceExpiryDate: clinician.licenceExpiryDate,
      licenceDaysRemaining: daysBetween(asOfDate, clinician.licenceExpiryDate),
    };
  });
}

export function getCliniciansAtRisk(clinicians: Clinician[], asOfDate: string): Clinician[] {
  const atRiskIds = generateCMEReport(clinicians, asOfDate)
    .filter((report) => report.complianceStatus === "at_risk" || report.complianceStatus === "overdue")
    .map((report) => report.clinicianId);

  return clinicians.filter((clinician) => atRiskIds.includes(clinician.clinicianId));
}

export function getCliniciansWithExpiringLicences(
  clinicians: Clinician[],
  asOfDate: string,
  daysThreshold: number
): Clinician[] {
  return clinicians.filter((clinician) => {
    const daysRemaining = daysBetween(asOfDate, clinician.licenceExpiryDate);
    return daysRemaining >= 0 && daysRemaining <= daysThreshold;
  });
}