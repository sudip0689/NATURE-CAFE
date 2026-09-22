import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Nothing here yet — one line, and the action that fixes it. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-cream-300 bg-cream-50/60 px-6 py-14 text-center">
      <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
      {hint ? <p className="mx-auto mt-1.5 max-w-sm text-ink-500">{hint}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Something went wrong, said without SQL or a stack trace. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-control border border-alert-500/30 bg-alert-50 px-4 py-3 text-sm text-alert-600"
    >
      <span aria-hidden="true" className="font-semibold">
        !
      </span>
      {children}
    </p>
  );
}

/** The one green moment outside a completed payment: a save that landed. */
export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-control border border-paid-500/30 bg-paid-50 px-4 py-3 text-sm text-paid-700"
    >
      <span aria-hidden="true" className="font-semibold">
        ✓
      </span>
      {children}
    </p>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "paid" | "muted";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "paid" && "bg-paid-50 text-paid-700",
        tone === "muted" && "bg-cream-200 text-ink-500",
        tone === "neutral" && "bg-bean-100 text-bean-700",
      )}
    >
      {children}
    </span>
  );
}
