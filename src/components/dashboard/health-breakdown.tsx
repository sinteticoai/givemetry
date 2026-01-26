// T111: Health category breakdown component
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileText, Clock, CheckCircle, Users } from "lucide-react";

interface HealthBreakdownProps {
  completeness: number;
  freshness: number;
  consistency: number;
  coverage: number;
  className?: string;
}

interface CategoryInfo {
  label: string;
  description: string;
  icon: React.ReactNode;
  weight: string;
}

const CATEGORIES: Record<string, CategoryInfo> = {
  completeness: {
    label: "Completeness",
    description: "Field population",
    icon: <FileText className="h-4 w-4" />,
    weight: "30%",
  },
  freshness: {
    label: "Freshness",
    description: "Data recency",
    icon: <Clock className="h-4 w-4" />,
    weight: "25%",
  },
  consistency: {
    label: "Consistency",
    description: "Format validation",
    icon: <CheckCircle className="h-4 w-4" />,
    weight: "25%",
  },
  coverage: {
    label: "Coverage",
    description: "Portfolio & contact",
    icon: <Users className="h-4 w-4" />,
    weight: "20%",
  },
};

function getScoreColor(score: number): string {
  if (score >= 0.8) return "text-green-500";
  if (score >= 0.6) return "text-yellow-500";
  if (score >= 0.4) return "text-orange-500";
  return "text-red-500";
}

function getProgressColor(score: number): string {
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.6) return "bg-yellow-500";
  if (score >= 0.4) return "bg-orange-500";
  return "bg-red-500";
}

export function HealthBreakdown({
  completeness,
  freshness,
  consistency,
  coverage,
  className,
}: HealthBreakdownProps) {
  const scores = { completeness, freshness, consistency, coverage };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Health Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(scores).map(([key, score]) => {
          const category = CATEGORIES[key as keyof typeof CATEGORIES];
          if (!category) return null;
          const percentage = Math.round(score * 100);

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{category.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{category.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.description} ({category.weight})
                    </p>
                  </div>
                </div>
                <span className={cn("text-lg font-bold", getScoreColor(score))}>
                  {percentage}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", getProgressColor(score))}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function HealthBreakdownCompact({
  completeness,
  freshness,
  consistency,
  coverage,
  className,
}: HealthBreakdownProps) {
  const scores = [
    { key: "completeness", score: completeness, label: "Complete" },
    { key: "freshness", score: freshness, label: "Fresh" },
    { key: "consistency", score: consistency, label: "Consistent" },
    { key: "coverage", score: coverage, label: "Coverage" },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      {scores.map(({ key, score, label }) => {
        const percentage = Math.round(score * 100);
        return (
          <div
            key={key}
            className="flex flex-col items-center p-3 rounded-lg bg-muted/50"
          >
            <span className={cn("text-2xl font-bold", getScoreColor(score))}>
              {percentage}%
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
