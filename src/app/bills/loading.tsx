import {
  LoadingAnnouncement,
  SkeletonHeader,
  SkeletonRows,
} from "@/components/shell/skeleton";

export default function BillsLoading() {
  return (
    <div>
      <LoadingAnnouncement label="Loading bills" />
      <SkeletonHeader />
      <SkeletonRows count={6} />
    </div>
  );
}
