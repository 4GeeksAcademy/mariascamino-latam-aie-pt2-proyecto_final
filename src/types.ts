export interface PatientInquiry {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  preferredLanguage: "English" | "Spanish";
  preferredClinic: string;
  preferredDate: string;
  preferredTime: "Morning (7am-12pm)" | "Afternoon (12pm-5pm)" | "Evening (5pm-8pm)";
  serviceType:
    | "Primary Care"
    | "Chronic Disease Management"
    | "Specialist Consultation"
    | "Preventive Health"
    | "Women's Health"
    | "Paediatric Care"
    | "Mental Health";
  newPatient: boolean;
  hasInsurance: boolean;
  insuranceProvider?: string;
  insuranceMemberId?: string;
  healthConcern: string;
  contactConsent: boolean;
  patientId?: string;
}

export interface Clinic {
  name: string;
  city: string;
  state: string;
  phone: string;
  openingHours: string[];
}

export type ServiceType =
  | "primary_care"
  | "chronic_disease"
  | "preventive"
  | "specialist"
  | "womens_health"
  | "paediatric"
  | "mental_health";

export type ClaimStatus = "submitted" | "approved" | "denied" | "pending" | "appealed";

export type DenialReason =
  | "missing_authorisation"
  | "coding_error"
  | "duplicate_claim"
  | "patient_not_covered"
  | "service_not_covered"
  | "incomplete_documentation";

export interface Claim {
  claimId: string;
  patientId: string;
  locationId: string;
  serviceType: ServiceType;
  payerName: string;
  payerId: string;
  submissionDate: string;
  claimAmount: number;
  status: ClaimStatus;
  denialReason?: DenialReason;
  resubmitted: boolean;
}

export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "no_show" | "cancelled";

export interface Appointment {
  appointmentId: string;
  patientId: string;
  locationId: string;
  serviceType: ServiceType;
  scheduledDate: string;
  scheduledTime: string;
  status: AppointmentStatus;
  noShowReason?: string;
  confirmedAt?: string;
}

export type ClinicianRole = "physician" | "nurse_practitioner" | "nurse" | "medical_assistant";

export interface Clinician {
  clinicianId: string;
  firstName: string;
  lastName: string;
  role: ClinicianRole;
  locationId: string;
  licenceState: string;
  licenceExpiryDate: string;
  cmeHoursRequired: number;
  cmeHoursLogged: number;
  cmeYearStartDate: string;
}

export interface Location {
  locationId: string;
  name: string;
  city: string;
  stateOrCountry: string;
  country: "US" | "UK";
  phone: string;
  averageConsultationFee: Record<ServiceType, number>;
}

export type CMEStatus = "on_track" | "at_risk" | "overdue" | "complete";

export interface CMEReport {
  clinicianId: string;
  fullName: string;
  role: ClinicianRole;
  locationId: string;
  hoursRequired: number;
  hoursLogged: number;
  hoursRemaining: number;
  percentComplete: number;
  daysRemainingInCycle: number;
  complianceStatus: CMEStatus;
  licenceExpiryDate: string;
  licenceDaysRemaining: number;
}
