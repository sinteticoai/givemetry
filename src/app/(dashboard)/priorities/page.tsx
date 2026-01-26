// T147: Priorities page for gift officers
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Filter, TrendingUp, Users, DollarSign, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PriorityList } from "@/components/priorities/priority-list";
import { RefreshButton } from "@/components/priorities/refresh-button";
import { ContactFilter } from "@/components/priorities/contact-filter";
import { OfficerFilter } from "@/components/shared/officer-filter";

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

export default function PrioritiesPage() {
  const [excludeRecentContact, setExcludeRecentContact] = useState(true);
  const [recentContactDays, setRecentContactDays] = useState(7);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | undefined>(undefined);
  const [minPriority, setMinPriority] = useState(0.4);

  const { data, isLoading, error, refetch } = trpc.analysis.getPriorityList.useQuery({
    limit: 10,
    excludeRecentContact,
    recentContactDays,
    assignedOfficerId: selectedOfficerId,
    minPriority,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Priority Prospects</h1>
          <p className="text-muted-foreground">
            Top prospects to focus on based on capacity, timing, and engagement
          </p>
        </div>
        <RefreshButton onRefreshed={() => refetch()} />
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.portfolioSummary ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.portfolioSummary.totalProspects}</div>
              <p className="text-xs text-muted-foreground">
                with priority score above threshold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.portfolioSummary.totalCapacity)}
              </div>
              <p className="text-xs text-muted-foreground">
                combined estimated capacity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Priority Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(data.portfolioSummary.avgPriorityScore * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">
                portfolio average
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ContactFilter
            excludeRecentContact={excludeRecentContact}
            recentContactDays={recentContactDays}
            onExcludeChange={setExcludeRecentContact}
            onDaysChange={setRecentContactDays}
          />

          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Priority</label>
              <div className="flex gap-2">
                <Button
                  variant={minPriority === 0.4 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMinPriority(0.4)}
                >
                  All
                </Button>
                <Button
                  variant={minPriority === 0.7 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMinPriority(0.7)}
                >
                  High Only
                </Button>
              </div>
            </div>

            <OfficerFilter
              value={selectedOfficerId}
              onChange={setSelectedOfficerId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {error ? (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-4 py-6">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium">Failed to load priority list</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
            <Button variant="outline" onClick={() => refetch()} className="ml-auto">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Top Priorities</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-60" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : data?.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No priority prospects found</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {excludeRecentContact
                ? "All high-priority prospects have been contacted recently. Try adjusting the contact filter."
                : "No prospects meet the current filter criteria. Try lowering the minimum priority."}
            </p>
            {excludeRecentContact && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setExcludeRecentContact(false)}
              >
                Show Recently Contacted
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top Priorities
                </CardTitle>
                <CardDescription>
                  {data?.totalCount} prospects prioritized for outreach
                </CardDescription>
              </div>
              <div className="text-sm text-muted-foreground">
                Generated: {data?.generatedAt
                  ? new Date(data.generatedAt).toLocaleString()
                  : "N/A"}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PriorityList
              items={data?.items || []}
              onFeedbackSubmit={() => refetch()}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
