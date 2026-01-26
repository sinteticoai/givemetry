// T130: Lapse risk detail card with explainable factors
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertCircle, TrendingDown, Calendar, Banknote, Phone } from "lucide-react";

interface LapseRiskFactor {
  name: string;
  value: string;
  impact: string;
}

interface LapseDetailCardProps {
  item: {
    riskScore: number;
    riskLevel: "high" | "medium" | "low";
    confidence: number;
    predictedLapseWindow: string;
    factors: LapseRiskFactor[];
    givingSummary: {
      totalLifetime: number;
      lastGiftDate: string | null;
      lastGiftAmount: number | null;
      avgAnnualGiving: number;
    };
    lastContactDate: string | null;
  };
}

function getFactorIcon(name: string) {
  switch (name) {
    case "recency":
      return <Calendar className="h-4 w-4" />;
    case "frequency":
      return <TrendingDown className="h-4 w-4" />;
    case "monetary":
      return <Banknote className="h-4 w-4" />;
    case "contact":
      return <Phone className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case "high":
      return "text-red-500 bg-red-500/10";
    case "medium":
      return "text-orange-500 bg-orange-500/10";
    default:
      return "text-green-500 bg-green-500/10";
  }
}

function formatFactorName(name: string): string {
  const names: Record<string, string> = {
    recency: "Gift Recency",
    frequency: "Gift Frequency",
    monetary: "Gift Amount",
    contact: "Contact Frequency",
  };
  return names[name] || name.charAt(0).toUpperCase() + name.slice(1);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.round(diffDays / 365 * 10) / 10;
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

export function LapseDetailCard({ item }: LapseDetailCardProps) {
  return (
    <div className="space-y-4">
      {/* Risk Explanation Header */}
      <div>
        <h4 className="font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          Why This Donor Is At Risk
        </h4>
        <p className="text-sm text-muted-foreground mt-1">
          Predicted to lapse within {item.predictedLapseWindow} ({Math.round(item.confidence * 100)}% confidence)
        </p>
      </div>

      {/* Risk Factors */}
      <div className="space-y-2">
        {item.factors.length > 0 ? (
          item.factors.map((factor, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-2 rounded-md bg-muted/50"
            >
              <div className={cn("p-1.5 rounded", getImpactColor(factor.impact))}>
                {getFactorIcon(factor.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {formatFactorName(factor.name)}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-xs capitalize", getImpactColor(factor.impact))}
                  >
                    {factor.impact}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {factor.value}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No detailed factors available. Upload more data to improve predictions.
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
        <div>
          <div className="text-xs text-muted-foreground">Last Gift</div>
          <div className="text-sm font-medium">
            {formatDate(item.givingSummary.lastGiftDate)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Last Contact</div>
          <div className="text-sm font-medium">
            {formatDate(item.lastContactDate)}
          </div>
        </div>
      </div>
    </div>
  );
}
