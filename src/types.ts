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