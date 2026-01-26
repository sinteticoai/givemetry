// T250: Constituent detail sidebar component
"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/shared/loading";
import { cn } from "@/lib/utils";
import {
  User,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  AlertTriangle,
  X,
  ExternalLink,
  Gift,
  MessageSquare,
} from "lucide-react";

interface ConstituentDetailProps {
  constituentId: string;
  onClose: () => void;
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

function formatDate(date: Date | string | null): string {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

export function ConstituentDetail({ constituentId, onClose }: ConstituentDetailProps) {
  const { data: constituent, isLoading } = trpc.constituent.get.useQuery({
    id: constituentId,
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!constituent) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Constituent not found</p>
        </CardContent>
      </Card>
    );
  }

  const displayName = [constituent.prefix, constituent.firstName, constituent.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown";

  const fullAddress = [
    constituent.addressLine1,
    constituent.addressLine2,
    [constituent.city, constituent.state, constituent.postalCode].filter(Boolean).join(", "),
    constituent.country,
  ]
    .filter(Boolean)
    .join("\n");

  const lapseScore = constituent.lapseRiskScore
    ? Number(constituent.lapseRiskScore)
    : null;
  const priorityScore = constituent.priorityScore
    ? Number(constituent.priorityScore)
    : null;

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg leading-tight">{displayName}</CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
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
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {priorityScore !== null && (
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
                <TrendingUp className="h-3 w-3" />
                Priority
              </div>
              <div className={cn("text-xl font-bold mt-1", getPriorityColor(priorityScore))}>
                {Math.round(priorityScore * 100)}%
              </div>
            </div>
          )}
          {lapseScore !== null && (
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
                <AlertTriangle className="h-3 w-3" />
                Lapse Risk
              </div>
              <div className={cn("text-xl font-bold mt-1", getScoreColor(lapseScore))}>
                {Math.round(lapseScore * 100)}%
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Contact Information */}
        <div>
          <h4 className="text-sm font-medium mb-2">Contact</h4>
          <div className="space-y-2 text-sm">
            {constituent.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${constituent.email}`}
                  className="text-blue-600 hover:underline truncate"
                >
                  {constituent.email}
                </a>
              </div>
            )}
            {constituent.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{constituent.phone}</span>
              </div>
            )}
            {fullAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="whitespace-pre-line">{fullAddress}</span>
              </div>
            )}
            {!constituent.email && !constituent.phone && !fullAddress && (
              <p className="text-muted-foreground">No contact information</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Giving Summary */}
        <div>
          <h4 className="text-sm font-medium mb-2">Giving Summary</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Lifetime</span>
              <span className="font-medium text-green-600">
                {formatCurrency(constituent.stats?.totalGiving)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gift Count</span>
              <span className="font-medium">{constituent.stats?.giftCount || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Gift</span>
              <span className="font-medium">
                {formatDate(constituent.stats?.lastGiftDate ?? null)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated Capacity</span>
              <span className="font-medium">
                {formatCurrency(constituent.estimatedCapacity)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Additional Info */}
        <div>
          <h4 className="text-sm font-medium mb-2">Profile</h4>
          <div className="space-y-2">
            {constituent.classYear && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Class Year</span>
                <span className="font-medium">{constituent.classYear}</span>
              </div>
            )}
            {constituent.schoolCollege && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">School/College</span>
                <span className="font-medium">{constituent.schoolCollege}</span>
              </div>
            )}
            {constituent.assignedOfficer && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Assigned Officer</span>
                <span className="font-medium">
                  {constituent.assignedOfficer.name || "Unassigned"}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">External ID</span>
              <span className="font-mono text-xs">{constituent.externalId}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Counts */}
        {(constituent.gifts.length > 0 || constituent.contacts.length > 0) && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 rounded bg-muted text-sm">
                  <Gift className="h-4 w-4 text-green-600" />
                  <span>{constituent.gifts.length} recent gifts</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-muted text-sm">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span>{constituent.contacts.length} contacts</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Active Alerts */}
        {constituent.alerts.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Active Alerts</h4>
              <div className="space-y-2">
                {constituent.alerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2 rounded bg-yellow-50 border border-yellow-200 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-800">{alert.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Footer Actions */}
      <div className="p-4 border-t flex-shrink-0">
        <Link href={`/donors/${constituentId}`}>
          <Button className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Profile
          </Button>
        </Link>
      </div>
    </Card>
  );
}
