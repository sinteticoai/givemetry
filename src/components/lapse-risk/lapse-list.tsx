// T129: Lapse risk list component
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Mail, User } from "lucide-react";
import { LapseDetailCard } from "./lapse-detail-card";
import { LapseActions } from "./lapse-actions";

interface LapseRiskItem {
  constituent: {
    id: string;
    displayName: string;
    email: string | null;
    assignedOfficerId: string | null;
    assignedOfficerName: string | null;
  };
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  confidence: number;
  predictedLapseWindow: string;
  factors: Array<{
    name: string;
    value: string;
    impact: string;
  }>;
  givingSummary: {
    totalLifetime: number;
    lastGiftDate: string | null;
    lastGiftAmount: number | null;
    avgAnnualGiving: number;
  };
  lastContactDate: string | null;
  status: string | null;
}

interface LapseListProps {
  items: LapseRiskItem[];
}

function getRiskBadgeVariant(level: string): "destructive" | "default" | "secondary" {
  switch (level) {
    case "high":
      return "destructive";
    case "medium":
      return "default";
    default:
      return "secondary";
  }
}

function getRiskColor(level: string): string {
  switch (level) {
    case "high":
      return "text-red-500";
    case "medium":
      return "text-orange-500";
    default:
      return "text-green-500";
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

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === 0) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function LapseList({ items }: LapseListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isExpanded = expandedId === item.constituent.id;

        return (
          <div
            key={item.constituent.id}
            className={cn(
              "border rounded-lg transition-all",
              isExpanded ? "border-primary/50 shadow-sm" : "hover:border-muted-foreground/25"
            )}
          >
            {/* Main row */}
            <div
              className="flex items-center gap-4 p-4 cursor-pointer"
              onClick={() => toggleExpand(item.constituent.id)}
            >
              {/* Avatar/Icon */}
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {/* Name and Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.constituent.displayName}</span>
                  <Badge
                    variant={getRiskBadgeVariant(item.riskLevel)}
                    className="capitalize text-xs"
                  >
                    {item.riskLevel}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  {item.constituent.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {item.constituent.email}
                    </span>
                  )}
                  {item.constituent.assignedOfficerName && (
                    <span className="truncate">
                      Officer: {item.constituent.assignedOfficerName}
                    </span>
                  )}
                </div>
              </div>

              {/* Risk Score */}
              <div className="flex-shrink-0 text-right">
                <div className={cn("text-2xl font-bold", getRiskColor(item.riskLevel))}>
                  {Math.round(item.riskScore * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.predictedLapseWindow}
                </div>
              </div>

              {/* Last Gift */}
              <div className="flex-shrink-0 w-24 text-right hidden md:block">
                <div className="text-sm font-medium">
                  {formatCurrency(item.givingSummary.lastGiftAmount)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(item.givingSummary.lastGiftDate)}
                </div>
              </div>

              {/* Expand button */}
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t px-4 py-4 bg-muted/30">
                <div className="grid gap-4 md:grid-cols-2">
                  <LapseDetailCard item={item} />
                  <div className="flex flex-col justify-end">
                    <LapseActions constituentId={item.constituent.id} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
