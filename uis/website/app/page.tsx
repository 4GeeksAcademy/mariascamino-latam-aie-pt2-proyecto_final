"use client";

import { useState, useCallback, useMemo } from "react";
import { createI18n, type SupportedLang } from "@/lib/i18n";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import WhyHealthCore from "@/components/WhyHealthCore";
import Locations from "@/components/Locations";
import Footer from "@/components/Footer";

export default function Home() {
  const [i18n] = useState(() => createI18n());

  const handleLangChange = useCallback(
    (lang: SupportedLang) => {
      i18n.setLang(lang);
      // Force re-render via state update
      setCounter((c) => c + 1);
    },
    [i18n],
  );

  // Counter to force re-render on language change
  const [, setCounter] = useState(0);

  const { t, getLang, getTranslations } = useMemo(
    () => ({
      t: i18n.t.bind(i18n),
      getLang: i18n.getLang.bind(i18n),
      getTranslations: i18n.getTranslations.bind(i18n),
    }),
    [i18n],
  );

  return (
    <>
      {/* Skip-to-content link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-teal-700"
      >
        {t("skip_to_main")}
      </a>

      <Navbar
        t={t}
        lang={getLang()}
        translations={getTranslations()}
        onLangChange={handleLangChange}
      />

      <main id="main">
        <Hero t={t} />
        <Services t={t} />
        <WhyHealthCore t={t} />
        <Locations t={t} />
      </main>

      <Footer t={t} />
    </>
  );
}