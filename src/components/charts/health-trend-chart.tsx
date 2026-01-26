// T114: Health trend chart with Recharts
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface HealthTrendData {
  date: string;
  overall: number;
  completeness: number;
  freshness: number;
  consistency: number;
  coverage: number;
}

interface HealthTrendChartProps {
  data: HealthTrendData[];
  className?: string;
  height?: number;
  showLegend?: boolean;
  showAllCategories?: boolean;
}

const CATEGORY_COLORS = {
  overall: "#3b82f6", // blue-500
  completeness: "#8b5cf6", // violet-500
  freshness: "#22c55e", // green-500
  consistency: "#f59e0b", // amber-500
  coverage: "#ec4899", // pink-500
};

const CATEGORY_LABELS = {
  overall: "Overall",
  completeness: "Completeness",
  freshness: "Freshness",
  consistency: "Consistency",
  coverage: "Coverage",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTooltipValue(value: number): string {
  return `${Math.round(value * 100)}%`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {CATEGORY_LABELS[entry.dataKey as keyof typeof CATEGORY_LABELS]}:
            </span>
            <span className="font-medium">{formatTooltipValue(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HealthTrendChart({
  data,
  className,
  height = 300,
  showLegend = true,
  showAllCategories = false,
}: HealthTrendChartProps) {
  // If no data, show placeholder
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Health Score Trend</CardTitle>
          <CardDescription>
            Track your data quality over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex flex-col items-center justify-center text-center text-muted-foreground"
            style={{ height }}
          >
            <p className="text-sm">Not enough historical data to show trends.</p>
            <p className="text-xs mt-1">
              Check back after a few data uploads.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for display
  const chartData = data.map((d) => ({
    ...d,
    formattedDate: formatDate(d.date),
  }));

  const categories = showAllCategories
    ? ["overall", "completeness", "freshness", "consistency", "coverage"]
    : ["overall"];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Health Score Trend</CardTitle>
        <CardDescription>
          Track your data quality over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${Math.round(value * 100)}%`}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) =>
                  CATEGORY_LABELS[value as keyof typeof CATEGORY_LABELS]
                }
              />
            )}
            {categories.map((category) => (
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                stroke={CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}
                strokeWidth={category === "overall" ? 2.5 : 1.5}
                dot={category === "overall"}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function HealthTrendSparkline({
  data,
  className,
  height = 50,
}: {
  data: HealthTrendData[];
  className?: string;
  height?: number;
}) {
  if (!data || data.length < 2) {
    return (
      <div
        className={cn("flex items-center justify-center text-xs text-muted-foreground", className)}
        style={{ height }}
      >
        No trend data
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="overall"
            stroke={CATEGORY_COLORS.overall}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
