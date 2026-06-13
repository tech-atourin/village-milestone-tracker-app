import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-4 w-72" />
      <SkeletonTable rows={8} />
    </div>
  );
}
