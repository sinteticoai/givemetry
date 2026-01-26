// T243: Portfolio distribution chart
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CapacityTier {
  label: string;
  minAmount: number;
  maxAmount: number | null;
  count: number;
  totalCapacity: number;
}

interface PortfolioDistributionChartProps {
  data: CapacityTier[];
  height?: number;
  showCapacity?: boolean;
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

// Color palette for capacity tiers (from highest to lowest)
const TIER_COLORS = [
  "bg-emerald-500", // $1M+
  "bg-emerald-400", // $500K-$1M
  "bg-teal-400",    // $250K-$500K
  "bg-cyan-400",    // $100K-$250K
  "bg-sky-400",     // $50K-$100K
  "bg-blue-400",    // $25K-$50K
  "bg-indigo-400",  // $10K-$25K
  "bg-slate-400",   // <$10K
];

export function PortfolioDistributionChart({
  data,
  height = 200,
  showCapacity = true,
  className,
}: PortfolioDistributionChartProps) {
  // Filter out empty tiers and calculate max for scaling
  const nonEmptyTiers = data.filter(tier => tier.count > 0);
  const maxCount = Math.max(...nonEmptyTiers.map(t => t.count), 1);
  const totalConstituents = nonEmptyTiers.reduce((sum, t) => sum + t.count, 0);

  if (nonEmptyTiers.length === 0) {
    return (
      <div
        className={cn("flex items-center justify-center text-muted-foreground", className)}
        style={{ height }}
      >
        <p>No capacity data available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Bar chart */}
      <div
        className="flex items-end gap-1"
        style={{ height: height - 80 }}
      >
        {data.map((tier, index) => {
          const barHeight = tier.count > 0 ? (tier.count / maxCount) * 100 : 0;
          const percentage = totalConstituents > 0
            ? Math.round((tier.count / totalConstituents) * 100)
            : 0;

          return (
            <div
              key={tier.label}
              className="flex-1 flex flex-col items-center group"
            >
              {/* Bar */}
              <div
                className="w-full relative"
                style={{ height: `${height - 80}px` }}
              >
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 rounded-t transition-all group-hover:opacity-80",
                    TIER_COLORS[index] || "bg-gray-400"
                  )}
                  style={{ height: `${barHeight}%`, minHeight: tier.count > 0 ? 4 : 0 }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-popover border rounded-lg p-2 text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <p className="font-semibold">{tier.label}</p>
                    <p>{tier.count} constituents ({percentage}%)</p>
                    {showCapacity && (
                      <p className="text-muted-foreground">
                        {formatCapacity(tier.totalCapacity)} total
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="mt-2 text-center">
                <p className="text-xs font-medium truncate max-w-full">
                  {tier.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tier.count}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend with totals */}
      <div className="flex flex-wrap gap-2 justify-center">
        {nonEmptyTiers.slice(0, 4).map((tier) => {
          const originalIndex = data.findIndex(t => t.label === tier.label);
          return (
            <div key={tier.label} className="flex items-center gap-1.5 text-xs">
              <div
                className={cn(
                  "w-3 h-3 rounded",
                  TIER_COLORS[originalIndex] || "bg-gray-400"
                )}
              />
              <span className="text-muted-foreground">{tier.label}</span>
              <span className="font-medium">{tier.count}</span>
            </div>
          );
        })}
        {nonEmptyTiers.length > 4 && (
          <span className="text-xs text-muted-foreground">
            +{nonEmptyTiers.length - 4} more tiers
          </span>
        )}
      </div>
    </div>
  );
}

// Card wrapper version
export function PortfolioDistributionCard({
  data,
  title = "Capacity Distribution",
  description,
  className,
}: {
  data: CapacityTier[];
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <PortfolioDistributionChart data={data} height={180} />
      </CardContent>
    </Card>
  );
}

// Mini version for summaries
export function PortfolioDistributionMini({
  data,
  className,
}: {
  data: CapacityTier[];
  className?: string;
}) {
  const totalConstituents = data.reduce((sum, t) => sum + t.count, 0);

  if (totalConstituents === 0) {
    return null;
  }

  return (
    <div className={cn("flex h-4 rounded-full overflow-hidden", className)}>
      {data.map((tier, index) => {
        const percentage = (tier.count / totalConstituents) * 100;
        if (percentage < 1) return null;

        return (
          <div
            key={tier.label}
            className={cn(TIER_COLORS[index] || "bg-gray-400")}
            style={{ width: `${percentage}%` }}
            title={`${tier.label}: ${tier.count} (${Math.round(percentage)}%)`}
          />
        );
      })}
    </div>
  );
}
