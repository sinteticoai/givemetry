// T231: Alert detail card with pattern description
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Info,
  User,
  TrendingDown,
  TrendingUp,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Factor {
  name: string;
  value: string;
}

// Type guard to safely cast JSON value to Factor array
function isFactorArray(value: unknown): value is Factor[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "name" in item &&
      "value" in item
  );
}

interface AlertConstituent {
  id: string;
  firstName: string | null;
  lastName: string;
  email: string | null;
  assignedOfficer?: {
    id: string;
    name: string | null;
  } | null;
}

interface Alert {
  id: string;
  alertType: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string | null;
  factors: unknown; // JSON type from Prisma
  status: "active" | "dismissed" | "acted_on";
  actedOnAt: Date | null;
  actedOnBy: string | null;
  createdAt: Date;
  constituent: AlertConstituent;
}

interface AlertDetailCardProps {
  alert: Alert;
}

const factorIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  gift_frequency_increase: TrendingUp,
  gift_amount_increase: TrendingUp,
  large_gift: TrendingUp,
  lapse_detected: TrendingDown,
  missed_cycle: AlertTriangle,
  amount_decline: TrendingDown,
  frequency_decline: TrendingDown,
  at_risk_value: AlertTriangle,
  last_contact: Calendar,
  no_contact_history: Phone,
  donor_tier: User,
  expected_frequency: Calendar,
  lifetime_giving: TrendingUp,
  capacity: TrendingUp,
};

export function AlertDetailCard({ alert }: AlertDetailCardProps) {
  const factors: Factor[] = isFactorArray(alert.factors) ? alert.factors : [];
  const displayName = [alert.constituent.firstName, alert.constituent.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-4">
      {/* Description */}
      {alert.description && (
        <div className="text-sm text-muted-foreground">
          {alert.description}
        </div>
      )}

      {/* Factors */}
      {factors.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Contributing Factors
          </h5>
          <div className="grid gap-2">
            {factors.map((factor, index) => {
              const Icon = factorIcons[factor.name] || AlertTriangle;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm"
                >
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <span className="font-medium capitalize">
                      {formatFactorName(factor.name)}:
                    </span>{" "}
                    <span className="text-muted-foreground">{factor.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Constituent Info */}
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{displayName}</p>
            {alert.constituent.email && (
              <p className="text-xs text-muted-foreground">
                {alert.constituent.email}
              </p>
            )}
            {alert.constituent.assignedOfficer && (
              <p className="text-xs text-muted-foreground mt-1">
                Assigned to: {alert.constituent.assignedOfficer.name || "Unknown"}
              </p>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/donors/${alert.constituent.id}`}>
              View Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Acted On Info */}
      {alert.status !== "active" && alert.actedOnAt && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant={alert.status === "dismissed" ? "secondary" : "default"}>
              {alert.status === "dismissed" ? "Dismissed" : "Acted On"}
            </Badge>
            <span className="text-muted-foreground">
              {new Date(alert.actedOnAt).toLocaleDateString()} by{" "}
              {alert.actedOnBy || "Unknown"}
            </span>
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {alert.status === "active" && (
        <RecommendedActions alertType={alert.alertType} />
      )}
    </div>
  );
}

function RecommendedActions({ alertType }: { alertType: string }) {
  const recommendations = getRecommendations(alertType);

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-2">
      <h5 className="text-sm font-medium">Recommended Actions</h5>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {recommendations.map((rec, index) => (
          <li key={index} className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatFactorName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRecommendations(alertType: string): string[] {
  switch (alertType) {
    case "engagement_spike":
      return [
        "Schedule a personal thank-you call to acknowledge increased engagement",
        "Consider timing for a major gift solicitation",
        "Research if there are life events driving increased giving",
        "Update capacity rating if giving suggests higher potential",
      ];
    case "giving_pattern_change":
      return [
        "Reach out to understand any changes in donor circumstances",
        "Review contact history for any issues or concerns",
        "Consider a stewardship visit to reinforce relationship",
        "Analyze if this pattern is appearing across similar donors",
      ];
    case "contact_gap":
      return [
        "Schedule an outreach within the next 2 weeks",
        "Prepare a personalized touchpoint (not just a solicitation)",
        "Review any pending follow-ups or commitments",
        "Consider inviting to an upcoming event or campus visit",
      ];
    default:
      return [
        "Review donor profile and recent activity",
        "Consult with team about appropriate next steps",
      ];
  }
}

// Standalone version for the full detail page
interface AlertDetailPageCardProps {
  alert: Alert;
  className?: string;
}

export function AlertDetailPageCard({ alert, className }: AlertDetailPageCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {alert.title}
              <Badge
                variant="outline"
                className={cn(
                  alert.severity === "high" && "bg-red-100 text-red-800",
                  alert.severity === "medium" && "bg-yellow-100 text-yellow-800",
                  alert.severity === "low" && "bg-blue-100 text-blue-800"
                )}
              >
                {alert.severity}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Created on {new Date(alert.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge variant={alert.status === "active" ? "default" : "secondary"}>
            {alert.status === "active"
              ? "Active"
              : alert.status === "dismissed"
                ? "Dismissed"
                : "Acted On"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <AlertDetailCard alert={alert} />
      </CardContent>
    </Card>
  );
}
