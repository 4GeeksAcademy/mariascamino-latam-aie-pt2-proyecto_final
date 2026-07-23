import { PatientInquiry } from "./types";

export function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasHadBirthdayThisYear) {
    age--;
  }

  return age;
}

export function countByServiceType(inquiries: PatientInquiry[]): Record<string, number> {
  return inquiries.reduce((counts, inquiry) => {
    counts[inquiry.serviceType] = (counts[inquiry.serviceType] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
}

export function averageAge(inquiries: PatientInquiry[]): number {
  if (inquiries.length === 0) return 0;
  const totalAge = inquiries.reduce((sum, inquiry) => sum + calculateAge(inquiry.dateOfBirth), 0);
  return totalAge / inquiries.length;
}

export function oldestPatientAge(inquiries: PatientInquiry[]): number | null {
  if (inquiries.length === 0) return null;
  return inquiries.reduce((maxAge, inquiry) => {
    const age = calculateAge(inquiry.dateOfBirth);
    return age > maxAge ? age : maxAge;
  }, 0);
}

export function youngestPatientAge(inquiries: PatientInquiry[]): number | null {
  if (inquiries.length === 0) return null;
  return inquiries.reduce((minAge, inquiry) => {
    const age = calculateAge(inquiry.dateOfBirth);
    return age < minAge ? age : minAge;
  }, Infinity);
}

export function totalAge(inquiries: PatientInquiry[]): number {
  return inquiries.reduce((sum, inquiry) => sum + calculateAge(inquiry.dateOfBirth), 0);
}