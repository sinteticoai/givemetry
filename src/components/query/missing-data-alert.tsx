// T192: Missing data explanation component
"use client";

import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, AlertTriangle, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface MissingDataAlertProps {
  missingFields?: string[];
  queryErrors?: string[];
  showUploadLink?: boolean;
  className?: string;
}

// Human-readable field names and descriptions
const FIELD_INFO: Record<string, { label: string; description: string }> = {
  total_giving: {
    label: "Total Giving",
    description: "Lifetime gift amounts for each constituent",
  },
  last_gift_date: {
    label: "Last Gift Date",
    description: "Most recent gift date for each constituent",
  },
  last_contact_date: {
    label: "Last Contact Date",
    description: "Most recent contact/interaction date",
  },
  lapse_risk: {
    label: "Lapse Risk Scores",
    description: "Calculated risk scores (run analysis after data upload)",
  },
  priority_score: {
    label: "Priority Scores",
    description: "Calculated priority scores (run analysis after data upload)",
  },
  capacity: {
    label: "Capacity Data",
    description: "Estimated giving capacity for each constituent",
  },
  constituent_type: {
    label: "Constituent Type",
    description: "Classification (alumni, parent, friend, etc.)",
  },
  class_year: {
    label: "Class Year",
    description: "Graduation year for alumni constituents",
  },
  school_college: {
    label: "School/College",
    description: "School or college affiliation",
  },
};

export function MissingDataAlert({
  missingFields = [],
  queryErrors = [],
  showUploadLink = true,
  className,
}: MissingDataAlertProps) {
  const [expanded, setExpanded] = React.useState(false);

  const hasIssues = missingFields.length > 0 || queryErrors.length > 0;

  if (!hasIssues) return null;

  return (
    <Alert
      variant="default"
      className={cn(
        "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20",
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        Some data may be incomplete
      </AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
        <div className="space-y-2 mt-2">
          {queryErrors.length > 0 && (
            <p className="text-sm">
              {queryErrors.join(" ")}
            </p>
          )}

          {missingFields.length > 0 && (
            <>
              <p className="text-sm">
                Your search uses fields that may not have complete data:
              </p>

              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-sm font-medium hover:underline"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {missingFields.length} field{missingFields.length !== 1 ? "s" : ""} may need data
              </button>

              {expanded && (
                <ul className="space-y-2 mt-2 pl-4">
                  {missingFields.map((field) => {
                    const info = FIELD_INFO[field] || { label: field, description: "" };
                    return (
                      <li key={field} className="text-sm">
                        <span className="font-medium">{info.label}:</span>{" "}
                        <span className="text-muted-foreground">{info.description}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {showUploadLink && (
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm" asChild>
                <a href="/uploads">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Data
                </a>
              </Button>
              <span className="text-xs text-muted-foreground">
                Upload more data to improve search results
              </span>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Inline hint for fields that might not have data
export function FieldDataHint({
  field,
  className,
}: {
  field: string;
  className?: string;
}) {
  const info = FIELD_INFO[field];
  if (!info) return null;

  return (
    <div className={cn("flex items-start gap-2 text-xs text-muted-foreground", className)}>
      <Info className="h-3 w-3 mt-0.5 shrink-0" />
      <span>
        <span className="font-medium">{info.label}</span>: {info.description}
      </span>
    </div>
  );
}

// Empty results explanation
export function NoResultsExplanation({
  query,
  filters,
  className,
}: {
  query: string;
  filters: Array<{ field: string; humanReadable: string }>;
  className?: string;
}) {
  const possibleReasons = [
    "No constituents match all the specified criteria",
    "Data for the requested fields may not have been uploaded yet",
    "The search criteria may be too restrictive",
  ];

  const suggestions = [
    "Try removing some filters to broaden the search",
    "Check if the relevant data has been uploaded",
    "Use different phrasing for your query",
  ];

  return (
    <Alert className={cn("border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20", className)}>
      <Info className="h-4 w-4 text-blue-600" />
      <AlertTitle>No Results Found</AlertTitle>
      <AlertDescription>
        <div className="space-y-3 mt-2">
          <p className="text-sm">
            Your search for &ldquo;{query}&rdquo; returned no results.
          </p>

          {filters.length > 0 && (
            <div className="text-sm">
              <p className="font-medium mb-1">Applied filters:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {filters.map((f, i) => (
                  <li key={i}>{f.humanReadable}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-sm">
            <p className="font-medium mb-1">Possible reasons:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              {possibleReasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>

          <div className="text-sm">
            <p className="font-medium mb-1">Suggestions:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              {suggestions.map((suggestion, i) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
