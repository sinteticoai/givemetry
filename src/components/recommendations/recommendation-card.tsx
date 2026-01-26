// T199: Recommendation card component
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
  Phone,
  Mail,
  Gift,
  Users,
  AlertTriangle,
  Lightbulb,
  Target,
} from "lucide-react";
import { ActionReasoning } from "./action-reasoning";
import { CompleteActionButton } from "./complete-action-button";

export interface RecommendationData {
  constituentId: string;
  constituentName: string;
  action: string;
  actionType: string;
  actionDescription: string;
  reasoning: string;
  confidence: number;
  urgencyLevel: "high" | "medium" | "low";
  nextSteps: string[];
  alternatives: Array<{
    actionType: string;
    label: string;
    reason: string;
  }>;
  context: {
    primaryFactor: string;
    supportingFactors: string[];
  };
}

interface RecommendationCardProps {
  recommendation: RecommendationData;
  onActionComplete?: (outcome: string, notes?: string) => void;
  isLoading?: boolean;
}

function getUrgencyColor(level: string): string {
  switch (level) {
    case "high":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    default:
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  }
}

function getUrgencyBadgeVariant(level: string): "destructive" | "secondary" | "outline" {
  switch (level) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    default:
      return "outline";
  }
}

function getActionIcon(actionType: string) {
  const iconClass = "h-5 w-5";
  switch (actionType) {
    case "schedule_meeting":
    case "thank_you_visit":
    case "campus_visit":
      return <Calendar className={iconClass} />;
    case "stewardship_call":
    case "re_engagement_call":
    case "initial_outreach":
    case "pledge_reminder":
      return <Phone className={iconClass} />;
    case "send_impact_report":
    case "birthday_outreach":
      return <Mail className={iconClass} />;
    case "campaign_solicitation":
    case "proposal_presentation":
      return <Gift className={iconClass} />;
    case "event_invitation":
      return <Users className={iconClass} />;
    default:
      return <Target className={iconClass} />;
  }
}

export function RecommendationCard({
  recommendation,
  onActionComplete,
  isLoading = false,
}: RecommendationCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  return (
    <Card className={`${recommendation.urgencyLevel === "high" ? "border-red-200 dark:border-red-900" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${getUrgencyColor(recommendation.urgencyLevel)}`}>
              {getActionIcon(recommendation.actionType)}
            </div>
            <div>
              <CardTitle className="text-lg">{recommendation.action}</CardTitle>
              <CardDescription className="mt-1">
                {recommendation.actionDescription}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={getUrgencyBadgeVariant(recommendation.urgencyLevel)}>
              {recommendation.urgencyLevel === "high" && <AlertTriangle className="h-3 w-3 mr-1" />}
              {recommendation.urgencyLevel} priority
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              {Math.round(recommendation.confidence * 100)}% confidence
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary Factor */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <Lightbulb className="h-4 w-4 mt-0.5 text-primary" />
          <div>
            <p className="text-sm font-medium">{recommendation.context.primaryFactor}</p>
            {recommendation.context.supportingFactors.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {recommendation.context.supportingFactors.slice(0, 2).join(" | ")}
              </p>
            )}
          </div>
        </div>

        {/* Next Steps Preview */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Next Steps
          </h4>
          <ul className="space-y-1">
            {recommendation.nextSteps.slice(0, showDetails ? undefined : 2).map((step, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary font-medium">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
          {recommendation.nextSteps.length > 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show all {recommendation.nextSteps.length} steps
                </>
              )}
            </Button>
          )}
        </div>

        {/* Detailed Reasoning (expandable) */}
        {showDetails && (
          <>
            <Separator />
            <ActionReasoning
              reasoning={recommendation.reasoning}
              supportingFactors={recommendation.context.supportingFactors}
            />
          </>
        )}

        {/* Alternatives */}
        {recommendation.alternatives.length > 0 && (
          <>
            <Separator />
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-8"
                onClick={() => setShowAlternatives(!showAlternatives)}
              >
                <span className="text-sm text-muted-foreground">
                  {recommendation.alternatives.length} alternative action{recommendation.alternatives.length !== 1 ? "s" : ""}
                </span>
                {showAlternatives ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {showAlternatives && (
                <div className="mt-2 space-y-2">
                  {recommendation.alternatives.map((alt) => (
                    <div
                      key={alt.actionType}
                      className="p-2 border rounded-md bg-background"
                    >
                      <p className="text-sm font-medium">{alt.label}</p>
                      <p className="text-xs text-muted-foreground">{alt.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-4">
        <CompleteActionButton
          constituentId={recommendation.constituentId}
          actionType={recommendation.actionType}
          actionLabel={recommendation.action}
          onComplete={onActionComplete}
          isLoading={isLoading}
        />
        <Button variant="outline" size="sm" className="flex-1">
          <Clock className="h-4 w-4 mr-2" />
          Defer
        </Button>
      </CardFooter>
    </Card>
  );
}
