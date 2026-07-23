import { Claim, Clinician } from "../types";

export function validateClaim(claim: Claim, knownLocationIds: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (claim.claimAmount <= 0) {
    errors.push("claimAmount must be greater than 0");
  }

  const today = new Date().toISOString().slice(0, 10);
  if (claim.submissionDate > today) {
    errors.push("submissionDate must not be a future date");
  }

  if (!knownLocationIds.includes(claim.locationId)) {
    errors.push("locationId must match one of the known clinic IDs");
  }

  if (claim.status === "denied" && !claim.denialReason) {
    errors.push("denialReason must be present when status is 'denied'");
  }

  const patientIdRegex = /^HC-[A-Za-z0-9]{6}$/;
  if (!patientIdRegex.test(claim.patientId)) {
    errors.push("patientId must match the format HC- followed by 6 alphanumeric characters");
  }

  return { valid: errors.length === 0, errors };
}

export function validateClinician(clinician: Clinician): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (clinician.cmeHoursRequired < 0) {
    errors.push("cmeHoursRequired must be >= 0");
  }
  if (clinician.cmeHoursLogged < 0) {
    errors.push("cmeHoursLogged must be >= 0");
  }

  const validRoles = ["physician", "nurse_practitioner", "nurse", "medical_assistant"];
  if (!validRoles.includes(clinician.role)) {
    errors.push("role must be one of the four defined values");
  }

  const today = new Date().toISOString().slice(0, 10);
  if (clinician.licenceExpiryDate < today) {
    errors.push("licenceExpiryDate is in the past — licence is expired");
  }

  return { valid: errors.length === 0, errors };
}

export function isDenialRateAboveThreshold(rate: number, threshold: number = 8): boolean {
  return rate > threshold;
}

export function isNoShowRateAboveThreshold(rate: number, threshold: number = 20): boolean {
  return rate > threshold;
}
