// T254: Search page loading state
import { TableSkeleton, Skeleton } from "@/components/shared/loading";

export default function SearchLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 animate-pulse rounded bg-muted" />
      </div>
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="mb-4 h-4 w-48" />
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}
