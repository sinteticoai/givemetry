// T245: Rebalancing preview component (preview only per spec)
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
  User,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface RebalanceSuggestion {
  constituentId: string;
  constituentName: string;
  fromOfficerId: string;
  fromOfficerName: string | null;
  toOfficerId: string;
  toOfficerName: string | null;
  reason: string;
}

interface RebalancingPreviewProps {
  suggestions: RebalanceSuggestion[];
  className?: string;
  maxVisible?: number;
}

function SuggestionRow({ suggestion }: { suggestion: RebalanceSuggestion }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="truncate max-w-[150px]" title={suggestion.constituentName}>
            {suggestion.constituentName}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground truncate max-w-[100px]">
            {suggestion.fromOfficerName || "Unassigned"}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate max-w-[100px]">
            {suggestion.toOfficerName || "Unassigned"}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground cursor-help truncate block max-w-[200px]">
                {suggestion.reason}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>{suggestion.reason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
}

export function RebalancingPreview({
  suggestions,
  className,
  maxVisible = 5,
}: RebalancingPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (suggestions.length === 0) {
    return null;
  }

  const visibleSuggestions = isExpanded ? suggestions : suggestions.slice(0, maxVisible);
  const hasMore = suggestions.length > maxVisible;

  // Group by officer pair for summary
  const transferGroups = new Map<string, number>();
  suggestions.forEach(s => {
    const key = `${s.fromOfficerName || "Unassigned"} -> ${s.toOfficerName || "Unassigned"}`;
    transferGroups.set(key, (transferGroups.get(key) || 0) + 1);
  });

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Rebalancing Suggestions
          <Badge variant="secondary">{suggestions.length}</Badge>
        </h3>
      </div>

      {/* Info alert */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="text-xs">
          <p className="font-medium">Preview Only</p>
          <p className="opacity-80">
            These are suggested reassignments based on current imbalances.
            Manual action is required to make changes.
          </p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {Array.from(transferGroups.entries()).slice(0, 3).map(([key, count]) => (
          <Badge key={key} variant="outline" className="text-xs">
            {key}: {count}
          </Badge>
        ))}
        {transferGroups.size > 3 && (
          <Badge variant="secondary" className="text-xs">
            +{transferGroups.size - 3} more routes
          </Badge>
        )}
      </div>

      {/* Suggestions table */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Constituent</TableHead>
                <TableHead>Transfer</TableHead>
                <TableHead className="text-right">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleSuggestions.map((suggestion) => (
                <SuggestionRow key={suggestion.constituentId} suggestion={suggestion} />
              ))}
            </TableBody>
          </Table>

          {hasMore && (
            <CollapsibleContent>
              <Table>
                <TableBody>
                  {suggestions.slice(maxVisible).map((suggestion) => (
                    <SuggestionRow key={suggestion.constituentId} suggestion={suggestion} />
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          )}
        </div>

        {hasMore && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full mt-2">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show {suggestions.length - maxVisible} more suggestions
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        )}
      </Collapsible>
    </div>
  );
}

// Card version with more context
export function RebalancingPreviewCard({
  suggestions,
  projectedImprovement,
  className,
}: {
  suggestions: RebalanceSuggestion[];
  projectedImprovement?: number;
  className?: string;
}) {
  if (suggestions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Rebalancing Suggestions
          </CardTitle>
          <CardDescription>
            No rebalancing needed - portfolios are well-distributed
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Rebalancing Suggestions
            </CardTitle>
            <CardDescription>
              {suggestions.length} suggested transfers to improve balance
            </CardDescription>
          </div>
          {projectedImprovement !== undefined && projectedImprovement > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              ~{Math.round(projectedImprovement * 100)}% improvement
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <RebalancingPreview suggestions={suggestions} />
      </CardContent>
    </Card>
  );
}

// Compact summary for dashboard
export function RebalancingSummary({
  suggestions,
  className,
}: {
  suggestions: RebalanceSuggestion[];
  className?: string;
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800",
      className
    )}>
      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {suggestions.length} rebalancing suggestions available
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Review suggested transfers to optimize portfolio distribution
        </p>
      </div>
    </div>
  );
}
