import { PatientInquiry } from "./types";
import { calculateAge } from "./aggregations";

export function validatePatientInquiry(inquiry: PatientInquiry): string[] {
  const errors: string[] = [];

  const nameRegex = /^[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]{2,50}$/;

  if (!nameRegex.test(inquiry.firstName)) {
    errors.push("El nombre debe contener solo letras y tener al menos 2 caracteres");
  }

  if (!nameRegex.test(inquiry.lastName)) {
    errors.push("El apellido debe contener solo letras y tener al menos 2 caracteres");
  }

  const age = calculateAge(inquiry.dateOfBirth);
  if (age < 0 || age > 120) {
    errors.push("Ingresa una fecha de nacimiento válida. El paciente debe tener entre 0 y 120 años");
  }

  if (!inquiry.phone.startsWith("+")) {
    errors.push("El teléfono debe incluir un código de país (ejemplo: +1 305 555 0191)");
  }

  if (inquiry.serviceType === "Paediatric Care" && age >= 18) {
    errors.push(
      "Paediatric Care está disponible para pacientes menores de 18 años. Revisa la fecha de nacimiento o selecciona un servicio diferente."
    );
  }

  if (inquiry.hasInsurance) {
    if (!inquiry.insuranceProvider) {
      errors.push("Ingresa el nombre de tu aseguradora");
    }
    if (!inquiry.insuranceMemberId || inquiry.insuranceMemberId.length < 6 || inquiry.insuranceMemberId.length > 20) {
      errors.push("El ID de afiliado debe tener entre 6 y 20 caracteres alfanuméricos");
    }
  }

  if (inquiry.healthConcern.length < 20 || inquiry.healthConcern.length > 500) {
    errors.push("Describe tu consulta médica en al menos 20 caracteres");
  }

  if (!inquiry.contactConsent) {
    errors.push("Debes dar tu consentimiento para ser contactado antes de enviar este formulario");
  }

  return errors;
}