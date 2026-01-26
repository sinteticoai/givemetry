// T187: Query results display component
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { User, DollarSign, Calendar, AlertTriangle, Star, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface QueryResult {
  id: string;
  displayName: string;
  email: string | null;
  totalGiving: number;
  lastGiftDate: Date | string | null;
  lastContactDate: Date | string | null;
  priorityScore: number | null;
  lapseRiskLevel: "high" | "medium" | "low" | null;
}

interface QueryResultsProps {
  results: QueryResult[];
  totalCount: number;
  isLoading?: boolean;
  onResultClick?: (id: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

function RiskBadge({ level }: { level: "high" | "medium" | "low" | null }) {
  if (!level) return <span className="text-muted-foreground text-sm">-</span>;

  const variants: Record<string, { variant: "destructive" | "default" | "secondary"; label: string }> = {
    high: { variant: "destructive", label: "High Risk" },
    medium: { variant: "default", label: "Medium" },
    low: { variant: "secondary", label: "Low" },
  };

  const config = variants[level];
  if (!config) return <span className="text-muted-foreground text-sm">-</span>;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function PriorityIndicator({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground text-sm">-</span>;

  const percentage = Math.round(score * 100);
  let color = "text-muted-foreground";
  if (percentage >= 80) color = "text-yellow-500";
  else if (percentage >= 60) color = "text-blue-500";

  return (
    <div className="flex items-center gap-1">
      <Star className={`h-4 w-4 ${color}`} />
      <span className="text-sm">{percentage}%</span>
    </div>
  );
}

export function QueryResults({
  results,
  totalCount,
  isLoading = false,
  onResultClick,
}: QueryResultsProps) {
  const router = useRouter();

  const handleRowClick = (id: string) => {
    if (onResultClick) {
      onResultClick(id);
    } else {
      router.push(`/donors/${id}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title="No results found"
        description="Try adjusting your search query or use different criteria."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Search Results
        </CardTitle>
        <CardDescription>
          Found {totalCount.toLocaleString()} constituent{totalCount !== 1 ? "s" : ""}
          {results.length < totalCount && ` (showing ${results.length})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Total Giving</TableHead>
              <TableHead>Last Gift</TableHead>
              <TableHead>Last Contact</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow
                key={result.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(result.id)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{result.displayName}</span>
                    {result.email && (
                      <span className="text-sm text-muted-foreground">{result.email}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span>{formatCurrency(result.totalGiving)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(result.lastGiftDate)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {formatDate(result.lastContactDate)}
                  </div>
                </TableCell>
                <TableCell>
                  <PriorityIndicator score={result.priorityScore} />
                </TableCell>
                <TableCell>
                  <RiskBadge level={result.lapseRiskLevel} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Summary stats component for query results
export function QueryResultsSummary({ results }: { results: QueryResult[] }) {
  const totalGiving = results.reduce((sum, r) => sum + r.totalGiving, 0);
  const highRiskCount = results.filter((r) => r.lapseRiskLevel === "high").length;
  const highPriorityCount = results.filter((r) => r.priorityScore !== null && r.priorityScore >= 0.8).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">Total Constituents</div>
          <div className="text-2xl font-bold">{results.length.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">Combined Giving</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalGiving)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            High Risk
          </div>
          <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" />
            High Priority
          </div>
          <div className="text-2xl font-bold text-yellow-600">{highPriorityCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}
