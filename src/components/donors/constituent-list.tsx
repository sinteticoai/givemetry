// T247: Constituent list component with filtering
"use client";

import { useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User, Mail, TrendingUp, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";

interface ConstituentListItem {
  id: string;
  externalId: string;
  firstName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
  constituentType: string | null;
  classYear: number | null;
  assignedOfficerId: string | null;
  portfolioTier: string | null;
  lapseRiskScore: unknown;
  priorityScore: unknown;
  dataQualityScore: unknown;
  estimatedCapacity: unknown;
  updatedAt: Date;
  assignedOfficer: {
    id: string;
    name: string | null;
  } | null;
  _count: {
    gifts: number;
    contacts: number;
  };
}

interface ConstituentListProps {
  constituents: ConstituentListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

function formatCurrency(amount: unknown): string {
  if (amount === null || amount === undefined) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num) || num === 0) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function getScoreColor(score: number): string {
  if (score >= 0.7) return "text-red-600";
  if (score >= 0.4) return "text-yellow-600";
  return "text-green-600";
}

function getPriorityColor(score: number): string {
  if (score >= 0.7) return "text-green-600";
  if (score >= 0.4) return "text-yellow-600";
  return "text-muted-foreground";
}

export function ConstituentList({
  constituents,
  selectedId,
  onSelect,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: ConstituentListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll with intersection observer
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div ref={listRef} className="space-y-2 overflow-y-auto h-full pr-2">
      {constituents.map((constituent) => {
        const displayName = [constituent.firstName, constituent.lastName]
          .filter(Boolean)
          .join(" ") || "Unknown";

        const lapseScore = constituent.lapseRiskScore != null
          ? Number(constituent.lapseRiskScore)
          : null;
        const priorityScore = constituent.priorityScore != null
          ? Number(constituent.priorityScore)
          : null;

        return (
          <div
            key={constituent.id}
            onClick={() => onSelect(constituent.id)}
            className={cn(
              "border rounded-lg p-4 cursor-pointer transition-all",
              selectedId === constituent.id
                ? "border-primary bg-accent/50 shadow-sm"
                : "hover:border-muted-foreground/25 hover:bg-accent/25"
            )}
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{displayName}</span>
                  {constituent.constituentType && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {constituent.constituentType}
                    </Badge>
                  )}
                  {constituent.portfolioTier && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {constituent.portfolioTier}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  {constituent.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {constituent.email}
                    </span>
                  )}
                  {constituent.classYear && (
                    <span className="whitespace-nowrap">
                      Class of {constituent.classYear}
                    </span>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Priority Score */}
                {priorityScore !== null && (
                  <div className="text-center hidden md:block">
                    <div className={cn("text-sm font-medium", getPriorityColor(priorityScore))}>
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      {Math.round(priorityScore * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Priority</div>
                  </div>
                )}

                {/* Lapse Risk */}
                {lapseScore !== null && (
                  <div className="text-center hidden md:block">
                    <div className={cn("text-sm font-medium", getScoreColor(lapseScore))}>
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      {Math.round(lapseScore * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Lapse Risk</div>
                  </div>
                )}

                {/* Capacity */}
                <div className="text-right w-24 hidden lg:block">
                  <div className="text-sm font-medium">
                    {formatCurrency(constituent.estimatedCapacity)}
                  </div>
                  <div className="text-xs text-muted-foreground">Capacity</div>
                </div>

                {/* Gift/Contact Count */}
                <div className="text-right w-16 hidden xl:block">
                  <div className="text-sm">
                    {constituent._count.gifts} gifts
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {constituent._count.contacts} contacts
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          </div>
        );
      })}

      {/* Load more trigger */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-4"
        >
          {isLoadingMore ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <Button
              variant="ghost"
              onClick={onLoadMore}
              className="w-full"
            >
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
