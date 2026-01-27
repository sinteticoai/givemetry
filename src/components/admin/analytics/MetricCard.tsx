// T088: MetricCard component for analytics dashboard
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  isLoading?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: "border-border",
  success: "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
  warning: "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20",
  danger: "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
};

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  isLoading = false,
  variant = "default",
}: MetricCardProps) {
  if (isLoading) {
    return <MetricCardSkeleton />;
  }

  // Format large numbers with commas
  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  // Determine trend icon and color
  const getTrendDisplay = () => {
    if (!trend) return null;

    const isPositive = trend.value > 0;
    const isNeutral = trend.value === 0;

    const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
    const trendColor = isNeutral
      ? "text-muted-foreground"
      : isPositive
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400";

    return (
      <div className="mt-2 flex items-center text-xs">
        <TrendIcon className={cn("mr-1 h-3 w-3", trendColor)} />
        <span className={trendColor}>
          {isPositive && "+"}
          {trend.value}%
        </span>
        <span className="ml-1 text-muted-foreground">{trend.label}</span>
      </div>
    );
  };

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {getTrendDisplay()}
      </CardContent>
    </Card>
  );
}

export function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// Large format metric for hero stats
export interface LargeMetricCardProps extends MetricCardProps {
  submetrics?: Array<{
    label: string;
    value: string | number;
  }>;
}

export function LargeMetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  isLoading = false,
  variant = "default",
  submetrics,
}: LargeMetricCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-12 w-24 mb-2" />
        <Skeleton className="h-4 w-40" />
      </Card>
    );
  }

  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card className={cn(variantStyles[variant], "p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
        {Icon && <Icon className="h-6 w-6 text-muted-foreground" />}
      </div>

      <div className="text-4xl font-bold mb-2">{formattedValue}</div>

      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}

      {trend && (
        <div className="flex items-center text-sm mb-4">
          {trend.value >= 0 ? (
            <TrendingUp className="mr-1 h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="mr-1 h-4 w-4 text-red-600" />
          )}
          <span
            className={
              trend.value >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }
          >
            {trend.value >= 0 && "+"}
            {trend.value}%
          </span>
          <span className="ml-1 text-muted-foreground">{trend.label}</span>
        </div>
      )}

      {submetrics && submetrics.length > 0 && (
        <div className="border-t pt-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            {submetrics.map((metric, index) => (
              <div key={index}>
                <div className="text-sm text-muted-foreground">{metric.label}</div>
                <div className="text-lg font-semibold">
                  {typeof metric.value === "number"
                    ? metric.value.toLocaleString()
                    : metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default MetricCard;
