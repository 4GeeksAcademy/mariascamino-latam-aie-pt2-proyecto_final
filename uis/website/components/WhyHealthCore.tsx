"use client";

import { WHY_ITEMS } from "@/lib/data";

export interface WhyHealthCoreProps {
  t: (key: string) => string;
}

export default function WhyHealthCore({ t }: WhyHealthCoreProps) {
  return (
    <section
      id="por-que-healthcore"
      aria-labelledby="why-title"
      className="bg-slate-100/70"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
        <h2
          id="why-title"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          {t("why_title")}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {WHY_ITEMS.map((item) => (
            <article
              key={item.titleKey}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <h3 className="text-base font-semibold text-teal-800">
                {t(item.titleKey)}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {t(item.descKey)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}