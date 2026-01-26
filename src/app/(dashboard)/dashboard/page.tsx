// T109: Main dashboard page
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { HealthScoreCard } from "@/components/dashboard/health-score-card";
import { HealthBreakdown } from "@/components/dashboard/health-breakdown";
import { IssueList, type HealthIssue } from "@/components/dashboard/issue-list";
import { RecommendationsPanel } from "@/components/dashboard/recommendations-panel";
import { HealthTrendChart } from "@/components/charts/health-trend-chart";
import {
  Users,
  Gift,
  MessageSquare,
  Upload,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="flex items-center mt-2 text-xs">
            <TrendingUp className={`h-3 w-3 mr-1 ${trend.value >= 0 ? "text-green-500" : "text-red-500"}`} />
            <span className={trend.value >= 0 ? "text-green-500" : "text-red-500"}>
              {trend.value >= 0 ? "+" : ""}{trend.value}%
            </span>
            <span className="text-muted-foreground ml-1">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyStateCard() {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Get Started with GiveMetry</CardTitle>
        <CardDescription>
          Upload your constituent data to unlock AI-powered insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            1
          </div>
          <div>
            <h3 className="font-medium">Upload your data</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Export your constituent, gift, and contact data from your CRM and
              upload it to GiveMetry. We support CSV exports from most major
              systems.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            2
          </div>
          <div>
            <h3 className="font-medium">Review data health</h3>
            <p className="text-sm text-muted-foreground mt-1">
              See your data quality scores and get recommendations for
              improving data completeness and accuracy.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            3
          </div>
          <div>
            <h3 className="font-medium">Get AI-powered insights</h3>
            <p className="text-sm text-muted-foreground mt-1">
              View lapse risk predictions, prospect prioritization, and
              generate donor briefs for your next meetings.
            </p>
          </div>
        </div>
        <Link href="/uploads">
          <Button className="w-full mt-4">
            <Upload className="h-4 w-4 mr-2" />
            Upload Data
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: healthData, isLoading: healthLoading } = trpc.analysis.getHealthScores.useQuery();
  const { data: historyData } = trpc.analysis.getHealthHistory.useQuery({ days: 30 });

  if (healthLoading) {
    return <DashboardSkeleton />;
  }

  const hasData = healthData && healthData.stats.constituentCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}!
          </p>
        </div>
        {hasData && (
          <Link href="/uploads">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload Data
            </Button>
          </Link>
        )}
      </div>

      {/* Empty state */}
      {!hasData && <EmptyStateCard />}

      {/* Stats cards */}
      {hasData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Constituents"
            value={healthData.stats.constituentCount.toLocaleString()}
            description={`${healthData.stats.assignedCount.toLocaleString()} assigned to officers`}
            icon={Users}
          />
          <StatCard
            title="Gift Records"
            value={healthData.stats.giftCount.toLocaleString()}
            description={`${healthData.stats.constituentsWithGifts.toLocaleString()} constituents with gifts`}
            icon={Gift}
          />
          <StatCard
            title="Contact Records"
            value={healthData.stats.contactCount.toLocaleString()}
            description={`${healthData.stats.constituentsWithContacts.toLocaleString()} constituents with contacts`}
            icon={MessageSquare}
          />
          <StatCard
            title="Active Issues"
            value={healthData.issues.length}
            description={
              healthData.issues.filter((i: HealthIssue) => i.severity === "high").length > 0
                ? `${healthData.issues.filter((i: HealthIssue) => i.severity === "high").length} high priority`
                : "No critical issues"
            }
            icon={AlertTriangle}
          />
        </div>
      )}

      {/* Health overview section */}
      {hasData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Overall health score */}
          <HealthScoreCard
            score={healthData.overall}
            title="Data Health"
            subtitle="Overall data quality score"
          />

          {/* Health breakdown */}
          <HealthBreakdown
            completeness={healthData.completeness}
            freshness={healthData.freshness}
            consistency={healthData.consistency}
            coverage={healthData.coverage}
          />

          {/* Health trend */}
          <HealthTrendChart
            data={historyData?.data || []}
            height={250}
            showLegend={false}
          />
        </div>
      )}

      {/* Issues and recommendations */}
      {hasData && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Issues list */}
          <IssueList issues={healthData.issues} maxItems={5} />

          {/* Recommendations */}
          <RecommendationsPanel
            recommendations={healthData.recommendations}
            maxItems={3}
          />
        </div>
      )}

      {/* Quick actions */}
      {hasData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/lapse-risk" className="block">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Lapse Risk
                  <ArrowRight className="h-4 w-4" />
                </CardTitle>
                <CardDescription>
                  View donors at risk of lapsing with explainable AI predictions
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/priorities" className="block">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Priority Prospects
                  <ArrowRight className="h-4 w-4" />
                </CardTitle>
                <CardDescription>
                  See which prospects to focus on with composite scoring
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/donors" className="block">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Donor Directory
                  <ArrowRight className="h-4 w-4" />
                </CardTitle>
                <CardDescription>
                  Browse and search your constituent database
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      )}

      {/* Freshness info */}
      {hasData && healthData.freshnessDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Freshness</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Last Gift</p>
              <p className="text-lg font-semibold">
                {healthData.freshnessDetails.daysSinceLastGift !== null
                  ? healthData.freshnessDetails.daysSinceLastGift === 0
                    ? "Today"
                    : `${healthData.freshnessDetails.daysSinceLastGift} days ago`
                  : "No data"}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Last Contact</p>
              <p className="text-lg font-semibold">
                {healthData.freshnessDetails.daysSinceLastContact !== null
                  ? healthData.freshnessDetails.daysSinceLastContact === 0
                    ? "Today"
                    : `${healthData.freshnessDetails.daysSinceLastContact} days ago`
                  : "No data"}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Last Upload</p>
              <p className="text-lg font-semibold">
                {healthData.freshnessDetails.daysSinceLastUpload !== null
                  ? healthData.freshnessDetails.daysSinceLastUpload === 0
                    ? "Today"
                    : `${healthData.freshnessDetails.daysSinceLastUpload} days ago`
                  : "Never"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
