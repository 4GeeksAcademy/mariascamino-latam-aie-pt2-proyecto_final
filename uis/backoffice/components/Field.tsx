"use client";

import { cloneElement, useId, type ReactElement, type ReactNode } from "react";

/**
 * Label + form control pair. Generates a stable id with useId() and wires it
 * to both the <label htmlFor> and the control, so screen readers announce the
 * label and clicking it focuses the control.
 */
export function Field({
  label,
  className,
  children,
}: {
  label: ReactNode;
  className?: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-medium text-slate-500">
        {label}
      </label>
      {cloneElement(children, { id })}
    </div>
  );
}
