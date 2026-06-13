import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72" />
      <SkeletonList rows={3} />
    </div>
  );
}
