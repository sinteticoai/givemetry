// T254: Priorities page loading state
import { CardSkeleton, TableSkeleton } from "@/components/shared/loading";

export default function PrioritiesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-10 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={10} />
    </div>
  );
}
