"use client";

export type SupportedLang = "en" | "es";

export interface TranslationDict {
  [key: string]: string;
}

const translations: Record<SupportedLang, TranslationDict> = {
  es: {
    skip: "Ir al contenido principal",
    header_tagline: "Atención médica más conectada",
    header_aria: "Encabezado principal",
    nav_home: "Inicio",
    nav_services: "Servicios",
    nav_locations: "Ubicaciones",
    nav_contact: "Contacto",
    nav_label: "Navegación principal",
    header_cta: "Solicitar una cita",
    menu_open: "Abrir menú de navegación",
    menu_close: "Cerrar menú de navegación",
    menu_label: "Abrir menú de navegación",
    lang_en_label: "Switch language to English",
    lang_es_label: "Cambiar idioma a Español",
    hero_badge: "Salud ambulatoria confiable",
    hero_title: "Atención médica que se adapta a tu vida",
    hero_subtitle:
      "12 clínicas ambulatorias en EE. UU. y Reino Unido que ofrecen citas el mismo día, horarios extendidos y atención bilingüe, para que recibas la atención que necesitas, cuando la necesitas.",
    hero_cta: "Solicitar una cita",
    hero_panel_title: "Valor para pacientes y equipos médicos",
    hero_panel_1: "Citas el mismo día en la mayoría de las ubicaciones.",
    hero_panel_2: "Horarios extendidos entre semana y sábados disponibles.",
    hero_panel_3: "Atención bilingüe para pacientes en inglés y español.",
    hero_panel_4:
      "Desde 2011, atendemos con un equipo de aproximadamente 200 profesionales de salud.",
    services_title: "Servicios",
    service_1_title: "Atención Primaria y Enfermedades Crónicas",
    service_1_desc:
      "Citas el mismo día con médicos de atención primaria y manejo continuo de diabetes, hipertensión y asma.",
    service_2_title: "Consultas con Especialistas",
    service_2_desc:
      "Cardiología, endocrinología, neumología y salud de la mujer, con derivaciones coordinadas dentro de la red HealthCore.",
    service_3_title: "Salud Preventiva y Bienestar",
    service_3_desc:
      "Chequeos, vacunación y revisiones anuales, además de asesoramiento en salud mental y derivaciones a psiquiatría.",
    why_title: "Por qué HealthCore",
    why_1_title: "Citas el mismo día",
    why_1_desc:
      "Disponibles en la mayoría de las ubicaciones para que recibas atención cuando la necesitas.",
    why_2_title: "Horarios extendidos",
    why_2_desc:
      "Entre semana hasta las 7pm u 8pm y con sábados disponibles en varias clínicas.",
    why_3_title: "Personal bilingüe",
    why_3_desc: "Atención en inglés y español en las ubicaciones de EE. UU.",
    why_4_title: "12 clínicas",
    why_4_desc:
      "Presencia en Texas, Florida, Georgia y el Reino Unido.",
    locations_title: "Ubicaciones en EE. UU.",
    locations_subtitle:
      "Conoce las clínicas de HealthCore en Estados Unidos y sus horarios de atención.",
    loc_1:
      "HealthCore Austin Central · Austin, TX · (512) 340-8800 · Lun–Vie 7am–8pm · Sáb 9am–3pm",
    loc_2:
      "HealthCore Austin North · Austin, TX · (512) 340-8810 · Lun–Vie 8am–7pm",
    loc_3:
      "HealthCore San Antonio · San Antonio, TX · (210) 720-4400 · Lun–Vie 8am–6pm · Sáb 9am–1pm",
    loc_4:
      "HealthCore Miami · Miami, FL · (305) 510-7700 · Lun–Vie 7am–8pm · Sáb 9am–4pm",
    loc_5:
      "HealthCore Orlando · Orlando, FL · (407) 892-6600 · Lun–Vie 8am–6pm",
    loc_6:
      "HealthCore Atlanta · Atlanta, GA · (404) 330-9900 · Lun–Vie 8am–7pm",
    contact_title: "Contacto",
    contact_subtitle:
      "Estamos disponibles para ayudarte a mejorar la atención clínica.",
    contact_general_label: "Consultas generales:",
    contact_austin_label: "Sede central de Austin:",
    contact_miami_label: "Miami:",
    contact_uk_label: "Reino Unido (Londres):",
    hours_label: "Horario de atención:",
    hours_value: "Lunes a Viernes, 8:00 a 18:00",
    footer_cta: "Solicitar una cita",
    social_title: "Redes sociales",
    copyright: "© 2025 HealthCore. Todos los derechos reservados.",
    skip_to_main: "Saltar al contenido principal",
  },
  en: {
    skip: "Skip to main content",
    header_tagline: "More connected outpatient care",
    header_aria: "Main header",
    nav_home: "Home",
    nav_services: "Services",
    nav_locations: "Locations",
    nav_contact: "Contact",
    nav_label: "Main navigation",
    header_cta: "Request an appointment",
    menu_open: "Open navigation menu",
    menu_close: "Close navigation menu",
    menu_label: "Open navigation menu",
    lang_en_label: "Switch language to English",
    lang_es_label: "Switch language to Spanish",
    hero_badge: "Trusted outpatient care",
    hero_title: "Care that fits your life",
    hero_subtitle:
      "12 outpatient clinics across the U.S. and U.K. offering same-day appointments, extended hours, and bilingual care, so you get the care you need, when you need it.",
    hero_cta: "Request an appointment",
    hero_panel_title: "Value for patients and clinical teams",
    hero_panel_1: "Same-day appointments at most locations.",
    hero_panel_2: "Extended weekday hours and Saturday availability.",
    hero_panel_3: "Bilingual care for patients in English and Spanish.",
    hero_panel_4:
      "Since 2011, we have cared for patients with a team of approximately 200 healthcare professionals.",
    services_title: "Services",
    service_1_title: "Primary Care and Chronic Conditions",
    service_1_desc:
      "Same-day appointments with primary care physicians and ongoing management of diabetes, hypertension, and asthma.",
    service_2_title: "Specialist Consultations",
    service_2_desc:
      "Cardiology, endocrinology, pulmonology, and women's health, with coordinated referrals across the HealthCore network.",
    service_3_title: "Preventive Health and Wellness",
    service_3_desc:
      "Checkups, vaccinations, and annual screenings, plus mental health counseling and psychiatry referrals.",
    why_title: "Why HealthCore",
    why_1_title: "Same-day appointments",
    why_1_desc:
      "Available at most locations so you can get care when you need it.",
    why_2_title: "Extended hours",
    why_2_desc:
      "Weekdays up to 7pm or 8pm, with Saturday availability at several clinics.",
    why_3_title: "Bilingual staff",
    why_3_desc:
      "Care in English and Spanish across U.S. locations.",
    why_4_title: "12 clinics",
    why_4_desc:
      "Presence in Texas, Florida, Georgia, and the United Kingdom.",
    locations_title: "U.S. Locations",
    locations_subtitle:
      "Explore HealthCore clinics in the United States and their opening hours.",
    loc_1:
      "HealthCore Austin Central · Austin, TX · (512) 340-8800 · Mon–Fri 7am–8pm · Sat 9am–3pm",
    loc_2:
      "HealthCore Austin North · Austin, TX · (512) 340-8810 · Mon–Fri 8am–7pm",
    loc_3:
      "HealthCore San Antonio · San Antonio, TX · (210) 720-4400 · Mon–Fri 8am–6pm · Sat 9am–1pm",
    loc_4:
      "HealthCore Miami · Miami, FL · (305) 510-7700 · Mon–Fri 7am–8pm · Sat 9am–4pm",
    loc_5:
      "HealthCore Orlando · Orlando, FL · (407) 892-6600 · Mon–Fri 8am–6pm",
    loc_6:
      "HealthCore Atlanta · Atlanta, GA · (404) 330-9900 · Mon–Fri 8am–7pm",
    contact_title: "Contact",
    contact_subtitle:
      "We are here to help you access quality outpatient care.",
    contact_general_label: "General inquiries:",
    contact_austin_label: "Austin headquarters:",
    contact_miami_label: "Miami:",
    contact_uk_label: "United Kingdom (London):",
    hours_label: "Support hours:",
    hours_value: "Monday to Friday, 8:00 to 18:00",
    footer_cta: "Request an appointment",
    social_title: "Social media",
    copyright: "© 2025 HealthCore. All rights reserved.",
    skip_to_main: "Skip to main content",
  },
};

const LANGUAGE_STORAGE_KEY = "healthcoreLang";

function getSavedLanguage(): SupportedLang | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "en" || saved === "es") return saved;
    return null;
  } catch {
    return null;
  }
}

function saveLanguage(lang: SupportedLang): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Storage unavailable
  }
}

export function createI18n(initialLang?: SupportedLang) {
  let currentLang: SupportedLang =
    initialLang ?? getSavedLanguage() ?? "es";

  function t(key: string): string {
    return translations[currentLang]?.[key] ?? key;
  }

  function setLang(lang: SupportedLang): void {
    currentLang = lang;
    saveLanguage(lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }

  function getLang(): SupportedLang {
    return currentLang;
  }

  function getTranslations(): TranslationDict {
    return translations[currentLang];
  }

  return { t, setLang, getLang, getTranslations };
}

export type I18nContext = ReturnType<typeof createI18n>;

export { translations, getSavedLanguage };