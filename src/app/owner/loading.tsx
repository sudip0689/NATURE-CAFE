import {
  LoadingAnnouncement,
  Skeleton,
  SkeletonHeader,
  SkeletonRows,
} from "@/components/shell/skeleton";

/**
 * Shown for every management screen while its data is in flight.
 *
 * Sits inside OwnerLayout, so the header and the bottom tabs stay put and only
 * the content area swaps — navigation between tabs feels immediate even though
 * the query behind it still has to cross to Mumbai and back.
 */
export default function OwnerLoading() {
  return (
    <div>
      <LoadingAnnouncement label="Loading" />
      <SkeletonHeader />

      {/* Roughly the dashboard's stat grid; harmless on the list screens. */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
        ))}
      </div>

      <SkeletonRows count={4} />
    </div>
  );
}
