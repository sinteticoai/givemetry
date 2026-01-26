// T149: Priority detail card with factor breakdown
// T202: Integrated recommendations into priority detail view
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Clock, TrendingUp, Activity, Calendar, Gift, Lightbulb, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { CompleteActionButton } from "@/components/recommendations/complete-action-button";
import type { PriorityItem } from "./priority-list";

interface PriorityDetailCardProps {
  item: PriorityItem;
  showRecommendation?: boolean;
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case "high":
      return "text-primary";
    case "medium":
      return "text-orange-500";
    default:
      return "text-muted-foreground";
  }
}

function getImpactBadgeVariant(impact: string): "default" | "secondary" | "outline" {
  switch (impact) {
    case "high":
      return "default";
    case "medium":
      return "secondary";
    default:
      return "outline";
  }
}

function getFactorIcon(name: string) {
  switch (name) {
    case "capacity":
      return <DollarSign className="h-4 w-4" />;
    case "likelihood":
      return <TrendingUp className="h-4 w-4" />;
    case "timing":
      return <Clock className="h-4 w-4" />;
    case "recency":
      return <Activity className="h-4 w-4" />;
    default:
      return <TrendingUp className="h-4 w-4" />;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PriorityDetailCard({ item, showRecommendation = true }: PriorityDetailCardProps) {
  // Fetch recommendation for this constituent
  const { data: recommendation, isLoading: recommendationLoading } = trpc.ai.getRecommendation.useQuery(
    { constituentId: item.constituent.id },
    { enabled: showRecommendation }
  );

  return (
    <div className="space-y-4">
      {/* Recommendation Section (T202) */}
      {showRecommendation && (
        <>
          <RecommendationSection
            recommendation={recommendation}
            isLoading={recommendationLoading}
            constituentId={item.constituent.id}
          />
          <Separator />
        </>
      )}

      {/* Scoring Factors */}
      <div>
        <h4 className="text-sm font-medium mb-3">Priority Factors</h4>
        <div className="space-y-3">
          {item.factors.map((factor) => (
            <div key={factor.name} className="flex items-start gap-3">
              <div className={getImpactColor(factor.impact)}>
                {getFactorIcon(factor.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium capitalize">{factor.name}</span>
                  <Badge
                    variant={getImpactBadgeVariant(factor.impact)}
                    className="text-xs capitalize"
                  >
                    {factor.impact}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {factor.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Score Breakdown */}
      <div>
        <h4 className="text-sm font-medium mb-3">Score Breakdown</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Priority Score</span>
            <span className="font-medium">{Math.round(item.priorityScore * 100)}%</span>
          </div>
          <Progress value={item.priorityScore * 100} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Confidence: {Math.round(item.confidence * 100)}%</span>
            <span>{item.timing.indicator}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Engagement Details */}
      <div>
        <h4 className="text-sm font-medium mb-3">Engagement Summary</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Last Contact</div>
              <div className="text-sm">{formatDate(item.engagement.lastContactDate)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Last Gift</div>
              <div className="text-sm">{formatDate(item.engagement.lastGiftDate)}</div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {item.engagement.recentActivitySummary}
        </p>
      </div>

      {/* Capacity Info */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Estimated Capacity</span>
          <span className="text-lg font-semibold">{item.capacityIndicator.label}</span>
        </div>
      </div>
    </div>
  );
}

// T202: Recommendation section for priority detail card
interface RecommendationSectionProps {
  recommendation: {
    action: string;
    actionType: string;
    reasoning: string;
    confidence: number;
    urgencyLevel: "high" | "medium" | "low";
    nextSteps: string[];
    context: {
      primaryFactor: string;
    };
  } | undefined;
  isLoading: boolean;
  constituentId: string;
}

function RecommendationSection({ recommendation, isLoading, constituentId }: RecommendationSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading recommendation...</span>
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!recommendation) {
    return null;
  }

  const urgencyColors = {
    high: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    low: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Recommended Action
        </h4>
        {recommendation.urgencyLevel === "high" && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            High Priority
          </Badge>
        )}
      </div>

      <div className={`p-3 rounded-lg border ${urgencyColors[recommendation.urgencyLevel]}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm">{recommendation.action}</p>
            <p className="text-xs mt-1 opacity-90">{recommendation.context.primaryFactor}</p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {Math.round(recommendation.confidence * 100)}%
          </Badge>
        </div>
      </div>

      {/* Quick next step */}
      {recommendation.nextSteps.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ChevronRight className="h-3 w-3" />
          <span>{recommendation.nextSteps[0]}</span>
        </div>
      )}

      {/* Action button */}
      <div className="flex gap-2">
        <CompleteActionButton
          constituentId={constituentId}
          actionType={recommendation.actionType}
          actionLabel={recommendation.action}
        />
        <Button variant="outline" size="sm" className="flex-1">
          View Details
        </Button>
      </div>
    </div>
  );
}
