// T112: Issue list component with examples
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, ChevronRight } from "lucide-react";

export interface HealthIssue {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  count?: number;
  percentage?: number;
  examples?: string[];
}

interface IssueListProps {
  issues: HealthIssue[];
  className?: string;
  maxItems?: number;
  showExamples?: boolean;
}

function getSeverityIcon(severity: "high" | "medium" | "low") {
  switch (severity) {
    case "high":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "medium":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case "low":
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function getSeverityBadge(severity: "high" | "medium" | "low") {
  const variants = {
    high: "bg-red-100 text-red-700 hover:bg-red-100",
    medium: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
    low: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  };

  return (
    <Badge variant="secondary" className={cn("text-xs", variants[severity])}>
      {severity}
    </Badge>
  );
}

export function IssueList({
  issues,
  className,
  maxItems = 10,
  showExamples = false,
}: IssueListProps) {
  const displayedIssues = issues.slice(0, maxItems);
  const remainingCount = issues.length - maxItems;

  if (issues.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Data Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <AlertCircle className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium">No issues detected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your data looks healthy!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Data Issues</CardTitle>
        <Badge variant="secondary" className="ml-2">
          {issues.length} {issues.length === 1 ? "issue" : "issues"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedIssues.map((issue, index) => (
            <div
              key={`${issue.type}-${index}`}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="mt-0.5">{getSeverityIcon(issue.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {issue.message}
                  </span>
                  {getSeverityBadge(issue.severity)}
                </div>
                {showExamples && issue.examples && issue.examples.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Examples:</p>
                    <ul className="list-disc list-inside">
                      {issue.examples.slice(0, 3).map((example, i) => (
                        <li key={i} className="truncate">{example}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {(issue.count || issue.percentage) && (
                <div className="text-right shrink-0">
                  {issue.count && (
                    <span className="text-sm font-medium">{issue.count}</span>
                  )}
                  {issue.percentage && (
                    <span className="text-xs text-muted-foreground block">
                      {issue.percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          {remainingCount > 0 && (
            <button className="flex items-center justify-center w-full p-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <span>+{remainingCount} more issues</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function IssueListCompact({ issues, maxItems = 5 }: { issues: HealthIssue[]; maxItems?: number }) {
  const displayedIssues = issues.slice(0, maxItems);

  if (issues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No issues detected
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {displayedIssues.map((issue, index) => (
        <div
          key={`${issue.type}-${index}`}
          className="flex items-center gap-2 text-sm"
        >
          {getSeverityIcon(issue.severity)}
          <span className="truncate flex-1">{issue.message}</span>
        </div>
      ))}
    </div>
  );
}
