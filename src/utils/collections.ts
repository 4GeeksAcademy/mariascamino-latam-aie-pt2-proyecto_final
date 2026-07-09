import { Claim, Appointment, AppointmentStatus } from "../types";

export function filterClaims(
  claims: Claim[],
  filters: Partial<Pick<Claim, "locationId" | "status" | "payerName" | "serviceType">>
): Claim[] {
  return claims.filter((claim) => {
    if (filters.locationId !== undefined && claim.locationId !== filters.locationId) return false;
    if (filters.status !== undefined && claim.status !== filters.status) return false;
    if (filters.payerName !== undefined && claim.payerName !== filters.payerName) return false;
    if (filters.serviceType !== undefined && claim.serviceType !== filters.serviceType) return false;
    return true;
  });
}

export function filterAppointmentsByStatus(appointments: Appointment[], status: AppointmentStatus[]): Appointment[] {
  return appointments.filter((appointment) => status.includes(appointment.status));
}

export function sortClaimsById(claims: Claim[], direction: "asc" | "desc"): Claim[] {
  return [...claims].sort((a, b) => {
    if (direction === "asc") {
      return a.claimId < b.claimId ? -1 : a.claimId > b.claimId ? 1 : 0;
    }
    return a.claimId > b.claimId ? -1 : a.claimId < b.claimId ? 1 : 0;
  });
}

export function sortAppointmentsByDate(appointments: Appointment[], direction: "asc" | "desc"): Appointment[] {
  return [...appointments].sort((a, b) => {
    if (direction === "asc") {
      return a.scheduledDate < b.scheduledDate ? -1 : a.scheduledDate > b.scheduledDate ? 1 : 0;
    }
    return a.scheduledDate > b.scheduledDate ? -1 : a.scheduledDate < b.scheduledDate ? 1 : 0;
  });
}

export function groupClaimsBy(
  claims: Claim[],
  key: "locationId" | "payerName" | "status" | "serviceType"
): Record<string, Claim[]> {
  return claims.reduce((groups, claim) => {
    const groupKey = claim[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(claim);
    return groups;
  }, {} as Record<string, Claim[]>);
}