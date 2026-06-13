import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-4 w-72" />
      <SkeletonList rows={3} />
    </div>
  );
}
