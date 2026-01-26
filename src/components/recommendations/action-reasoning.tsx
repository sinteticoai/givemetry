// T200: Action reasoning display component
"use client";

import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, Clock, DollarSign, BarChart3 } from "lucide-react";

interface ActionReasoningProps {
  reasoning: string;
  supportingFactors: string[];
}

function getFactorIcon(factor: string) {
  const lowerFactor = factor.toLowerCase();

  if (lowerFactor.includes("capacity") || lowerFactor.includes("$")) {
    return <DollarSign className="h-3 w-3" />;
  }
  if (lowerFactor.includes("gift") || lowerFactor.includes("giving")) {
    return <TrendingUp className="h-3 w-3" />;
  }
  if (lowerFactor.includes("day") || lowerFactor.includes("contact") || lowerFactor.includes("recent")) {
    return <Clock className="h-3 w-3" />;
  }
  if (lowerFactor.includes("campaign") || lowerFactor.includes("fiscal")) {
    return <BarChart3 className="h-3 w-3" />;
  }
  if (lowerFactor.includes("score") || lowerFactor.includes("priority") || lowerFactor.includes("risk")) {
    return <TrendingUp className="h-3 w-3" />;
  }

  return <Info className="h-3 w-3" />;
}

function getFactorColor(factor: string): string {
  const lowerFactor = factor.toLowerCase();

  if (lowerFactor.includes("high") || lowerFactor.includes("risk")) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  }
  if (lowerFactor.includes("capacity") || lowerFactor.includes("$1") || lowerFactor.includes("$5")) {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  }
  if (lowerFactor.includes("campaign") || lowerFactor.includes("fiscal")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  }
  if (lowerFactor.includes("priority")) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
  }

  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}

export function ActionReasoning({ reasoning, supportingFactors }: ActionReasoningProps) {
  return (
    <div className="space-y-3">
      {/* Detailed Reasoning */}
      <div>
        <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-blue-600" />
          Why This Action?
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {reasoning}
        </p>
      </div>

      {/* Supporting Factors */}
      {supportingFactors.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            SUPPORTING FACTORS
          </h4>
          <div className="flex flex-wrap gap-2">
            {supportingFactors.map((factor, i) => (
              <Badge
                key={i}
                variant="outline"
                className={`text-xs font-normal ${getFactorColor(factor)}`}
              >
                {getFactorIcon(factor)}
                <span className="ml-1">{factor}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Explanation */}
      <div className="p-2 bg-muted/30 rounded-md">
        <p className="text-xs text-muted-foreground">
          This recommendation is based on analysis of donor giving patterns, engagement history,
          and institutional timing. Higher confidence indicates stronger pattern matching with
          successful past outreach strategies.
        </p>
      </div>
    </div>
  );
}

interface DetailedFactorsProps {
  factors: Array<{
    name: string;
    value: string;
    impact: "high" | "medium" | "low";
    weight: number;
    rawScore: number;
  }>;
}

export function DetailedFactors({ factors }: DetailedFactorsProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Factor Breakdown</h4>
      <div className="space-y-2">
        {factors.map((factor) => (
          <div
            key={factor.name}
            className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
          >
            <div className="flex items-center gap-2">
              <Badge
                variant={factor.impact === "high" ? "default" : factor.impact === "medium" ? "secondary" : "outline"}
                className="text-xs capitalize"
              >
                {factor.impact}
              </Badge>
              <span className="text-sm capitalize">{factor.name}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {Math.round(factor.rawScore * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(factor.weight * 100)}% weight
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
