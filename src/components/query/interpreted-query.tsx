// T188: Interpreted query display component
"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Filter, SortAsc, SortDesc, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QueryFilter {
  field: string;
  operator: string;
  value: unknown;
  humanReadable: string;
}

interface InterpretedQueryProps {
  originalQuery: string;
  interpretation: string;
  filters: QueryFilter[];
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
  className?: string;
}

// Human-readable field names
const FIELD_LABELS: Record<string, string> = {
  total_giving: "Total Giving",
  last_gift_date: "Last Gift",
  last_contact_date: "Last Contact",
  lapse_risk: "Lapse Risk",
  priority_score: "Priority",
  capacity: "Capacity",
  constituent_type: "Type",
  assigned_officer: "Officer",
  class_year: "Class Year",
  school_college: "School/College",
};

function FilterBadge({ filter }: { filter: QueryFilter }) {
  const fieldLabel = FIELD_LABELS[filter.field] || filter.field;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="flex items-center gap-1 px-2 py-1 text-xs font-normal bg-muted/50 hover:bg-muted"
          >
            <Filter className="h-3 w-3" />
            <span className="font-medium">{fieldLabel}:</span>
            <span className="text-muted-foreground">{filter.humanReadable.split(" ").slice(-2).join(" ")}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{filter.humanReadable}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SortBadge({ sort }: { sort: { field: string; direction: string } }) {
  const fieldLabel = FIELD_LABELS[sort.field] || sort.field;
  const SortIcon = sort.direction === "desc" ? SortDesc : SortAsc;

  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1 px-2 py-1 text-xs font-normal bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
    >
      <SortIcon className="h-3 w-3 text-blue-500" />
      <span className="font-medium">Sort:</span>
      <span className="text-muted-foreground">
        {fieldLabel} ({sort.direction === "desc" ? "high to low" : "low to high"})
      </span>
    </Badge>
  );
}

export function InterpretedQuery({
  originalQuery,
  interpretation,
  filters,
  sort,
  className,
}: InterpretedQueryProps) {
  return (
    <Card className={cn("border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            {/* Original query */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">You searched:</span>
              <span className="font-medium">&ldquo;{originalQuery}&rdquo;</span>
            </div>

            {/* AI interpretation */}
            <div className="flex items-start gap-2">
              <span className="text-sm text-muted-foreground shrink-0">Interpreted as:</span>
              <p className="text-sm text-foreground">{interpretation}</p>
            </div>

            {/* Filter and sort badges */}
            {(filters.length > 0 || sort) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {filters.map((filter, index) => (
                  <FilterBadge key={`${filter.field}-${index}`} filter={filter} />
                ))}
                {sort && <SortBadge sort={sort} />}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for inline display
export function InterpretedQueryCompact({
  interpretation,
  filters,
  className,
}: {
  interpretation: string;
  filters: QueryFilter[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Sparkles className="h-4 w-4 text-purple-500" />
      <span className="text-muted-foreground">{interpretation}</span>
      {filters.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs">
                {filters.length} filter{filters.length !== 1 ? "s" : ""}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <ul className="space-y-1">
                {filters.map((filter, index) => (
                  <li key={index} className="text-xs">
                    {filter.humanReadable}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// Error state for when query parsing fails
export function InterpretedQueryError({
  error,
  suggestions,
  className,
}: {
  error: string;
  suggestions?: string[];
  className?: string;
}) {
  return (
    <Card className={cn("border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <p className="text-sm text-foreground">{error}</p>

            {suggestions && suggestions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Try one of these:</p>
                <ul className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
