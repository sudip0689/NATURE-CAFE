import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string | null;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
}

/**
 * A native <select>. The category list is short and a native picker gives the
 * counter tablet its own OS wheel, which is faster and more familiar than
 * anything custom. Long lists in the POS get a proper sheet in Phase 3.
 */
export function SelectField({
  label,
  error,
  options,
  placeholder,
  id,
  className,
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-brandink">
        {label}
      </label>

      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={cn(
          "w-full min-h-touch rounded-control border bg-white px-4",
          "text-base text-brandink transition-colors duration-150 focus:outline-none",
          error
            ? "border-alert-500 focus:border-alert-600"
            : "border-brandline focus:border-leaf",
          className,
        )}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-alert-600"
        >
          <span aria-hidden="true">!</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
