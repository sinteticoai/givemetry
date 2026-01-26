// T169: Brief display component with sections
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BriefSection } from "./brief-section";
import { BriefEditor } from "./brief-editor";
import { ExportPdfButton } from "./export-pdf-button";
import { FlagErrorDialog } from "./flag-error-dialog";
import type { Brief, BriefContent } from "./types";
import {
  FileText,
  DollarSign,
  Users,
  MessageSquare,
  Target,
  Edit,
  Flag,
  Calendar,
  Bot,
} from "lucide-react";

interface BriefDisplayProps {
  brief: Brief;
  onUpdate?: () => void;
}

export function BriefDisplay({ brief, onUpdate }: BriefDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);

  const content = brief.content as BriefContent;
  const constituentName = [brief.constituent?.firstName, brief.constituent?.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown";

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isEditing) {
    return (
      <BriefEditor
        brief={brief}
        onCancel={() => setIsEditing(false)}
        onSave={() => {
          setIsEditing(false);
          onUpdate?.();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold">Donor Brief: {constituentName}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Generated {formatDate(brief.createdAt)}
              {brief.modelUsed && (
                <>
                  <span className="mx-1">•</span>
                  <Bot className="h-4 w-4" />
                  <span className="capitalize">
                    {brief.modelUsed.includes("fallback") ? "Template" : "AI Generated"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFlagDialog(true)}>
            <Flag className="mr-2 h-4 w-4" />
            Flag Error
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <ExportPdfButton brief={brief} constituentName={constituentName} />
        </div>
      </div>

      {/* Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BriefSection
            content={content.summary?.text || "No summary available."}
            citations={content.summary?.citations}
          />
        </CardContent>
      </Card>

      {/* Giving History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Giving History
            {content.givingHistory?.totalLifetime && (
              <Badge variant="secondary" className="ml-auto">
                Lifetime: {formatCurrency(content.givingHistory.totalLifetime)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BriefSection
            content={content.givingHistory?.text || "No giving history available."}
            citations={content.givingHistory?.citations}
          />
        </CardContent>
      </Card>

      {/* Relationship Highlights Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Relationship Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BriefSection
            content={content.relationshipHighlights?.text || "No relationship history recorded."}
            citations={content.relationshipHighlights?.citations}
          />
        </CardContent>
      </Card>

      {/* Conversation Starters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation Starters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {content.conversationStarters?.items?.length ? (
            <ul className="space-y-2">
              {content.conversationStarters.items.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No conversation starters available.</p>
          )}
        </CardContent>
      </Card>

      {/* Recommended Ask Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recommended Ask
          </CardTitle>
        </CardHeader>
        <CardContent>
          {content.recommendedAsk ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {content.recommendedAsk.amount && (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2">
                    <p className="text-sm text-green-700">Suggested Amount</p>
                    <p className="text-2xl font-bold text-green-800">
                      {formatCurrency(content.recommendedAsk.amount)}
                    </p>
                  </div>
                )}
                {content.recommendedAsk.purpose && (
                  <div>
                    <p className="text-sm text-muted-foreground">Purpose</p>
                    <p className="font-medium">{content.recommendedAsk.purpose}</p>
                  </div>
                )}
              </div>
              {content.recommendedAsk.rationale && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Rationale</p>
                  <BriefSection
                    content={content.recommendedAsk.rationale}
                    citations={content.recommendedAsk.citations}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recommended ask available. Consider a discovery meeting first.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Flag Error Dialog */}
      <FlagErrorDialog
        briefId={brief.id}
        open={showFlagDialog}
        onOpenChange={setShowFlagDialog}
      />
    </div>
  );
}
