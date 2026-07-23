import { PatientInquiry } from "./types";

export function filterByServiceType(inquiries: PatientInquiry[], serviceType: string): PatientInquiry[] {
  return inquiries.filter((inquiry) => inquiry.serviceType === serviceType);
}

export interface PatientInquiryCriteria {
  serviceType?: string;
  preferredClinic?: string;
  hasInsurance?: boolean;
}

export function filterInquiries(inquiries: PatientInquiry[], criteria: PatientInquiryCriteria): PatientInquiry[] {
  return inquiries.filter((inquiry) => {
    if (criteria.serviceType && inquiry.serviceType !== criteria.serviceType) return false;
    if (criteria.preferredClinic && inquiry.preferredClinic !== criteria.preferredClinic) return false;
    if (criteria.hasInsurance !== undefined && inquiry.hasInsurance !== criteria.hasInsurance) return false;
    return true;
  });
}