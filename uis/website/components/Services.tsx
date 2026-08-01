"use client";

import { SERVICES } from "@/lib/data";

export interface ServicesProps {
  t: (key: string) => string;
}

export default function Services({ t }: ServicesProps) {
  return (
    <section
      id="servicios"
      aria-labelledby="servicios-title"
      className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16 lg:px-8"
    >
      <h2
        id="servicios-title"
        className="text-2xl font-bold text-slate-900 sm:text-3xl"
      >
        {t("services_title")}
      </h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service, i) => (
          <article
            key={service.titleKey}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-40 w-full items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 to-cyan-50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-teal-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                {i === 0 && (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                )}
                {i === 1 && (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                )}
                {i === 2 && (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                )}
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-teal-800">
              {t(service.titleKey)}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {t(service.descKey)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}