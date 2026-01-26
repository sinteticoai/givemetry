// T229: Alerts page
import { Suspense } from "react";
import { AlertList } from "@/components/alerts/alert-list";
import { AlertSummary } from "@/components/alerts/alert-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell } from "lucide-react";

export const metadata = {
  title: "Alerts | GiveMetry",
  description: "View and manage anomaly and opportunity alerts",
};

export default function AlertsPage() {
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Alerts
          </h1>
          <p className="text-muted-foreground">
            Anomalies and opportunities requiring attention
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <Suspense fallback={<AlertSummarySkeleton />}>
        <AlertSummary />
      </Suspense>

      {/* Alert List */}
      <Suspense fallback={<AlertListSkeleton />}>
        <AlertList />
      </Suspense>
    </div>
  );
}

function AlertSummarySkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  );
}

function AlertListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-10 w-[130px]" />
        <Skeleton className="h-10 w-[130px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  );
}
