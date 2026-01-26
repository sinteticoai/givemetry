// T254: Uploads page loading state
import { CardSkeleton, TableSkeleton } from "@/components/shared/loading";

export default function UploadsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-10 w-36 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <CardSkeleton />
      <TableSkeleton rows={5} />
    </div>
  );
}
