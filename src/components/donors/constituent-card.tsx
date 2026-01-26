// T249: Constituent card component
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  User,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  FileText,
} from "lucide-react";

interface ConstituentCardProps {
  constituent: {
    id: string;
    externalId: string;
    firstName: string | null;
    lastName: string;
    email: string | null;
    phone: string | null;
    constituentType: string | null;
    classYear: number | null;
    city: string | null;
    state: string | null;
    assignedOfficerId: string | null;
    portfolioTier: string | null;
    lapseRiskScore: number | string | null;
    priorityScore: number | string | null;
    estimatedCapacity: number | string | null;
    assignedOfficer?: {
      id: string;
      name: string | null;
    } | null;
    _count?: {
      gifts: number;
      contacts: number;
    };
    stats?: {
      totalGiving: number | string;
      giftCount: number;
      lastGiftDate: Date | string | null;
    };
  };
  variant?: "compact" | "detailed";
  showActions?: boolean;
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function getScoreColor(score: number): string {
  if (score >= 0.7) return "text-red-600 bg-red-50";
  if (score >= 0.4) return "text-yellow-600 bg-yellow-50";
  return "text-green-600 bg-green-50";
}

function getPriorityColor(score: number): string {
  if (score >= 0.7) return "text-green-600 bg-green-50";
  if (score >= 0.4) return "text-yellow-600 bg-yellow-50";
  return "text-muted-foreground bg-muted";
}

export function ConstituentCard({
  constituent,
  variant = "detailed",
  showActions = true,
}: ConstituentCardProps) {
  const displayName = [constituent.firstName, constituent.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown";

  const location = [constituent.city, constituent.state]
    .filter(Boolean)
    .join(", ");

  const lapseScore = constituent.lapseRiskScore
    ? Number(constituent.lapseRiskScore)
    : null;
  const priorityScore = constituent.priorityScore
    ? Number(constituent.priorityScore)
    : null;

  if (variant === "compact") {
    return (
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/donors/${constituent.id}`}
                className="font-medium hover:underline truncate block"
              >
                {displayName}
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {constituent.constituentType && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {constituent.constituentType}
                  </Badge>
                )}
                {constituent.classYear && (
                  <span>Class of {constituent.classYear}</span>
                )}
              </div>
            </div>
            {lapseScore !== null && lapseScore >= 0.5 && (
              <div className={cn("px-2 py-1 rounded text-sm font-medium", getScoreColor(lapseScore))}>
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                {Math.round(lapseScore * 100)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">
                <Link href={`/donors/${constituent.id}`} className="hover:underline">
                  {displayName}
                </Link>
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
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
                {constituent.classYear && (
                  <span className="text-sm text-muted-foreground">
                    Class of {constituent.classYear}
                  </span>
                )}
              </div>
            </div>
          </div>
          {showActions && (
            <Link href={`/donors/${constituent.id}`}>
              <Button variant="ghost" size="icon">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="space-y-2 text-sm">
          {constituent.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${constituent.email}`} className="hover:underline">
                {constituent.email}
              </a>
            </div>
          )}
          {constituent.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              {constituent.phone}
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {location}
            </div>
          )}
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-3">
          {priorityScore !== null && (
            <div className={cn("p-3 rounded-lg", getPriorityColor(priorityScore))}>
              <div className="flex items-center gap-1 text-xs font-medium uppercase">
                <TrendingUp className="h-3 w-3" />
                Priority
              </div>
              <div className="text-xl font-bold mt-1">
                {Math.round(priorityScore * 100)}%
              </div>
            </div>
          )}
          {lapseScore !== null && (
            <div className={cn("p-3 rounded-lg", getScoreColor(lapseScore))}>
              <div className="flex items-center gap-1 text-xs font-medium uppercase">
                <AlertTriangle className="h-3 w-3" />
                Lapse Risk
              </div>
              <div className="text-xl font-bold mt-1">
                {Math.round(lapseScore * 100)}%
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold">
              {formatCurrency(constituent.estimatedCapacity)}
            </div>
            <div className="text-xs text-muted-foreground">Capacity</div>
          </div>
          {constituent.stats && (
            <>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(constituent.stats.totalGiving)}
                </div>
                <div className="text-xs text-muted-foreground">Total Giving</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {constituent.stats.giftCount}
                </div>
                <div className="text-xs text-muted-foreground">Gifts</div>
              </div>
            </>
          )}
          {constituent._count && !constituent.stats && (
            <>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {constituent._count.gifts}
                </div>
                <div className="text-xs text-muted-foreground">Gifts</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {constituent._count.contacts}
                </div>
                <div className="text-xs text-muted-foreground">Contacts</div>
              </div>
            </>
          )}
        </div>

        {/* Officer Assignment */}
        {constituent.assignedOfficer && (
          <div className="flex items-center justify-between pt-2 border-t text-sm">
            <span className="text-muted-foreground">Assigned to</span>
            <span className="font-medium">
              {constituent.assignedOfficer.name || "Unassigned"}
            </span>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Link href={`/donors/${constituent.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
