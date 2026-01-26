// T150: Priority feedback buttons
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Clock,
  MessageCircle,
  ThumbsDown,
  Calendar,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface PriorityFeedbackProps {
  constituentId: string;
  onSuccess?: () => void;
}

type FeedbackType = "not_now" | "already_in_conversation" | "not_interested" | "wrong_timing";

const FEEDBACK_OPTIONS: Array<{
  value: FeedbackType;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    value: "not_now",
    label: "Not Now",
    icon: <Clock className="h-4 w-4" />,
    description: "Will follow up later",
  },
  {
    value: "already_in_conversation",
    label: "Already Engaged",
    icon: <MessageCircle className="h-4 w-4" />,
    description: "Active conversation ongoing",
  },
  {
    value: "not_interested",
    label: "Not Interested",
    icon: <ThumbsDown className="h-4 w-4" />,
    description: "Donor declined or not viable",
  },
  {
    value: "wrong_timing",
    label: "Wrong Timing",
    icon: <Calendar className="h-4 w-4" />,
    description: "Better time in the future",
  },
];

export function PriorityFeedback({ constituentId, onSuccess }: PriorityFeedbackProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const utils = trpc.useUtils();
  const provideFeedback = trpc.analysis.providePriorityFeedback.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      utils.analysis.getPriorityList.invalidate();
      onSuccess?.();
    },
  });

  const handleSubmit = () => {
    if (!selectedFeedback) return;

    provideFeedback.mutate({
      constituentId,
      feedback: selectedFeedback,
      notes: notes || undefined,
    });
  };

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium text-green-700 dark:text-green-300">
          Feedback recorded
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm">Provide Feedback</Label>

      {/* Feedback buttons */}
      <div className="grid grid-cols-2 gap-2">
        {FEEDBACK_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={selectedFeedback === option.value ? "default" : "outline"}
            size="sm"
            className="justify-start gap-2 h-auto py-2"
            onClick={() => setSelectedFeedback(option.value)}
          >
            {option.icon}
            <div className="text-left">
              <div className="text-xs font-medium">{option.label}</div>
              <div className="text-[10px] text-muted-foreground font-normal">
                {option.description}
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Notes field (shown when feedback selected) */}
      {selectedFeedback && (
        <div className="space-y-2">
          <Textarea
            placeholder="Add optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-20 text-sm resize-none"
          />
          <Button
            onClick={handleSubmit}
            disabled={provideFeedback.isPending}
            className="w-full"
          >
            {provideFeedback.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
