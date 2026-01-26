// T148: Priority list component with ranking
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Mail, Phone, Star, User, TrendingUp } from "lucide-react";
import { PriorityDetailCard } from "./priority-detail-card";
import { PriorityFeedback } from "./priority-feedback";

export interface PriorityItem {
  rank: number;
  constituent: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    constituentType: string | null;
    classYear: number | null;
  };
  priorityScore: number;
  confidence: number;
  factors: Array<{
    name: string;
    value: string;
    impact: string;
  }>;
  capacityIndicator: {
    estimate: number | null;
    label: string;
  };
  engagement: {
    lastContactDate: string | null;
    lastGiftDate: string | null;
    recentActivitySummary: string;
  };
  timing: {
    indicator: string;
    score: number;
  };
  recommendedAction: {
    action: string;
    reason: string;
  } | null;
}

interface PriorityListProps {
  items: PriorityItem[];
  onFeedbackSubmit?: () => void;
}

function getPriorityBadgeVariant(score: number): "default" | "secondary" | "outline" {
  if (score >= 0.7) return "default";
  if (score >= 0.4) return "secondary";
  return "outline";
}

function getRankColor(rank: number): string {
  if (rank === 1) return "text-yellow-500";
  if (rank === 2) return "text-gray-400";
  if (rank === 3) return "text-amber-700";
  return "text-muted-foreground";
}

function getPriorityLevel(score: number): string {
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
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

export function PriorityList({ items, onFeedbackSubmit }: PriorityListProps) {
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
              {/* Rank indicator */}
              <div className="flex-shrink-0 w-8 text-center">
                <span className={cn("text-lg font-bold", getRankColor(item.rank))}>
                  #{item.rank}
                </span>
              </div>

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
                    variant={getPriorityBadgeVariant(item.priorityScore)}
                    className="text-xs"
                  >
                    {getPriorityLevel(item.priorityScore)}
                  </Badge>
                  {item.constituent.constituentType && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.constituent.constituentType}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  {item.constituent.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      <span className="hidden sm:inline">{item.constituent.email}</span>
                    </span>
                  )}
                  {item.constituent.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span className="hidden sm:inline">{item.constituent.phone}</span>
                    </span>
                  )}
                  {item.constituent.classYear && (
                    <span>Class of {item.constituent.classYear}</span>
                  )}
                </div>
              </div>

              {/* Priority Score */}
              <div className="flex-shrink-0 text-right">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold text-primary">
                    {Math.round(item.priorityScore * 100)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Priority Score
                </div>
              </div>

              {/* Capacity */}
              <div className="flex-shrink-0 w-24 text-right hidden md:block">
                <div className="text-sm font-medium">
                  {item.capacityIndicator.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  Capacity
                </div>
              </div>

              {/* Last Contact */}
              <div className="flex-shrink-0 w-24 text-right hidden lg:block">
                <div className="text-sm">
                  {formatDate(item.engagement.lastContactDate)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last Contact
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
                  <PriorityDetailCard item={item} />
                  <div className="flex flex-col justify-between gap-4">
                    {item.recommendedAction && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          <Star className="h-4 w-4 text-primary" />
                          Recommended Action
                        </div>
                        <p className="text-sm font-semibold">{item.recommendedAction.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.recommendedAction.reason}
                        </p>
                      </div>
                    )}
                    <PriorityFeedback
                      constituentId={item.constituent.id}
                      onSuccess={onFeedbackSubmit}
                    />
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
