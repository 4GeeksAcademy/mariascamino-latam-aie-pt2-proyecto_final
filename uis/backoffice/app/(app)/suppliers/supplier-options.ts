// Options shared by the supplier table (filters, badges) and the
// lazily-loaded NewSupplierForm. Kept in their own tiny module so the form
// chunk and the table don't each carry a copy.
export const CATEGORIES = [
  "medical_supplies",
  "laboratory_services",
  "pharmaceutical",
  "clinical_software",
  "it_infrastructure",
  "hr_and_payroll_software",
  "cleaning_and_facilities",
  "patient_communication",
  "billing_and_coding_software",
  "training_platforms",
] as const;

export const COUNTRY_CURRENCY: Record<string, string> = { USA: "USD", UK: "GBP" };

export const categoryLabel = (cat: string) =>
  cat
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
