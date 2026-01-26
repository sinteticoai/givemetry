// T244: Imbalance alerts component
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  User,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ImbalanceAlert {
  officerId: string;
  officerName: string | null;
  type: "overloaded" | "underutilized" | "capacity-heavy" | "balanced";
  severity: "high" | "medium" | "low";
  message: string;
  metrics: {
    constituentCount: number;
    totalCapacity: number;
    deviationFromAverage: number;
  };
}

interface ImbalanceAlertsProps {
  alerts: ImbalanceAlert[];
  className?: string;
  maxVisible?: number;
}

function getSeverityIcon(severity: "high" | "medium" | "low") {
  switch (severity) {
    case "high":
      return <AlertTriangle className="h-4 w-4" />;
    case "medium":
      return <AlertCircle className="h-4 w-4" />;
    case "low":
      return <Info className="h-4 w-4" />;
  }
}

function getSeverityColor(severity: "high" | "medium" | "low") {
  switch (severity) {
    case "high":
      return "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100";
    case "low":
      return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100";
  }
}

function getTypeIcon(type: ImbalanceAlert["type"]) {
  switch (type) {
    case "overloaded":
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    case "underutilized":
      return <TrendingDown className="h-4 w-4 text-blue-500" />;
    case "capacity-heavy":
      return <TrendingUp className="h-4 w-4 text-amber-500" />;
    default:
      return null;
  }
}

function getTypeBadge(type: ImbalanceAlert["type"]) {
  switch (type) {
    case "overloaded":
      return <Badge variant="destructive">Overloaded</Badge>;
    case "underutilized":
      return <Badge variant="outline" className="border-blue-500 text-blue-600">Underutilized</Badge>;
    case "capacity-heavy":
      return <Badge variant="default" className="bg-amber-500">Capacity Heavy</Badge>;
    default:
      return null;
  }
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

function ImbalanceAlertCard({ alert }: { alert: ImbalanceAlert }) {
  const deviationPercent = Math.round(alert.metrics.deviationFromAverage * 100);

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      getSeverityColor(alert.severity)
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {getSeverityIcon(alert.severity)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <User className="h-3.5 w-3.5" />
              <span className="font-semibold">
                {alert.officerName || "Unknown Officer"}
              </span>
              {getTypeBadge(alert.type)}
            </div>
            <p className="text-sm opacity-90">{alert.message}</p>
            <div className="mt-2 flex items-center gap-4 text-xs opacity-75">
              <span>
                {alert.metrics.constituentCount} constituents
              </span>
              <span>
                {formatCapacity(alert.metrics.totalCapacity)} capacity
              </span>
              <span className="flex items-center gap-1">
                {getTypeIcon(alert.type)}
                {deviationPercent > 0 ? "+" : ""}{deviationPercent}% vs avg
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImbalanceAlerts({
  alerts,
  className,
  maxVisible = 3,
}: ImbalanceAlertsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (alerts.length === 0) {
    return null;
  }

  // Sort by severity
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const visibleAlerts = isExpanded ? sortedAlerts : sortedAlerts.slice(0, maxVisible);
  const hasMore = sortedAlerts.length > maxVisible;

  const highCount = alerts.filter(a => a.severity === "high").length;
  const mediumCount = alerts.filter(a => a.severity === "medium").length;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Portfolio Imbalances
          <Badge variant="secondary" className="ml-1">
            {alerts.length}
          </Badge>
        </h3>
        <div className="flex items-center gap-2 text-xs">
          {highCount > 0 && (
            <Badge variant="destructive">{highCount} high</Badge>
          )}
          {mediumCount > 0 && (
            <Badge variant="default" className="bg-amber-500">{mediumCount} medium</Badge>
          )}
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {visibleAlerts.map((alert) => (
          <ImbalanceAlertCard key={alert.officerId} alert={alert} />
        ))}
      </div>

      {/* Show more button */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show {sortedAlerts.length - maxVisible} more
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// Compact summary version
export function ImbalanceSummary({
  alerts,
  className,
}: {
  alerts: ImbalanceAlert[];
  className?: string;
}) {
  if (alerts.length === 0) {
    return (
      <div className={cn("text-sm text-green-600 flex items-center gap-2", className)}>
        <Info className="h-4 w-4" />
        All portfolios are balanced
      </div>
    );
  }

  const highCount = alerts.filter(a => a.severity === "high").length;
  const overloadedCount = alerts.filter(a => a.type === "overloaded").length;
  const underutilizedCount = alerts.filter(a => a.type === "underutilized").length;

  return (
    <Alert variant={highCount > 0 ? "destructive" : "default"} className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Portfolio Imbalance Detected</AlertTitle>
      <AlertDescription>
        {overloadedCount > 0 && `${overloadedCount} overloaded`}
        {overloadedCount > 0 && underutilizedCount > 0 && " and "}
        {underutilizedCount > 0 && `${underutilizedCount} underutilized`}
        {" officers need attention."}
      </AlertDescription>
    </Alert>
  );
}
