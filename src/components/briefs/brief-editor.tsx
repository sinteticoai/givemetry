// T171: Brief edit mode component
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, X, Loader2 } from "lucide-react";
import type { Brief, BriefContent } from "./types";

interface BriefEditorProps {
  brief: Brief;
  onCancel: () => void;
  onSave: () => void;
}

export function BriefEditor({ brief, onCancel, onSave }: BriefEditorProps) {
  const { toast } = useToast();
  const [content, setContent] = useState<BriefContent>(brief.content as BriefContent);

  const updateMutation = trpc.ai.updateBrief.useMutation({
    onSuccess: () => {
      toast({
        title: "Brief updated",
        description: "Your changes have been saved.",
      });
      onSave();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: brief.id,
      content,
    });
  };

  const updateSection = <K extends keyof BriefContent>(
    section: K,
    updates: Partial<BriefContent[K]>
  ) => {
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        ...updates,
      },
    }));
  };

  const updateConversationStarter = (index: number, value: string) => {
    const items = [...(content.conversationStarters?.items || [])];
    items[index] = value;
    updateSection("conversationStarters", { items });
  };

  const addConversationStarter = () => {
    const items = [...(content.conversationStarters?.items || []), ""];
    updateSection("conversationStarters", { items });
  };

  const removeConversationStarter = (index: number) => {
    const items = (content.conversationStarters?.items || []).filter((_, i) => i !== index);
    updateSection("conversationStarters", { items });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Edit Brief</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content.summary?.text || ""}
            onChange={(e) => updateSection("summary", { text: e.target.value })}
            rows={4}
            placeholder="Enter executive summary..."
          />
        </CardContent>
      </Card>

      {/* Giving History */}
      <Card>
        <CardHeader>
          <CardTitle>Giving History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Total Lifetime Giving</Label>
            <Input
              type="number"
              value={content.givingHistory?.totalLifetime || 0}
              onChange={(e) =>
                updateSection("givingHistory", {
                  totalLifetime: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0"
            />
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea
              value={content.givingHistory?.text || ""}
              onChange={(e) => updateSection("givingHistory", { text: e.target.value })}
              rows={3}
              placeholder="Enter giving history summary..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Relationship Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Relationship Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content.relationshipHighlights?.text || ""}
            onChange={(e) => updateSection("relationshipHighlights", { text: e.target.value })}
            rows={3}
            placeholder="Enter relationship highlights..."
          />
        </CardContent>
      </Card>

      {/* Conversation Starters */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation Starters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(content.conversationStarters?.items || []).map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                {index + 1}
              </span>
              <Input
                value={item}
                onChange={(e) => updateConversationStarter(index, e.target.value)}
                placeholder="Enter conversation starter..."
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeConversationStarter(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addConversationStarter}>
            Add Conversation Starter
          </Button>
        </CardContent>
      </Card>

      {/* Recommended Ask */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Ask</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={content.recommendedAsk?.amount || ""}
                onChange={(e) =>
                  updateSection("recommendedAsk", {
                    amount: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="Leave empty if not applicable"
              />
            </div>
            <div>
              <Label>Purpose</Label>
              <Input
                value={content.recommendedAsk?.purpose || ""}
                onChange={(e) => updateSection("recommendedAsk", { purpose: e.target.value })}
                placeholder="e.g., Annual Fund"
              />
            </div>
          </div>
          <div>
            <Label>Rationale</Label>
            <Textarea
              value={content.recommendedAsk?.rationale || ""}
              onChange={(e) => updateSection("recommendedAsk", { rationale: e.target.value })}
              rows={2}
              placeholder="Why this ask makes sense..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
