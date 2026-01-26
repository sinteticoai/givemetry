// T254: Reports page loading state
import { CardSkeleton, TableSkeleton } from "@/components/shared/loading";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
