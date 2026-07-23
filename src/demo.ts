import { patientInquiries } from "./data";
import { filterByServiceType, filterInquiries } from "./filters";
import { sortByPreferredDate, sortByClinicThenDate } from "./sorters";
import { linearSearchByEmail, binarySearchByPreferredDate } from "./search";
import { countByServiceType, averageAge, oldestPatientAge, youngestPatientAge, totalAge } from "./aggregations";
import { validatePatientInquiry } from "./validations";

console.log("=== Filtrado ===");
console.log(filterByServiceType(patientInquiries, "Mental Health"));
console.log(filterInquiries(patientInquiries, { hasInsurance: true, preferredClinic: "HealthCore Miami" }));

console.log("=== Ordenamiento ===");
console.log(sortByPreferredDate(patientInquiries, "asc").map((i) => i.preferredDate));
console.log(sortByClinicThenDate(patientInquiries, "asc").map((i) => `${i.preferredClinic} - ${i.preferredDate}`));

console.log("=== Búsqueda ===");
console.log(linearSearchByEmail(patientInquiries, "laura.chen@example.com"));

const sortedByDate = sortByPreferredDate(patientInquiries, "asc");
console.log(binarySearchByPreferredDate(sortedByDate, "2026-07-20"));

console.log("=== Agregaciones ===");
console.log(countByServiceType(patientInquiries));
console.log("Promedio de edad:", averageAge(patientInquiries));
console.log("Paciente mayor:", oldestPatientAge(patientInquiries));
console.log("Paciente más joven:", youngestPatientAge(patientInquiries));
console.log("Suma total de edades:", totalAge(patientInquiries));

console.log("=== Validaciones ===");
patientInquiries.forEach((inquiry) => {
  const errors = validatePatientInquiry(inquiry);
  console.log(`${inquiry.firstName} ${inquiry.lastName}:`, errors.length === 0 ? "OK" : errors);
});

import { sampleLocations, sampleClaims, sampleAppointments, sampleClinicians } from "./data";
import { filterClaims, filterAppointmentsByStatus, sortClaimsById, groupClaimsBy } from "./utils/collections";
import { findClaimById, binarySearchClaimById } from "./utils/search";
import {
  calculateDenialRate,
  denialRateByPayer,
  flagHighDenialPayers,
  calculateNoShowCost,
  noShowRateByLocation,
  generateCMEReport,
  getCliniciansAtRisk,
  getCliniciansWithExpiringLicences,
} from "./utils/transformations";
import { validateClaim, validateClinician } from "./utils/validations";

console.log("=== Claims: filtrado y agrupado ===");
console.log(filterClaims(sampleClaims, { status: "denied" }));
console.log(groupClaimsBy(sampleClaims, "payerName"));

console.log("=== Claims: búsqueda ===");
console.log(findClaimById(sampleClaims, "CLM-000003"));
const sortedClaims = sortClaimsById(sampleClaims, "asc");
console.log(binarySearchClaimById(sortedClaims, "CLM-000003"));

console.log("=== Denial rate ===");
console.log("General:", calculateDenialRate(sampleClaims));
console.log("Por payer:", denialRateByPayer(sampleClaims));
console.log("Payers sobre el umbral (8%):", flagHighDenialPayers(sampleClaims));

console.log("=== No-show ===");
console.log(filterAppointmentsByStatus(sampleAppointments, ["no_show"]));
console.log("Costo no-show Austin (semana del 2025-03-16):", calculateNoShowCost(sampleAppointments, sampleLocations[0], "2025-03-16"));
console.log("Costo no-show Miami (semana del 2025-03-16):", calculateNoShowCost(sampleAppointments, sampleLocations[1], "2025-03-16"));
console.log("Tasa de no-show por clínica:", noShowRateByLocation(sampleAppointments));

console.log("=== CME ===");
console.log(generateCMEReport(sampleClinicians, "2025-09-01"));
console.log("Clínicos en riesgo:", getCliniciansAtRisk(sampleClinicians, "2025-09-01"));
console.log("Licencias por vencer (90 días):", getCliniciansWithExpiringLicences(sampleClinicians, "2025-09-01", 90));

console.log("=== Validaciones ===");
const knownLocationIds = sampleLocations.map((location) => location.locationId);
sampleClaims.forEach((claim) => console.log(claim.claimId, validateClaim(claim, knownLocationIds)));
sampleClinicians.forEach((clinician) => console.log(clinician.clinicianId, validateClinician(clinician)));
