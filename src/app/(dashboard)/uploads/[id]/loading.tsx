// T254: Upload detail page loading state
import { CardSkeleton, TableSkeleton } from "@/components/shared/loading";

export default function UploadDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 md:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <CardSkeleton />
      <TableSkeleton rows={10} />
    </div>
  );
}
