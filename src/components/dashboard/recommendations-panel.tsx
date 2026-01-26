// T113: Recommendations panel component
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Lightbulb,
  ArrowRight,
  FileUp,
  Users,
  RefreshCw,
  Zap
} from "lucide-react";

export interface Recommendation {
  id: string;
  type: "completeness" | "freshness" | "consistency" | "coverage" | "general";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;
  impact: string;
  affectedCount?: number;
}

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  className?: string;
  maxItems?: number;
  onActionClick?: (recommendation: Recommendation) => void;
}

function getPriorityColor(priority: "high" | "medium" | "low"): string {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    case "low":
      return "bg-blue-100 text-blue-700";
  }
}

function getTypeIcon(type: Recommendation["type"]) {
  switch (type) {
    case "completeness":
      return <FileUp className="h-5 w-5" />;
    case "freshness":
      return <RefreshCw className="h-5 w-5" />;
    case "consistency":
      return <Zap className="h-5 w-5" />;
    case "coverage":
      return <Users className="h-5 w-5" />;
    case "general":
      return <Lightbulb className="h-5 w-5" />;
  }
}

function getTypeColor(type: Recommendation["type"]): string {
  switch (type) {
    case "completeness":
      return "text-blue-500 bg-blue-50";
    case "freshness":
      return "text-green-500 bg-green-50";
    case "consistency":
      return "text-purple-500 bg-purple-50";
    case "coverage":
      return "text-orange-500 bg-orange-50";
    case "general":
      return "text-gray-500 bg-gray-50";
  }
}

export function RecommendationsPanel({
  recommendations,
  className,
  maxItems = 5,
  onActionClick,
}: RecommendationsPanelProps) {
  const displayedRecs = recommendations.slice(0, maxItems);

  if (recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <Lightbulb className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium">Looking good!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No immediate recommendations at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Recommendations
        </CardTitle>
        <CardDescription>
          Actions to improve your data quality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayedRecs.map((rec) => (
          <div
            key={rec.id}
            className="border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn("rounded-lg p-2", getTypeColor(rec.type))}>
                  {getTypeIcon(rec.type)}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{rec.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rec.description}
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn("shrink-0", getPriorityColor(rec.priority))}
              >
                {rec.priority}
              </Badge>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <ArrowRight className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                <span><strong>Action:</strong> {rec.action}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 mt-0.5 shrink-0" />
                <span><strong>Impact:</strong> {rec.impact}</span>
              </div>
              {rec.affectedCount !== undefined && (
                <div className="text-xs text-muted-foreground">
                  <strong>Affected records:</strong> {rec.affectedCount.toLocaleString()}
                </div>
              )}
            </div>

            {onActionClick && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onActionClick(rec)}
              >
                Take Action
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        ))}

        {recommendations.length > maxItems && (
          <Button variant="ghost" className="w-full">
            View all {recommendations.length} recommendations
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function RecommendationsCompact({
  recommendations,
  maxItems = 3,
}: {
  recommendations: Recommendation[];
  maxItems?: number;
}) {
  const displayedRecs = recommendations.slice(0, maxItems);

  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No recommendations at this time
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {displayedRecs.map((rec) => (
        <div
          key={rec.id}
          className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className={cn("rounded p-1.5", getTypeColor(rec.type))}>
            {getTypeIcon(rec.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{rec.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {rec.description}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={cn("shrink-0 text-xs", getPriorityColor(rec.priority))}
          >
            {rec.priority}
          </Badge>
        </div>
      ))}
    </div>
  );
}
