import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-1/2 max-w-sm" />
      <div className="flex gap-4 border-b border-atr-outline pb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-16" />
        ))}
      </div>
      <SkeletonTable rows={5} />
    </div>
  );
}
