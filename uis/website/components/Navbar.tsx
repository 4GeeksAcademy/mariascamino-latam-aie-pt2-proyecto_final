"use client";

import { useState } from "react";
import type { SupportedLang } from "@/lib/i18n";
import type { TranslationDict } from "@/lib/i18n";
import { NAV_ITEMS } from "@/lib/data";

export interface NavbarProps {
  t: (key: string) => string;
  lang: SupportedLang;
  translations: TranslationDict;
  onLangChange: (lang: SupportedLang) => void;
}

export default function Navbar({ t, lang, translations, onLangChange }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen((prev) => !prev);
  const closeMobile = () => setMobileOpen(false);

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur"
      aria-label={t("header_aria")}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3" aria-label="Ir al inicio de HealthCore">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 64 64"
            role="img"
            aria-label="Logo de HealthCore"
            className="h-10 w-10 shrink-0 rounded-full shadow-sm"
          >
            <title>HealthCore</title>
            <circle cx="32" cy="32" r="30" fill="#0f766e" />
            <path d="M32 18v28M18 32h28" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          </svg>
          <div>
            <p className="text-lg font-bold leading-tight text-teal-800">HealthCore</p>
            <p className="text-xs text-slate-600">{t("header_tagline")}</p>
          </div>
        </a>

        {/* Desktop nav */}
        <nav
          aria-label={t("nav_label")}
          className="hidden md:block"
        >
          <ul className="flex items-center gap-6 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  className="text-slate-700 transition hover:text-teal-700"
                >
                  {t(item.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop lang toggle */}
        <div
          className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white p-1 md:inline-flex"
          aria-label="Seleccionar idioma"
        >
          <button
            type="button"
            onClick={() => onLangChange("en")}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              lang === "en"
                ? "bg-teal-700 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            aria-pressed={lang === "en"}
            aria-label={t("lang_en_label")}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => onLangChange("es")}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              lang === "es"
                ? "bg-teal-700 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            aria-pressed={lang === "es"}
            aria-label={t("lang_es_label")}
          >
            ES
          </button>
        </div>

        {/* Desktop CTA */}
        <a
          href="/appointment"
          className="hidden rounded-xl bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-teal-800 md:inline-flex"
        >
          {t("header_cta")}
        </a>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={toggleMobile}
          className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 md:hidden"
          aria-expanded={mobileOpen}
          aria-haspopup="true"
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? t("menu_close") : t("menu_open")}
        >
          {t("menu_label")}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav
          id="mobile-menu"
          aria-label={t("nav_label")}
          className="border-t border-slate-200 bg-white px-4 py-3 md:hidden"
        >
          <ul className="grid gap-2 text-sm font-semibold">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  onClick={closeMobile}
                  className="block rounded-lg bg-slate-100 px-3 py-2 text-slate-700"
                >
                  {t(item.key)}
                </a>
              </li>
            ))}
          </ul>
          <div
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1"
            aria-label="Seleccionar idioma"
          >
            <button
              type="button"
              onClick={() => { onLangChange("en"); closeMobile(); }}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                lang === "en"
                  ? "bg-teal-700 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              aria-pressed={lang === "en"}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => { onLangChange("es"); closeMobile(); }}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                lang === "es"
                  ? "bg-teal-700 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              aria-pressed={lang === "es"}
            >
              ES
            </button>
          </div>
          <a
            href="/appointment"
            onClick={closeMobile}
            className="mt-3 block rounded-xl bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white"
          >
            {t("header_cta")}
          </a>
        </nav>
      )}
    </header>
  );
}