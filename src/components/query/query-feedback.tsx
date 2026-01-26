// T191: Query feedback buttons
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThumbsUp, ThumbsDown, MessageSquare, Check, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QueryFeedbackProps {
  queryId: string;
  className?: string;
}

export function QueryFeedback({ queryId, className }: QueryFeedbackProps) {
  const [feedback, setFeedback] = React.useState<boolean | null>(null);
  const [showComment, setShowComment] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const feedbackMutation = trpc.ai.queryFeedback.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Thank you for your feedback!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit feedback");
    },
  });

  const handleFeedback = (wasHelpful: boolean) => {
    setFeedback(wasHelpful);
    if (!wasHelpful) {
      // Show comment input for negative feedback
      setShowComment(true);
    } else {
      // Submit positive feedback immediately
      feedbackMutation.mutate({
        queryId,
        wasHelpful: true,
      });
    }
  };

  const handleSubmitComment = () => {
    feedbackMutation.mutate({
      queryId,
      wasHelpful: feedback ?? false,
      feedback: comment || undefined,
    });
    setShowComment(false);
  };

  if (submitted) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Check className="h-4 w-4 text-green-500" />
        <span>Feedback submitted</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">Was this helpful?</span>

      <Button
        variant={feedback === true ? "default" : "outline"}
        size="sm"
        onClick={() => handleFeedback(true)}
        disabled={feedbackMutation.isPending}
        className="h-8 px-2"
      >
        {feedbackMutation.isPending && feedback === true ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ThumbsUp className={cn("h-4 w-4", feedback === true && "fill-current")} />
        )}
      </Button>

      <Popover open={showComment} onOpenChange={setShowComment}>
        <PopoverTrigger asChild>
          <Button
            variant={feedback === false ? "default" : "outline"}
            size="sm"
            onClick={() => handleFeedback(false)}
            disabled={feedbackMutation.isPending}
            className="h-8 px-2"
          >
            <ThumbsDown className={cn("h-4 w-4", feedback === false && "fill-current")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">What could be better?</span>
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="The results weren't relevant because..."
              className="h-24 resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowComment(false);
                  setFeedback(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={feedbackMutation.isPending}
              >
                {feedbackMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Submit
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Inline version for compact spaces
export function QueryFeedbackInline({
  queryId,
  className,
}: QueryFeedbackProps) {
  const [submitted, setSubmitted] = React.useState(false);

  const feedbackMutation = trpc.ai.queryFeedback.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  if (submitted) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Thanks!
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => feedbackMutation.mutate({ queryId, wasHelpful: true })}
        disabled={feedbackMutation.isPending}
      >
        <ThumbsUp className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => feedbackMutation.mutate({ queryId, wasHelpful: false })}
        disabled={feedbackMutation.isPending}
      >
        <ThumbsDown className="h-3 w-3" />
      </Button>
    </div>
  );
}
