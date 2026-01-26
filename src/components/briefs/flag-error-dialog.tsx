// T174: Error flagging dialog for briefs
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2 } from "lucide-react";

const ERROR_TYPES = [
  { value: "factual_error", label: "Factual Error", description: "Information is incorrect" },
  { value: "missing_information", label: "Missing Information", description: "Important details are missing" },
  { value: "outdated", label: "Outdated", description: "Information is no longer current" },
  { value: "formatting", label: "Formatting Issue", description: "Display or formatting problem" },
  { value: "other", label: "Other", description: "Other issue not listed" },
] as const;

const SECTIONS = [
  { value: "summary", label: "Executive Summary" },
  { value: "givingHistory", label: "Giving History" },
  { value: "relationshipHighlights", label: "Relationship Highlights" },
  { value: "conversationStarters", label: "Conversation Starters" },
  { value: "recommendedAsk", label: "Recommended Ask" },
] as const;

interface FlagErrorDialogProps {
  briefId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FlagErrorDialog({ briefId, open, onOpenChange }: FlagErrorDialogProps) {
  const { toast } = useToast();
  const [errorType, setErrorType] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [description, setDescription] = useState("");

  const flagMutation = trpc.ai.flagBriefError.useMutation({
    onSuccess: () => {
      toast({
        title: "Error flagged",
        description: "Thank you for your feedback. This helps improve our AI.",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to flag error",
        description: error.message,
      });
    },
  });

  const handleClose = () => {
    setErrorType("");
    setSection("");
    setDescription("");
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!errorType || !description.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please select an error type and provide a description.",
      });
      return;
    }

    flagMutation.mutate({
      briefId,
      errorType: errorType as "factual_error" | "missing_information" | "outdated" | "formatting" | "other",
      description: description.trim(),
      section: section as "summary" | "givingHistory" | "relationshipHighlights" | "conversationStarters" | "recommendedAsk" | undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Flag Brief Error
          </DialogTitle>
          <DialogDescription>
            Help us improve by reporting any issues you find in this brief. Your feedback is
            valuable for training our AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Type */}
          <div className="space-y-2">
            <Label htmlFor="error-type">Error Type *</Label>
            <Select value={errorType} onValueChange={setErrorType}>
              <SelectTrigger id="error-type">
                <SelectValue placeholder="Select error type" />
              </SelectTrigger>
              <SelectContent>
                {ERROR_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <span className="font-medium">{type.label}</span>
                      <span className="ml-2 text-muted-foreground text-sm">
                        - {type.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="section">Affected Section (Optional)</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger id="section">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((sec) => (
                  <SelectItem key={sec.value} value={sec.value}>
                    {sec.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the error in detail. What was incorrect and what should it say?"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Be as specific as possible to help us identify and fix the issue.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={flagMutation.isPending || !errorType || !description.trim()}
          >
            {flagMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
