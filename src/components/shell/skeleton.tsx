import { cn } from "@/lib/cn";

/**
 * Placeholder shapes for a screen still waiting on the database.
 *
 * Next renders the nearest loading.tsx the instant a navigation starts, so the
 * counter gets feedback on the tap rather than a frozen copy of the previous
 * page. That freeze was most of what "laggy" meant here: the work was always
 * happening, nothing on screen said so.
 *
 * These mirror the real layouts closely enough that nothing jumps when the
 * data lands.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-brandline/45", className)}
    />
  );
}

/** Page title + subtitle, matching PageHeader's rhythm. */
export function SkeletonHeader() {
  return (
    <div className="mb-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-3 w-64 max-w-full" />
    </div>
  );
}

/** A stack of list rows — products, bills, categories. */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-card border border-brandline bg-white p-3"
        >
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="mt-2 h-3 w-1/4" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The screen-reader half of a loading state, which skeletons alone don't give. */
export function LoadingAnnouncement({ label }: { label: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {label}
    </p>
  );
}
