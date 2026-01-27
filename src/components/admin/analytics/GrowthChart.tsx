// T089: GrowthChart component for analytics dashboard
"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface GrowthDataPoint {
  date: string;
  count: number;
}

export interface GrowthChartProps {
  title: string;
  description?: string;
  data: GrowthDataPoint[];
  isLoading?: boolean;
  className?: string;
  color?: "blue" | "green" | "purple" | "orange";
  showLabels?: boolean;
  height?: number;
}

const colorStyles = {
  blue: {
    bar: "bg-blue-500",
    barHover: "hover:bg-blue-600",
    text: "text-blue-600 dark:text-blue-400",
  },
  green: {
    bar: "bg-green-500",
    barHover: "hover:bg-green-600",
    text: "text-green-600 dark:text-green-400",
  },
  purple: {
    bar: "bg-purple-500",
    barHover: "hover:bg-purple-600",
    text: "text-purple-600 dark:text-purple-400",
  },
  orange: {
    bar: "bg-orange-500",
    barHover: "hover:bg-orange-600",
    text: "text-orange-600 dark:text-orange-400",
  },
};

export function GrowthChart({
  title,
  description,
  data,
  isLoading = false,
  className,
  color = "blue",
  showLabels = true,
  height = 200,
}: GrowthChartProps) {
  // Calculate chart metrics
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxValue: 0, total: 0, change: 0 };
    }

    const maxValue = Math.max(...data.map((d) => d.count), 1);
    const total = data.reduce((sum, d) => sum + d.count, 0);

    // Calculate percentage change (first half vs second half)
    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint).reduce((sum, d) => sum + d.count, 0);
    const secondHalf = data.slice(midpoint).reduce((sum, d) => sum + d.count, 0);
    const change = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

    return { maxValue, total, change };
  }, [data]);

  if (isLoading) {
    return <GrowthChartSkeleton height={height} className={className} />;
  }

  const colors = colorStyles[color];

  // Format date for display
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {chartData.total.toLocaleString()}
            </div>
            <div
              className={cn(
                "text-sm",
                chartData.change >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {chartData.change >= 0 ? "+" : ""}
              {chartData.change.toFixed(1)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            No data available
          </div>
        ) : (
          <div className="space-y-2">
            {/* Bar chart */}
            <div
              className="flex items-end gap-1"
              style={{ height }}
            >
              {data.map((point) => {
                const heightPercent = (point.count / chartData.maxValue) * 100;
                return (
                  <div
                    key={point.date}
                    className="flex-1 flex flex-col items-center group"
                  >
                    <div className="w-full flex flex-col items-center justify-end h-full">
                      {/* Tooltip on hover */}
                      <div className="hidden group-hover:block absolute -mt-8 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg z-10">
                        <div className="font-semibold">{point.count.toLocaleString()}</div>
                        <div className="text-muted-foreground">
                          {formatDateLabel(point.date)}
                        </div>
                      </div>
                      {/* Bar */}
                      <div
                        className={cn(
                          "w-full rounded-t transition-all duration-200",
                          colors.bar,
                          colors.barHover,
                          "min-h-[4px]"
                        )}
                        style={{
                          height: `${Math.max(heightPercent, 2)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            {showLabels && data.length <= 14 && data.length > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{formatDateLabel(data[0]!.date)}</span>
                <span>{formatDateLabel(data[data.length - 1]!.date)}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GrowthChartSkeleton({
  height = 200,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="text-right">
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1" style={{ height }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Multi-series chart for comparing multiple metrics
export interface MultiSeriesGrowthChartProps {
  title: string;
  description?: string;
  series: Array<{
    name: string;
    data: GrowthDataPoint[];
    color: "blue" | "green" | "purple" | "orange";
  }>;
  isLoading?: boolean;
  className?: string;
  height?: number;
}

export function MultiSeriesGrowthChart({
  title,
  description,
  series,
  isLoading = false,
  className,
  height = 200,
}: MultiSeriesGrowthChartProps) {
  // Find the max value across all series (hooks must come before any returns)
  const maxValue = useMemo(() => {
    return Math.max(
      ...series.flatMap((s) => s.data.map((d) => d.count)),
      1
    );
  }, [series]);

  if (isLoading) {
    return <GrowthChartSkeleton height={height} className={className} />;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {/* Legend */}
        <div className="flex gap-4 mt-2">
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-2 text-sm">
              <div
                className={cn(
                  "w-3 h-3 rounded",
                  colorStyles[s.color].bar
                )}
              />
              <span className="text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {series[0]?.data.length === 0 ? (
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            No data available
          </div>
        ) : (
          <div className="relative" style={{ height }}>
            {/* Render each series as a line/area */}
            {series.map((s, seriesIndex) => (
              <div
                key={s.name}
                className="absolute inset-0 flex items-end gap-1"
                style={{ zIndex: series.length - seriesIndex }}
              >
                {s.data.map((point) => {
                  const heightPercent = (point.count / maxValue) * 100;
                  return (
                    <div
                      key={point.date}
                      className="flex-1"
                      style={{ height: "100%" }}
                    >
                      <div
                        className={cn(
                          "w-full rounded-t transition-all duration-200",
                          colorStyles[s.color].bar,
                          "opacity-60"
                        )}
                        style={{
                          height: `${Math.max(heightPercent, 2)}%`,
                          marginTop: "auto",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GrowthChart;
