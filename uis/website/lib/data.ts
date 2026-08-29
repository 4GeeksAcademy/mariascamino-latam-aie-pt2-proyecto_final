export interface Clinic {
  name: string;
  city: string;
  state: string;
  phone: string;
  hours: string;
}

export const CLINICS: Clinic[] = [
  { name: "HealthCore Austin Central", city: "Austin", state: "TX", phone: "(512) 340-8800", hours: "Mon–Fri 7am–8pm · Sat 9am–3pm" },
  { name: "HealthCore Austin North", city: "Austin", state: "TX", phone: "(512) 340-8810", hours: "Mon–Fri 8am–7pm" },
  { name: "HealthCore San Antonio", city: "San Antonio", state: "TX", phone: "(210) 720-4400", hours: "Mon–Fri 8am–6pm · Sat 9am–1pm" },
  { name: "HealthCore Miami", city: "Miami", state: "FL", phone: "(305) 510-7700", hours: "Mon–Fri 7am–8pm · Sat 9am–4pm" },
  { name: "HealthCore Orlando", city: "Orlando", state: "FL", phone: "(407) 892-6600", hours: "Mon–Fri 8am–6pm" },
  { name: "HealthCore Atlanta", city: "Atlanta", state: "GA", phone: "(404) 330-9900", hours: "Mon–Fri 8am–7pm" },
];

export interface ServiceItem {
  titleKey: string;
  descKey: string;
  image: string;
  imageAltKey: string;
}

export const SERVICES: ServiceItem[] = [
  {
    titleKey: "service_1_title",
    descKey: "service_1_desc",
    image: "/images/service-primary.webp",
    imageAltKey: "service_1_alt",
  },
  {
    titleKey: "service_2_title",
    descKey: "service_2_desc",
    image: "/images/service-specialists.webp",
    imageAltKey: "service_2_alt",
  },
  {
    titleKey: "service_3_title",
    descKey: "service_3_desc",
    image: "/images/service-preventive.webp",
    imageAltKey: "service_3_alt",
  },
];

export interface WhyItem {
  titleKey: string;
  descKey: string;
}

export const WHY_ITEMS: WhyItem[] = [
  { titleKey: "why_1_title", descKey: "why_1_desc" },
  { titleKey: "why_2_title", descKey: "why_2_desc" },
  { titleKey: "why_3_title", descKey: "why_3_desc" },
  { titleKey: "why_4_title", descKey: "why_4_desc" },
];

export const LOCATION_KEYS = ["loc_1", "loc_2", "loc_3", "loc_4", "loc_5", "loc_6"];

export const NAV_ITEMS = [
  { key: "nav_home", href: "#inicio" },
  { key: "nav_services", href: "#servicios" },
  { key: "nav_locations", href: "#ubicaciones" },
  { key: "nav_contact", href: "#contacto" },
];

export const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://linkedin.com/company/healthcore" },
  { label: "Facebook", href: "https://facebook.com/healthcore" },
  { label: "Instagram", href: "https://instagram.com/healthcore" },
];