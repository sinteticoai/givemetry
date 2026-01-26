// T232: Alert action buttons (dismiss, acted on)
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AlertActionsProps {
  alertId: string;
  onSuccess?: () => void;
  compact?: boolean;
}

export function AlertActions({ alertId, onSuccess, compact = false }: AlertActionsProps) {
  const [notes, setNotes] = useState("");
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [actedDialogOpen, setActedDialogOpen] = useState(false);
  const { toast } = useToast();

  const utils = trpc.useUtils();

  const dismissMutation = trpc.alert.dismiss.useMutation({
    onSuccess: () => {
      toast({
        title: "Alert dismissed",
        description: "The alert has been marked as dismissed.",
      });
      setDismissDialogOpen(false);
      utils.alert.list.invalidate();
      utils.alert.counts.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markActedMutation = trpc.alert.markActed.useMutation({
    onSuccess: () => {
      toast({
        title: "Alert marked as acted on",
        description: "The alert has been marked as acted on.",
      });
      setActedDialogOpen(false);
      setNotes("");
      utils.alert.list.invalidate();
      utils.alert.counts.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDismiss = () => {
    dismissMutation.mutate({ id: alertId });
  };

  const handleMarkActed = () => {
    markActedMutation.mutate({
      id: alertId,
      notes: notes.trim() || undefined,
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          disabled={dismissMutation.isPending}
        >
          {dismissMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span className="sr-only">Dismiss</span>
        </Button>

        <Dialog open={actedDialogOpen} onOpenChange={setActedDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <CheckCircle2 className="h-4 w-4" />
              <span className="sr-only">Mark as acted on</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark as Acted On</DialogTitle>
              <DialogDescription>
                Record that you&apos;ve taken action on this alert.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe the action taken..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActedDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkActed}
                disabled={markActedMutation.isPending}
              >
                {markActedMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Mark Acted On
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog open={actedDialogOpen} onOpenChange={setActedDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark as Acted On
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Acted On</DialogTitle>
            <DialogDescription>
              Record that you&apos;ve taken action on this alert. Optionally add
              notes about what action was taken.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="acted-notes">Notes (optional)</Label>
              <Textarea
                id="acted-notes"
                placeholder="Describe the action taken (e.g., 'Called donor, scheduled follow-up meeting')..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                These notes will be appended to the alert description for future
                reference.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActedDialogOpen(false);
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkActed}
              disabled={markActedMutation.isPending}
            >
              {markActedMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Mark Acted On
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <XCircle className="mr-2 h-4 w-4" />
            Dismiss
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Alert</DialogTitle>
            <DialogDescription>
              Are you sure you want to dismiss this alert? This indicates the
              alert is not relevant or actionable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDismissDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDismiss}
              disabled={dismissMutation.isPending}
            >
              {dismissMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Dismiss Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
