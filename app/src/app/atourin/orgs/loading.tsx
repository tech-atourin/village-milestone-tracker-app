import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-40" />
      <SkeletonTable rows={6} />
    </div>
  );
}
