// T131: Lapse risk summary stats component
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, CircleAlert, DollarSign } from "lucide-react";

interface LapseSummaryProps {
  summary: {
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    totalAtRiskValue: number;
  };
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

export function LapseSummary({ summary }: LapseSummaryProps) {
  const totalAtRisk = summary.highRiskCount + summary.mediumRiskCount;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* High Risk */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">High Risk</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{summary.highRiskCount}</div>
          <p className="text-xs text-muted-foreground">
            Likely to lapse within 6 months
          </p>
        </CardContent>
      </Card>

      {/* Medium Risk */}
      <Card className="border-orange-200 dark:border-orange-900/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
          <CircleAlert className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">{summary.mediumRiskCount}</div>
          <p className="text-xs text-muted-foreground">
            May lapse within 12 months
          </p>
        </CardContent>
      </Card>

      {/* Total At Risk */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total At Risk</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAtRisk}</div>
          <p className="text-xs text-muted-foreground">
            Donors requiring attention
          </p>
        </CardContent>
      </Card>

      {/* At-Risk Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">At-Risk Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalAtRiskValue)}</div>
          <p className="text-xs text-muted-foreground">
            Historical giving from at-risk donors
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
