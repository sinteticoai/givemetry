// T133: Implement mark as addressed/retained/dismissed actions
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, MessageCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";

interface LapseActionsProps {
  constituentId: string;
}

type ActionType = "addressed" | "retained" | "dismissed";

export function LapseActions({ constituentId }: LapseActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const markAddressed = trpc.analysis.markLapseAddressed.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Action recorded",
        description: data.message,
      });
      setDialogOpen(false);
      setNotes("");
      setSelectedAction(null);
      // Invalidate the lapse risk list to refresh
      utils.analysis.getLapseRiskList.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAction = (action: ActionType) => {
    setSelectedAction(action);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedAction) return;

    markAddressed.mutate({
      constituentId,
      action: selectedAction,
      notes: notes || undefined,
    });
  };

  const getActionTitle = (action: ActionType | null): string => {
    switch (action) {
      case "addressed":
        return "Mark as Addressed";
      case "retained":
        return "Mark as Retained";
      case "dismissed":
        return "Dismiss Alert";
      default:
        return "Take Action";
    }
  };

  const getActionDescription = (action: ActionType | null): string => {
    switch (action) {
      case "addressed":
        return "Record that you've reached out to this donor or taken steps to address the lapse risk.";
      case "retained":
        return "Record that this donor has been successfully retained and is no longer at risk.";
      case "dismissed":
        return "Dismiss this alert if you believe the risk assessment is incorrect or not relevant.";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Take Action</h4>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction("addressed")}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Contacted
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction("retained")}
          className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-950"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Retained
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction("dismissed")}
          className="border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Dismiss
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getActionTitle(selectedAction)}</DialogTitle>
            <DialogDescription>
              {getActionDescription(selectedAction)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Add any notes about this action..."
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={markAddressed.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={markAddressed.isPending}
            >
              {markAddressed.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
