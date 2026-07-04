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