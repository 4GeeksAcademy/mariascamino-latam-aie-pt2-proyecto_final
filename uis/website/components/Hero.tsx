"use client";

export interface HeroProps {
  t: (key: string) => string;
}

export default function Hero({ t }: HeroProps) {
  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-gradient-to-br from-teal-900 via-cyan-800 to-sky-700 text-white"
    >
      {/* Decorative blurs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 bottom-0 h-56 w-56 rounded-full bg-teal-200/20 blur-3xl"
      />

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
        {/* Left column */}
        <div>
          <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {t("hero_badge")}
          </p>
          <h2
            id="hero-title"
            className="mt-4 text-2xl font-bold leading-tight sm:text-3xl md:text-4xl lg:text-5xl"
          >
            {t("hero_title")}
          </h2>
          <p className="mt-5 max-w-2xl text-base text-cyan-50 sm:text-lg">
            {t("hero_subtitle")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href="/appointment"
              className="rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-teal-900 shadow transition hover:-translate-y-0.5 hover:bg-slate-100"
              aria-label={t("hero_cta")}
            >
              {t("hero_cta")}
            </a>
          </div>
        </div>

        {/* Right panel */}
        <article className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur md:p-7">
          <div className="aspect-[3/2] w-full rounded-xl bg-teal-700/30 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold">{t("hero_panel_title")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-cyan-50">
            <li>{t("hero_panel_1")}</li>
            <li>{t("hero_panel_2")}</li>
            <li>{t("hero_panel_3")}</li>
            <li>{t("hero_panel_4")}</li>
          </ul>
        </article>
      </div>
    </section>
  );
}