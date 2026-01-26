// T230: Alert list component
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { AlertDetailCard } from "./alert-detail-card";
import { AlertActions } from "./alert-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Bell, TrendingUp, UserX, Filter, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertListProps {
  initialStatus?: "active" | "dismissed" | "acted_on";
}

const alertTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  contact_gap: UserX,
  engagement_spike: TrendingUp,
  giving_pattern_change: AlertTriangle,
};

const alertTypeLabels: Record<string, string> = {
  contact_gap: "Contact Gap",
  engagement_spike: "Engagement Spike",
  giving_pattern_change: "Giving Pattern Change",
};

const severityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
};

export function AlertList({ initialStatus = "active" }: AlertListProps) {
  const [status, setStatus] = useState<"active" | "dismissed" | "acted_on" | "all">(
    initialStatus
  );
  const [severity, setSeverity] = useState<"high" | "medium" | "low" | "all">("all");
  const [alertType, setAlertType] = useState<string>("all");
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.alert.list.useInfiniteQuery(
    {
      limit: 20,
      status: status === "all" ? undefined : status,
      severity: severity === "all" ? undefined : severity,
      alertType: alertType === "all" ? undefined : alertType,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const alerts = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return <AlertListSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load alerts: {error.message}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => refetch()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as "active" | "dismissed" | "acted_on" | "all")
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
              <SelectItem value="acted_on">Acted On</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select
          value={severity}
          onValueChange={(value) =>
            setSeverity(value as "high" | "medium" | "low" | "all")
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={alertType} onValueChange={setAlertType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alert Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="contact_gap">Contact Gap</SelectItem>
            <SelectItem value="engagement_spike">Engagement Spike</SelectItem>
            <SelectItem value="giving_pattern_change">Pattern Change</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Alert List */}
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
          <Bell className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No alerts found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {status === "active"
              ? "All caught up! No active alerts at this time."
              : "No alerts match the selected filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = alertTypeIcons[alert.alertType] || Bell;
            const isSelected = selectedAlertId === alert.id;

            return (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg border bg-card transition-colors",
                  isSelected && "ring-2 ring-primary",
                  alert.status === "active" && "border-l-4",
                  alert.status === "active" &&
                    alert.severity === "high" &&
                    "border-l-red-500",
                  alert.status === "active" &&
                    alert.severity === "medium" &&
                    "border-l-yellow-500",
                  alert.status === "active" &&
                    alert.severity === "low" &&
                    "border-l-blue-500"
                )}
              >
                <button
                  onClick={() =>
                    setSelectedAlertId(isSelected ? null : alert.id)
                  }
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "rounded-lg p-2",
                        alert.severity === "high" &&
                          "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
                        alert.severity === "medium" &&
                          "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
                        alert.severity === "low" &&
                          "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium truncate">{alert.title}</h4>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            severityColors[alert.severity]
                          )}
                        >
                          {alert.severity}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {alertTypeLabels[alert.alertType] || alert.alertType}
                        </Badge>
                        {alert.status !== "active" && (
                          <Badge variant="outline" className="text-xs">
                            {alert.status === "dismissed"
                              ? "Dismissed"
                              : "Acted On"}
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {alert.description}
                      </p>

                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Constituent:{" "}
                          <span className="font-medium text-foreground">
                            {alert.constituent.firstName}{" "}
                            {alert.constituent.lastName}
                          </span>
                        </span>
                        <span>
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {isSelected && (
                  <div className="border-t px-4 py-3">
                    <AlertDetailCard alert={alert} />
                    {alert.status === "active" && (
                      <div className="mt-4 pt-4 border-t">
                        <AlertActions
                          alertId={alert.id}
                          onSuccess={() => {
                            setSelectedAlertId(null);
                            refetch();
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {hasNextPage && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading..." : "Load More"}
            </Button>
          )}
        </div>
      )}
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
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
