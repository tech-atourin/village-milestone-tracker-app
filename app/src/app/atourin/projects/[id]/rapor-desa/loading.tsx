import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-2/3 max-w-md" />
      <SkeletonList rows={4} />
    </div>
  );
}
