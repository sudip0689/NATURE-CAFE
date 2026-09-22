import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-cream-300 bg-cream-50 shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  /** Small note under the value — a count, a comparison, a payment split. */
  note?: string;
  tone?: "default" | "paid";
}

/** The dashboard KPI tile. Value dominates; the label is a whisper above it. */
export function StatCard({ label, value, note, tone = "default" }: StatCardProps) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-500">
        {label}
      </p>
      <p
        className={cn(
          "tabular mt-2 text-3xl font-semibold leading-none",
          tone === "paid" ? "text-paid-700" : "text-ink-900",
        )}
      >
        {value}
      </p>
      {note ? <p className="mt-2 text-sm text-ink-500">{note}</p> : null}
    </Card>
  );
}
