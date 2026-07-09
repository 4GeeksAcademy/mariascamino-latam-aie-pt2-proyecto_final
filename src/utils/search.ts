import { Claim, Clinician } from "../types";

export function findClaimById(claims: Claim[], claimId: string): Claim | null {
  for (let i = 0; i < claims.length; i++) {
    if (claims[i].claimId === claimId) {
      return claims[i];
    }
  }
  return null;
}

export function findClinicianById(clinicians: Clinician[], clinicianId: string): Clinician | null {
  for (let i = 0; i < clinicians.length; i++) {
    if (clinicians[i].clinicianId === clinicianId) {
      return clinicians[i];
    }
  }
  return null;
}

export function binarySearchClaimById(sortedClaims: Claim[], targetId: string): number {
  let low = 0;
  let high = sortedClaims.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (sortedClaims[mid].claimId === targetId) {
      return mid;
    } else if (sortedClaims[mid].claimId < targetId) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}