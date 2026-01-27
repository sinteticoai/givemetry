// T090: HealthStatus component for system health dashboard
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Cpu,
  HardDrive,
  Activity,
  Clock,
  AlertOctagon,
} from "lucide-react";

export type ServiceStatus = "healthy" | "degraded" | "down";

export interface HealthData {
  apiResponseTimeP50: number;
  apiResponseTimeP95: number;
  errorRateLast24h: number;
  uploadQueueDepth: number;
  aiServiceStatus: ServiceStatus;
  databaseStatus: ServiceStatus;
}

export interface HealthStatusProps {
  data: HealthData;
  isLoading?: boolean;
  className?: string;
}

const statusConfig: Record<ServiceStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  healthy: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    label: "Healthy",
  },
  degraded: {
    icon: AlertTriangle,
    color: "text-yellow-600 dark:text-yellow-400",
    label: "Degraded",
  },
  down: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    label: "Down",
  },
};

function StatusIndicator({ status }: { status: ServiceStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2", config.color)}>
      <Icon className="h-5 w-5" />
      <span className="font-medium">{config.label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const variants: Record<ServiceStatus, "default" | "secondary" | "destructive"> = {
    healthy: "default",
    degraded: "secondary",
    down: "destructive",
  };

  return (
    <Badge variant={variants[status]} className={cn(
      status === "healthy" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      status === "degraded" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      status === "down" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    )}>
      {statusConfig[status].label}
    </Badge>
  );
}

export function HealthStatus({ data, isLoading = false, className }: HealthStatusProps) {
  if (isLoading) {
    return <HealthStatusSkeleton className={className} />;
  }

  // Determine overall health
  const getOverallHealth = (): ServiceStatus => {
    if (data.databaseStatus === "down" || data.aiServiceStatus === "down") {
      return "down";
    }
    if (
      data.databaseStatus === "degraded" ||
      data.aiServiceStatus === "degraded" ||
      data.errorRateLast24h > 0.05 ||
      data.apiResponseTimeP95 > 500
    ) {
      return "degraded";
    }
    return "healthy";
  };

  const overallHealth = getOverallHealth();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">System Health</CardTitle>
            <CardDescription>Real-time status of platform services</CardDescription>
          </div>
          <StatusIndicator status={overallHealth} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Service Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Database Status */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Database</span>
            </div>
            <StatusBadge status={data.databaseStatus} />
          </div>

          {/* AI Service Status */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">AI Service</span>
            </div>
            <StatusBadge status={data.aiServiceStatus} />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Performance
          </h4>

          {/* Response Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">P50 Response</span>
              </div>
              <div className="text-2xl font-bold">
                {data.apiResponseTimeP50}
                <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">P95 Response</span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                data.apiResponseTimeP95 > 500 && "text-yellow-600 dark:text-yellow-400",
                data.apiResponseTimeP95 > 1000 && "text-red-600 dark:text-red-400"
              )}>
                {data.apiResponseTimeP95}
                <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
              </div>
            </div>
          </div>

          {/* Error Rate and Queue */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertOctagon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Error Rate (24h)</span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                data.errorRateLast24h > 0.02 && "text-yellow-600 dark:text-yellow-400",
                data.errorRateLast24h > 0.05 && "text-red-600 dark:text-red-400"
              )}>
                {(data.errorRateLast24h * 100).toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground ml-1">%</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload Queue</span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                data.uploadQueueDepth > 10 && "text-yellow-600 dark:text-yellow-400",
                data.uploadQueueDepth > 50 && "text-red-600 dark:text-red-400"
              )}>
                {data.uploadQueueDepth}
                <span className="text-sm font-normal text-muted-foreground ml-1">pending</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HealthStatusSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact health indicator for use in headers/sidebars
export function CompactHealthStatus({
  status,
  label,
  className,
}: {
  status: ServiceStatus;
  label?: string;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className={cn("h-4 w-4", config.color)} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export default HealthStatus;
