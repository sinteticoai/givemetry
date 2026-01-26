// T242: Officer metrics cards component
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OfficerData {
  id: string;
  name: string | null;
  constituentCount: number;
  totalCapacity?: number;
  averageCapacity?: number;
  highPriorityCount?: number;
  highRiskCount?: number;
  workloadScore?: number;
}

interface OfficerMetricsCardProps {
  officer: OfficerData;
  averageSize: number;
  className?: string;
}

function formatCapacity(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

function getWorkloadStatus(
  count: number,
  averageSize: number
): { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (averageSize === 0) {
    return { label: "Normal", color: "text-gray-500", variant: "secondary" };
  }

  const ratio = count / averageSize;

  if (ratio > 1.5) {
    return { label: "Overloaded", color: "text-red-500", variant: "destructive" };
  }
  if (ratio > 1.2) {
    return { label: "Heavy", color: "text-orange-500", variant: "default" };
  }
  if (ratio < 0.5) {
    return { label: "Light", color: "text-blue-500", variant: "outline" };
  }
  if (ratio < 0.8) {
    return { label: "Below Avg", color: "text-blue-400", variant: "secondary" };
  }

  return { label: "Balanced", color: "text-green-500", variant: "secondary" };
}

function getWorkloadProgress(count: number, averageSize: number): number {
  if (averageSize === 0) return 50;

  const ratio = count / averageSize;
  // Map ratio to percentage (0.5x = 25%, 1x = 50%, 1.5x = 75%, 2x = 100%)
  return Math.min(100, Math.max(0, ratio * 50));
}

export function OfficerMetricsCard({ officer, averageSize, className }: OfficerMetricsCardProps) {
  const {
    name,
    constituentCount,
    totalCapacity = 0,
    highPriorityCount = 0,
    highRiskCount = 0,
    workloadScore = 0,
  } = officer;

  const workloadStatus = getWorkloadStatus(constituentCount, averageSize);
  const workloadProgress = getWorkloadProgress(constituentCount, averageSize);
  const deviationPercent = averageSize > 0
    ? Math.round(((constituentCount - averageSize) / averageSize) * 100)
    : 0;

  return (
    <TooltipProvider>
      <Card className={cn("hover:shadow-md transition-shadow", className)}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-sm truncate max-w-[150px]">
                {name || "Unnamed Officer"}
              </h4>
              <Badge variant={workloadStatus.variant} className="mt-1 text-xs">
                {workloadStatus.label}
              </Badge>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{constituentCount}</span>
              <p className="text-xs text-muted-foreground">constituents</p>
            </div>
          </div>

          {/* Workload progress bar */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Workload</span>
              <span className={cn("font-medium", workloadStatus.color)}>
                {deviationPercent > 0 ? "+" : ""}{deviationPercent}% vs avg
              </span>
            </div>
            <Progress
              value={workloadProgress}
              className={cn(
                "h-2",
                workloadProgress > 75 && "[&>div]:bg-red-500",
                workloadProgress > 60 && workloadProgress <= 75 && "[&>div]:bg-orange-500",
                workloadProgress <= 40 && "[&>div]:bg-blue-500"
              )}
            />
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 p-2 rounded bg-muted/50">
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{formatCapacity(totalCapacity)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total managed capacity</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 p-2 rounded bg-muted/50">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  <span className="font-medium">{highPriorityCount}</span>
                  <span className="text-xs text-muted-foreground">priority</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>High priority prospects (score &gt;= 0.7)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 p-2 rounded bg-muted/50">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-medium">{highRiskCount}</span>
                  <span className="text-xs text-muted-foreground">at risk</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>High lapse risk donors (score &gt;= 0.7)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 p-2 rounded bg-muted/50">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{Math.round(workloadScore * 100)}%</span>
                  <span className="text-xs text-muted-foreground">load</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Workload score based on portfolio composition</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// Compact version for lists
export function OfficerMetricsCompact({
  officer,
  averageSize,
}: {
  officer: OfficerData;
  averageSize: number;
}) {
  const { name, constituentCount } = officer;
  const workloadStatus = getWorkloadStatus(constituentCount, averageSize);
  const deviationPercent = averageSize > 0
    ? Math.round(((constituentCount - averageSize) / averageSize) * 100)
    : 0;

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
          {(name || "?").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-sm">{name || "Unnamed"}</p>
          <p className="text-xs text-muted-foreground">{constituentCount} constituents</p>
        </div>
      </div>
      <div className="text-right">
        <Badge variant={workloadStatus.variant} className="text-xs">
          {deviationPercent > 0 ? "+" : ""}{deviationPercent}%
        </Badge>
      </div>
    </div>
  );
}
