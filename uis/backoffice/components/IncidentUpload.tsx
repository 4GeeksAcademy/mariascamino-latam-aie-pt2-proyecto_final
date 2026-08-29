"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";

interface IncidentUploadProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

const ACCEPTED = ".csv";

export function IncidentUpload({ onFileSelected, isLoading }: IncidentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) return;
    setFileName(file.name);
    onFileSelected(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset para permitir reseleccionar el mismo archivo
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center">
      <div
        role="button"
        tabIndex={0}
        className={`cursor-pointer rounded-lg p-6 transition ${
          dragOver ? "bg-teal-50 ring-2 ring-teal-400" : "hover:bg-slate-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        aria-label="Subir archivo CSV de incidentes"
      >
        {/* Icono */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto mb-3 h-10 w-10 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleChange}
          aria-hidden="true"
        />

        {fileName ? (
          <p className="text-sm font-medium text-teal-700">
            {fileName}
            <span className="ml-2 text-xs text-slate-400">(haz clic para cambiar)</span>
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-700">
              Arrastra un archivo CSV aquí o haz clic para seleccionarlo
            </p>
            <p className="mt-1 text-xs text-slate-400">Solo archivos .csv</p>
          </>
        )}
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Analizando incidentes...
        </div>
      )}
    </div>
  );
}