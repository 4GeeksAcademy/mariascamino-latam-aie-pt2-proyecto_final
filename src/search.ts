import { PatientInquiry } from "./types";

export function linearSearchByEmail(inquiries: PatientInquiry[], email: string): PatientInquiry | null {
  for (let i = 0; i < inquiries.length; i++) {
    if (inquiries[i].email === email) {
      return inquiries[i];
    }
  }
  return null;
}

export function binarySearchByPreferredDate(sortedInquiries: PatientInquiry[], targetDate: string): number {
  let low = 0;
  let high = sortedInquiries.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (sortedInquiries[mid].preferredDate === targetDate) {
      return mid;
    } else if (sortedInquiries[mid].preferredDate < targetDate) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}