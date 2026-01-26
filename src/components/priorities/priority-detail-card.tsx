// T149: Priority detail card with factor breakdown
"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Clock, TrendingUp, Activity, Calendar, Gift } from "lucide-react";
import type { PriorityItem } from "./priority-list";

interface PriorityDetailCardProps {
  item: PriorityItem;
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

export function PriorityDetailCard({ item }: PriorityDetailCardProps) {
  return (
    <div className="space-y-4">
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
