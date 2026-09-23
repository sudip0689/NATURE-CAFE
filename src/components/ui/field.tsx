import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

export function Field({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: FieldProps) {
  const fieldId = id ?? props.name;
  const describedBy = error
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-brandink"
      >
        {label}
      </label>

      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "w-full min-h-touch rounded-control border bg-white px-4",
          "text-base text-brandink placeholder:text-brandmuted",
          "transition-colors duration-150",
          error
            ? "border-alert-500 focus:border-alert-600"
            : "border-brandline focus:border-leaf",
          "focus:outline-none",
          className,
        )}
        {...props}
      />

      {error ? (
        // Icon plus text, never colour alone — this gets read in a bright café.
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-alert-600"
        >
          <span aria-hidden="true">!</span>
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-sm text-brandmuted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
