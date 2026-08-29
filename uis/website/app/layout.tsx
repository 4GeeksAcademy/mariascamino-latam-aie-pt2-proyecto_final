import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthCore | Atención médica más conectada",
  description:
    "HealthCore es una red de clínicas ambulatorias fundada en 2011, con 12 sedes en EE. UU. y Reino Unido, enfocada en atención primaria, especialistas, enfermedades crónicas y salud preventiva.",
  keywords: [
    "HealthCore",
    "clínicas ambulatorias",
    "atención primaria",
    "cuidado de salud",
    "Texas",
    "Florida",
    "Georgia",
    "Reino Unido",
    "citas mismo día",
    "atención bilingüe",
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "MedicalOrganization",
      "@id": "https://www.healthcore.com/#organization",
      name: "HealthCore",
      description:
        "Outpatient healthcare network offering primary care, specialist consultations, chronic disease management, and preventive health programmes.",
      url: "https://www.healthcore.com",
      foundingDate: "2011",
      logo: "https://www.healthcore.com/logo.png",
      availableLanguage: ["English", "Spanish"],
      areaServed: ["US", "GB"],
      address: {
        "@type": "PostalAddress",
        addressLocality: "Austin",
        addressRegion: "Texas",
        addressCountry: "US",
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+1-512-340-8800",
        contactType: "patient services",
        availableLanguage: ["English", "Spanish"],
      },
      sameAs: [
        "https://linkedin.com/company/healthcore",
        "https://facebook.com/healthcore",
        "https://instagram.com/healthcore",
      ],
    },
    {
      "@type": "MedicalClinic",
      name: "HealthCore Austin Central",
      telephone: "+1-512-340-8800",
      openingHours: ["Mo-Fr 07:00-20:00", "Sa 09:00-15:00"],
      parentOrganization: { "@id": "https://www.healthcore.com/#organization" },
    },
    {
      "@type": "MedicalClinic",
      name: "HealthCore Austin North",
      telephone: "+1-512-340-8810",
      openingHours: ["Mo-Fr 08:00-19:00"],
      parentOrganization: { "@id": "https://www.healthcore.com/#organization" },
    },
    {
      "@type": "MedicalClinic",
      name: "HealthCore San Antonio",
      telephone: "+1-210-720-4400",
      openingHours: ["Mo-Fr 08:00-18:00", "Sa 09:00-13:00"],
      parentOrganization: { "@id": "https://www.healthcore.com/#organization" },
    },
    {
      "@type": "MedicalClinic",
      name: "HealthCore Miami",
      telephone: "+1-305-510-7700",
      openingHours: ["Mo-Fr 07:00-20:00", "Sa 09:00-16:00"],
      parentOrganization: { "@id": "https://www.healthcore.com/#organization" },
    },
    {
      "@type": "MedicalClinic",
      name: "HealthCore Orlando",
      telephone: "+1-407-892-6600",
      openingHours: ["Mo-Fr 08:00-18:00"],
      parentOrganization: { "@id": "https://www.healthcore.com/#organization" },
    },
    {
      "@type": "MedicalClinic",
      name: "HealthCore Atlanta",
      telephone: "+1-404-330-9900",
      openingHours: ["Mo-Fr 08:00-19:00"],
      parentOrganization: { "@id": "https://www.healthcore.com/#organization" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-white font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}