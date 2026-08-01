"use client";

import { CLINICS } from "@/lib/data";

export interface LocationsProps {
  t: (key: string) => string;
}

export default function Locations({ t }: LocationsProps) {
  return (
    <section
      id="ubicaciones"
      aria-labelledby="ubicaciones-title"
      className="bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
        <h2
          id="ubicaciones-title"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          {t("locations_title")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          {t("locations_subtitle")}
        </p>

        {/* Decorative image placeholder */}
        <div className="mt-6 flex h-56 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-100 to-cyan-50 sm:h-64">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-teal-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
            />
          </svg>
        </div>

        {/* Location cards */}
        <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {CLINICS.map((clinic, i) => (
            <li
              key={clinic.name}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <strong className="text-slate-900">{clinic.name}</strong>
              <br />
              <span className="text-slate-600">
                {clinic.city}, {clinic.state}
              </span>
              <br />
              <span className="text-slate-600">{clinic.phone}</span>
              <br />
              <span className="text-slate-500">{clinic.hours}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}