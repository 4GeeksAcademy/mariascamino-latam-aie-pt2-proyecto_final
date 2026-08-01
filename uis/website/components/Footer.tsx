"use client";

import { SOCIAL_LINKS } from "@/lib/data";

export interface FooterProps {
  t: (key: string) => string;
}

export default function Footer({ t }: FooterProps) {
  return (
    <footer
      id="contacto"
      role="contentinfo"
      aria-labelledby="contacto-title"
      className="border-t border-slate-200 bg-white"
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {/* Contact intro */}
        <section>
          <h2
            id="contacto-title"
            className="text-lg font-bold text-slate-900"
          >
            {t("contact_title")}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {t("contact_subtitle")}
          </p>
        </section>

        {/* Contact details */}
        <address className="not-italic text-sm text-slate-700">
          <p className="font-semibold">HealthCore</p>
          <p className="mt-1">
            <span>{t("contact_general_label")}</span>{" "}
            <a className="text-teal-700 hover:text-teal-900" href="mailto:info@healthcore.com">
              info@healthcore.com
            </a>
          </p>
          <p className="mt-1">
            <span>{t("contact_austin_label")}</span>{" "}
            <a className="text-teal-700 hover:text-teal-900" href="tel:+15123408800">
              (512) 340-8800
            </a>
          </p>
          <p className="mt-1">
            <span>{t("contact_miami_label")}</span>{" "}
            <a className="text-teal-700 hover:text-teal-900" href="tel:+13055107700">
              (305) 510-7700
            </a>
          </p>
          <p className="mt-1">
            <span>{t("contact_uk_label")}</span>{" "}
            <a className="text-teal-700 hover:text-teal-900" href="tel:+442079460100">
              +44 20 7946 0100
            </a>
          </p>
        </address>

        {/* Hours + CTA + Social */}
        <section className="text-sm text-slate-600">
          <p>{t("hours_label")}</p>
          <p className="mt-1 font-medium text-slate-800">
            {t("hours_value")}
          </p>
          <a
            href="/appointment"
            className="mt-4 inline-block rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-teal-800"
          >
            {t("footer_cta")}
          </a>
          <div className="mt-4">
            <p className="font-semibold text-slate-800">
              {t("social_title")}
            </p>
            <ul className="mt-2 space-y-1">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-teal-700 hover:text-teal-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <p className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
        {t("copyright")}
      </p>
    </footer>
  );
}