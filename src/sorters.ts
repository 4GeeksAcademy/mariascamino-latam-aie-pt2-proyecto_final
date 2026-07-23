import { PatientInquiry } from "./types";

export function sortByPreferredDate(inquiries: PatientInquiry[], order: "asc" | "desc"): PatientInquiry[] {
  return [...inquiries].sort((a, b) => {
    if (order === "asc") {
      if (a.preferredDate < b.preferredDate) return -1;
      if (a.preferredDate > b.preferredDate) return 1;
      return 0;
    } else {
      if (a.preferredDate > b.preferredDate) return -1;
      if (a.preferredDate < b.preferredDate) return 1;
      return 0;
    }
  });
}

export function sortByClinicThenDate(inquiries: PatientInquiry[], order: "asc" | "desc"): PatientInquiry[] {
  return [...inquiries].sort((a, b) => {
    if (a.preferredClinic !== b.preferredClinic) {
      if (order === "asc") {
        return a.preferredClinic < b.preferredClinic ? -1 : 1;
      } else {
        return a.preferredClinic > b.preferredClinic ? -1 : 1;
      }
    }
    if (a.preferredDate < b.preferredDate) return -1;
    if (a.preferredDate > b.preferredDate) return 1;
    return 0;
  });
}