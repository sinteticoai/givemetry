// T241: Portfolio balance dashboard section
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { OfficerMetricsCard } from "@/components/portfolio/officer-metrics-card";
import { ImbalanceAlerts } from "@/components/portfolio/imbalance-alerts";
import { RebalancingPreview } from "@/components/portfolio/rebalancing-preview";
import { PortfolioDistributionChart } from "@/components/charts/portfolio-distribution-chart";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioBalanceProps {
  className?: string;
}

function PortfolioBalanceSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[200px]" />
      </CardContent>
    </Card>
  );
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

export function PortfolioBalance({ className }: PortfolioBalanceProps) {
  const { data, isLoading, refetch, isRefetching } = trpc.analysis.getPortfolioMetrics.useQuery();

  if (isLoading) {
    return <PortfolioBalanceSkeleton />;
  }

  if (!data) {
    return null;
  }

  const {
    officers,
    totalConstituents,
    unassigned,
    imbalanceAlerts = [],
    imbalanceResult,
    suggestions = [],
    stats,
    capacityDistribution,
  } = data;

  const hasOfficers = officers.length > 0;
  const hasImbalances = imbalanceResult?.hasImbalances ?? false;
  const assignedPercentage = totalConstituents > 0
    ? Math.round((totalConstituents - unassigned) / totalConstituents * 100)
    : 0;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5" />
            Portfolio Balance
          </CardTitle>
          <CardDescription>
            Gift officer portfolio distribution and workload analysis
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {hasImbalances ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Imbalanced
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3" />
              Balanced
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Constituents</p>
            <p className="text-2xl font-bold">{totalConstituents.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-1">Assigned</p>
            <p className="text-2xl font-bold">{assignedPercentage}%</p>
            <p className="text-xs text-muted-foreground">
              {unassigned.toLocaleString()} unassigned
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-1">Avg Portfolio Size</p>
            <p className="text-2xl font-bold">{Math.round(stats.averagePortfolioSize)}</p>
            <p className="text-xs text-muted-foreground">
              Range: {stats.minPortfolioSize} - {stats.maxPortfolioSize}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Capacity</p>
            <p className="text-2xl font-bold">{formatCapacity(stats.totalCapacity)}</p>
            <p className="text-xs text-muted-foreground">
              {formatCapacity(stats.assignedCapacity)} assigned
            </p>
          </div>
        </div>

        {/* Officer metrics */}
        {hasOfficers && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Officer Portfolios
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {officers.map((officer) => (
                <OfficerMetricsCard
                  key={officer.id}
                  officer={officer}
                  averageSize={stats.averagePortfolioSize}
                />
              ))}
            </div>
          </div>
        )}

        {/* Distribution chart */}
        {capacityDistribution && capacityDistribution.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Capacity Distribution</h3>
            <PortfolioDistributionChart
              data={capacityDistribution}
              height={200}
            />
          </div>
        )}

        {/* Imbalance alerts */}
        {hasImbalances && imbalanceAlerts && imbalanceAlerts.length > 0 && (
          <ImbalanceAlerts alerts={imbalanceAlerts} />
        )}

        {/* Rebalancing suggestions */}
        {suggestions && suggestions.length > 0 && (
          <RebalancingPreview suggestions={suggestions} />
        )}

        {/* Empty state */}
        {!hasOfficers && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No gift officers configured yet.</p>
            <p className="text-sm">
              Add users with the Gift Officer role to see portfolio metrics.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
