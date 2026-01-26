// T201: Complete action button with next action display
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2, Calendar, X, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface CompleteActionButtonProps {
  constituentId: string;
  actionType: string;
  actionLabel: string;
  onComplete?: (outcome: string, notes?: string) => void;
  isLoading?: boolean;
}

const OUTCOMES = [
  { value: "completed", label: "Completed", description: "Action was successfully completed" },
  { value: "scheduled", label: "Scheduled", description: "Meeting or call has been scheduled" },
  { value: "deferred", label: "Deferred", description: "Will follow up later" },
  { value: "not_applicable", label: "Not Applicable", description: "This action is not needed" },
];

export function CompleteActionButton({
  constituentId,
  actionType,
  actionLabel,
  onComplete,
  isLoading = false,
}: CompleteActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<string>("completed");
  const [notes, setNotes] = useState("");

  const markComplete = trpc.ai.markActionComplete.useMutation({
    onSuccess: () => {
      toast.success("Action marked as complete", {
        description: "Your progress has been recorded.",
      });
      setOpen(false);
      setNotes("");
      onComplete?.(outcome, notes);
    },
    onError: (error) => {
      toast.error("Failed to record action", {
        description: error.message,
      });
    },
  });

  const handleSubmit = () => {
    markComplete.mutate({
      constituentId,
      actionType,
      notes: notes || undefined,
      outcome: outcome as "completed" | "scheduled" | "deferred" | "not_applicable",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="flex-1"
          disabled={isLoading || markComplete.isPending}
        >
          {markComplete.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Mark Complete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Action</DialogTitle>
          <DialogDescription>
            Record the outcome of: <span className="font-medium">{actionLabel}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="outcome">Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <div className="flex items-center gap-2">
                      {o.value === "completed" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {o.value === "scheduled" && <Calendar className="h-4 w-4 text-blue-600" />}
                      {o.value === "deferred" && <ArrowRight className="h-4 w-4 text-yellow-600" />}
                      {o.value === "not_applicable" && <X className="h-4 w-4 text-gray-600" />}
                      {o.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {OUTCOMES.find((o) => o.value === outcome)?.description}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this interaction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Notes will be recorded in the contact log.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={markComplete.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={markComplete.isPending}
          >
            {markComplete.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface QuickCompleteButtonProps {
  constituentId: string;
  actionType: string;
  onComplete?: () => void;
}

export function QuickCompleteButton({
  constituentId,
  actionType,
  onComplete,
}: QuickCompleteButtonProps) {
  const markComplete = trpc.ai.markActionComplete.useMutation({
    onSuccess: () => {
      toast.success("Action completed");
      onComplete?.();
    },
    onError: (error) => {
      toast.error("Failed to record action", {
        description: error.message,
      });
    },
  });

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => markComplete.mutate({ constituentId, actionType })}
      disabled={markComplete.isPending}
    >
      {markComplete.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
    </Button>
  );
}
