// T254: Donors page loading state
import { TableSkeleton } from "@/components/shared/loading";

export default function DonorsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-10 w-64 animate-pulse rounded bg-muted" />
          <div className="h-10 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <TableSkeleton rows={10} />
    </div>
  );
}
