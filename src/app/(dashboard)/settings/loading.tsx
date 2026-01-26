// T254: Settings page loading state
import { CardSkeleton, TableSkeleton } from "@/components/shared/loading";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-28 animate-pulse rounded bg-muted" />
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <CardSkeleton />
      <TableSkeleton rows={5} />
    </div>
  );
}
