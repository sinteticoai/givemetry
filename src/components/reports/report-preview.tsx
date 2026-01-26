// T218: Report preview component
"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Users,
  DollarSign,
  Target,
  Activity,
} from "lucide-react";

interface ReportPreviewProps {
  reportId: string;
}

interface HealthBreakdownItem {
  category: string;
  score: number;
  change: number;
}

interface KeyIssue {
  issue: string;
  impact: string;
  recommendation: string;
}

interface Opportunity {
  rank: number;
  name: string;
  capacity: string;
  priorityScore: number;
  recommendedAction: string;
  reason: string;
}

interface Risk {
  name: string;
  riskLevel: string;
  lastGift: string;
  lifetimeValue: number;
  primaryFactor: string;
}

interface Metric {
  name: string;
  value: string;
  change: number | null;
  trend: "up" | "down" | "stable";
  benchmark: string | null;
}

interface Action {
  priority: number;
  action: string;
  impact: string;
  owner: string | null;
  deadline: string | null;
}

interface OfficerMetric {
  name: string;
  portfolioSize: number;
  totalCapacity: string;
  noContactPercent: number;
  status: "healthy" | "overloaded" | "underutilized";
}

interface ReportContent {
  header: {
    title: string;
    subtitle: string;
    organization: string;
    generatedAt: string;
    dateRange: string;
    logo: string | null;
  };
  portfolioHealth?: {
    overallScore: number;
    trend: "up" | "down" | "stable";
    scoreBreakdown: HealthBreakdownItem[];
    keyIssues: KeyIssue[];
  };
  topOpportunities?: {
    summary: string;
    opportunities: Opportunity[];
    totalPipelineValue: number;
  };
  riskAlerts?: {
    summary: string;
    highRiskCount: number;
    totalAtRiskValue: number;
    topRisks: Risk[];
  };
  keyMetrics?: {
    metrics: Metric[];
  };
  recommendedActions?: {
    summary: string;
    actions: Action[];
  };
  portfolioBalance?: {
    summary: string;
    officerMetrics: OfficerMetric[];
    imbalanceAlerts: string[];
  };
  footer: {
    disclaimer: string;
    generatedBy: string;
    confidentiality: string;
  };
}

export function ReportPreview({ reportId }: ReportPreviewProps) {
  const { data, isLoading, error } = trpc.report.getContent.useQuery({
    id: reportId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold">Failed to load report</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message || "Report content not available"}
        </p>
      </div>
    );
  }

  const content = data.content as ReportContent | null;

  if (!content) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No content</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This report doesn&apos;t have any content yet.
        </p>
      </div>
    );
  }

  const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">{content.header.title}</h1>
        <p className="text-muted-foreground">{content.header.subtitle}</p>
        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{content.header.organization}</span>
          <span>{content.header.dateRange}</span>
          <span>Generated: {new Date(content.header.generatedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Key Metrics */}
      {content.keyMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {content.keyMetrics.metrics.map((metric, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase">
                    {metric.name}
                  </span>
                  <TrendIcon trend={metric.trend} />
                </div>
                <div className="mt-2 text-2xl font-bold">{metric.value}</div>
                {metric.benchmark && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {metric.benchmark}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Portfolio Health */}
      {content.portfolioHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Portfolio Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="text-4xl font-bold text-primary">
                {Math.round(content.portfolioHealth.overallScore * 100)}%
              </div>
              <TrendIcon trend={content.portfolioHealth.trend} />
              <span className="text-muted-foreground">Overall Health Score</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {content.portfolioHealth.scoreBreakdown.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{item.category}</span>
                    <span className="font-medium">{Math.round(item.score * 100)}%</span>
                  </div>
                  <Progress value={item.score * 100} />
                </div>
              ))}
            </div>

            {content.portfolioHealth.keyIssues.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="font-semibold">Key Issues</h4>
                {content.portfolioHealth.keyIssues.map((issue, index) => (
                  <div
                    key={index}
                    className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg"
                  >
                    <div className="font-medium">{issue.issue}</div>
                    <div className="text-sm text-muted-foreground">
                      {issue.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Opportunities */}
        {content.topOpportunities && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {content.topOpportunities.summary}
              </p>
              <div className="space-y-3">
                {content.topOpportunities.opportunities.slice(0, 5).map((opp, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {opp.rank}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{opp.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {opp.capacity} • Score: {Math.round(opp.priorityScore * 100)}%
                      </div>
                      <div className="text-sm text-primary">{opp.recommendedAction}</div>
                    </div>
                  </div>
                ))}
              </div>
              {content.topOpportunities.totalPipelineValue > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-semibold">
                      Total Pipeline: ${content.topOpportunities.totalPipelineValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Risk Alerts */}
        {content.riskAlerts && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                <div className="text-red-700 dark:text-red-300">
                  {content.riskAlerts.summary}
                </div>
              </div>
              <div className="space-y-3">
                {content.riskAlerts.topRisks.slice(0, 5).map((risk, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{risk.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {risk.primaryFactor}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last gift: {risk.lastGift}
                      </div>
                    </div>
                    <Badge
                      variant={risk.riskLevel === "high" ? "destructive" : "secondary"}
                    >
                      {risk.riskLevel}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommended Actions */}
      {content.recommendedActions && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {content.recommendedActions.summary}
            </p>
            <div className="space-y-3">
              {content.recommendedActions.actions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {action.priority}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{action.action}</div>
                    <div className="text-sm text-muted-foreground">{action.impact}</div>
                    {action.deadline && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Due: {action.deadline}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Balance */}
      {content.portfolioBalance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Portfolio Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {content.portfolioBalance.summary}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {content.portfolioBalance.officerMetrics.map((officer, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{officer.name}</span>
                    <Badge
                      variant={
                        officer.status === "healthy"
                          ? "default"
                          : officer.status === "overloaded"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {officer.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                    <div>
                      <div className="font-medium text-foreground">
                        {officer.portfolioSize}
                      </div>
                      <div>Constituents</div>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {officer.totalCapacity}
                      </div>
                      <div>Capacity</div>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {officer.noContactPercent}%
                      </div>
                      <div>No Contact</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {content.portfolioBalance.imbalanceAlerts.length > 0 && (
              <div className="mt-4 space-y-2">
                {content.portfolioBalance.imbalanceAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm"
                  >
                    {alert}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="border-t pt-4 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>{content.footer.generatedBy}</span>
          <span>{content.footer.confidentiality}</span>
        </div>
        <p className="mt-2 italic">{content.footer.disclaimer}</p>
      </div>
    </div>
  );
}
