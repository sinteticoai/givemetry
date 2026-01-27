// T091: Platform Analytics Page
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  MetricCard,
  MetricCardSkeleton,
  GrowthChart,
  GrowthChartSkeleton,
  HealthStatus,
  HealthStatusSkeleton,
} from "@/components/admin/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  Heart,
  DollarSign,
  Sparkles,
  TrendingUp,
  Activity,
} from "lucide-react";

type Period = "7d" | "30d" | "90d" | "1y";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");

  // Fetch analytics data
  const overviewQuery = trpc.superAdmin.analytics.overview.useQuery();
  const growthQuery = trpc.superAdmin.analytics.growth.useQuery({ period });
  const engagementQuery = trpc.superAdmin.analytics.engagement.useQuery();
  const healthQuery = trpc.superAdmin.analytics.health.useQuery();

  const periodLabels: Record<Period, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "1y": "Last year",
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Platform metrics and performance insights
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewQuery.isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : overviewQuery.data ? (
          <>
            <MetricCard
              title="Organizations"
              value={overviewQuery.data.totalOrganizations}
              description={`${overviewQuery.data.activeOrganizations} active, ${overviewQuery.data.suspendedOrganizations} suspended`}
              icon={Building2}
            />
            <MetricCard
              title="Total Users"
              value={overviewQuery.data.totalUsers}
              description={`${overviewQuery.data.activeUsersLast30Days} active in last 30 days`}
              icon={Users}
            />
            <MetricCard
              title="Constituents"
              value={overviewQuery.data.totalConstituents}
              description="Donors tracked across all orgs"
              icon={Heart}
            />
            <MetricCard
              title="Total Giving"
              value={`$${(overviewQuery.data.totalGiftAmount / 1000000).toFixed(1)}M`}
              description={`${overviewQuery.data.totalGifts.toLocaleString()} gifts recorded`}
              icon={DollarSign}
            />
          </>
        ) : (
          <div className="col-span-4 text-center text-muted-foreground py-8">
            Failed to load overview data
          </div>
        )}
      </div>

      {/* AI Usage Card */}
      {overviewQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Usage
            </CardTitle>
            <CardDescription>
              Artificial intelligence feature adoption
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-3xl font-bold">
                  {overviewQuery.data.aiUsage.briefsGenerated.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  AI actions performed
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {overviewQuery.data.aiUsage.queriesProcessed.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  AI queries processed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Charts */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Growth Trends</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {periodLabels[period]}
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {growthQuery.isLoading ? (
            <>
              <GrowthChartSkeleton />
              <GrowthChartSkeleton />
              <GrowthChartSkeleton />
            </>
          ) : growthQuery.data ? (
            <>
              <GrowthChart
                title="Organizations"
                description="New organizations created"
                data={growthQuery.data.organizations}
                color="blue"
              />
              <GrowthChart
                title="Users"
                description="New user registrations"
                data={growthQuery.data.users}
                color="green"
              />
              <GrowthChart
                title="Constituents"
                description="New donors added"
                data={growthQuery.data.constituents}
                color="purple"
              />
            </>
          ) : (
            <div className="col-span-3 text-center text-muted-foreground py-8">
              Failed to load growth data
            </div>
          )}
        </div>
      </div>

      {/* Engagement Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Users
            </CardTitle>
            <CardDescription>
              User engagement metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {engagementQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : engagementQuery.data ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold">
                    {engagementQuery.data.dailyActiveUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Daily</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold">
                    {engagementQuery.data.weeklyActiveUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Weekly</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold">
                    {engagementQuery.data.monthlyActiveUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Failed to load engagement data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Organizations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Organizations
            </CardTitle>
            <CardDescription>
              Most active organizations (last 30 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {engagementQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : engagementQuery.data?.topOrganizations?.length ? (
              <div className="space-y-3">
                {engagementQuery.data.topOrganizations.map((org, index) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {org.activeUsers} active users
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {org.actionsLast30Days.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">actions</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No organization activity data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Usage */}
      {engagementQuery.data?.featureUsage?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <CardDescription>
              Most used features across the platform (last 30 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {engagementQuery.data.featureUsage.slice(0, 10).map((feature) => (
                <div
                  key={feature.feature}
                  className="p-4 rounded-lg border text-center"
                >
                  <div className="text-2xl font-bold">
                    {feature.usageCount.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium truncate" title={feature.feature}>
                    {feature.feature}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {feature.uniqueUsers} users
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* System Health */}
      <div>
        <h2 className="text-xl font-semibold mb-4">System Health</h2>
        {healthQuery.isLoading ? (
          <HealthStatusSkeleton />
        ) : healthQuery.data ? (
          <HealthStatus data={healthQuery.data} />
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                Failed to load health data
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
