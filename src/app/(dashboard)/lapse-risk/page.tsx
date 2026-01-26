// T128: Lapse risk panel page
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw, Filter, Users } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { LapseList } from "@/components/lapse-risk/lapse-list";
import { LapseSummary } from "@/components/lapse-risk/lapse-summary";
import { OfficerFilter } from "@/components/shared/officer-filter";

export default function LapseRiskPage() {
  const [riskLevel, setRiskLevel] = useState<"high" | "medium" | "low" | undefined>(undefined);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | undefined>(undefined);

  const { data, isLoading, error, refetch, isFetching } = trpc.analysis.getLapseRiskList.useQuery({
    limit: 50,
    riskLevel,
    assignedOfficerId: selectedOfficerId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lapse Risk</h1>
          <p className="text-muted-foreground">
            Donors at risk of lapsing based on giving patterns and engagement
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
      ) : data?.summary ? (
        <LapseSummary summary={data.summary} />
      ) : null}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Risk Level</label>
            <div className="flex gap-2">
              <Button
                variant={riskLevel === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => setRiskLevel(undefined)}
              >
                All
              </Button>
              <Button
                variant={riskLevel === "high" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setRiskLevel("high")}
              >
                High
              </Button>
              <Button
                variant={riskLevel === "medium" ? "default" : "outline"}
                size="sm"
                onClick={() => setRiskLevel("medium")}
                className={riskLevel === "medium" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                Medium
              </Button>
              <Button
                variant={riskLevel === "low" ? "default" : "outline"}
                size="sm"
                onClick={() => setRiskLevel("low")}
                className={riskLevel === "low" ? "bg-green-500 hover:bg-green-600" : ""}
              >
                Low
              </Button>
            </div>
          </div>

          <OfficerFilter
            value={selectedOfficerId}
            onChange={setSelectedOfficerId}
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      {error ? (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-4 py-6">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium">Failed to load lapse risk data</p>
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
            <CardTitle>At-Risk Donors</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-60" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : data?.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No at-risk donors found</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {riskLevel
                ? `No donors with ${riskLevel} lapse risk match your filters.`
                : "All your donors appear to be in good standing. Keep up the engagement!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>At-Risk Donors</CardTitle>
            <CardDescription>
              {data?.totalCount} donors identified at risk of lapsing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LapseList items={data?.items || []} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
