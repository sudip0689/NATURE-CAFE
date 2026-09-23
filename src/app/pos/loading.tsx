import { LoadingAnnouncement, Skeleton } from "@/components/shell/skeleton";

/**
 * The till, mid-open.
 *
 * /pos has no layout above it but the root one, so this stands in for the
 * whole screen. It draws the same furniture the real till has — header bar,
 * search, category strip, product grid, pinned cart bar — so the moment the
 * menu arrives nothing shifts under the cashier's thumb.
 */
export default function PosLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <LoadingAnnouncement label="Opening the till" />

      <div className="flex h-appheader shrink-0 items-center gap-2 border-b border-brandline/70 px-4 sm:px-5">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>

      <div className="space-y-3 border-b border-brandline px-4 py-3">
        <Skeleton className="h-11 w-full rounded-control" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-card border border-brandline bg-white"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="p-3">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-brandline bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Skeleton className="h-12 w-full rounded-control" />
      </div>
    </div>
  );
}
