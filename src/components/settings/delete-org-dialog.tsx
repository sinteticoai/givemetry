// T068: Delete organization data confirmation dialog
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteOrgDialogProps {
  onConfirm: () => Promise<void>;
  isPending?: boolean;
  error?: string | null;
  trigger?: React.ReactNode;
}

export function DeleteOrgDialog({
  onConfirm,
  isPending = false,
  error,
  trigger,
}: DeleteOrgDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmPhrase !== "DELETE ALL DATA") {
      setLocalError("Please type the confirmation phrase exactly");
      return;
    }
    setLocalError(null);
    try {
      await onConfirm();
      setOpen(false);
      setConfirmPhrase("");
    } catch {
      // Error handled by parent component
    }
  };

  const displayError = error || localError;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete All Data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Delete All Organization Data
          </DialogTitle>
          <DialogDescription>
            This will permanently delete:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li>All constituents and their profiles</li>
            <li>All gift history records</li>
            <li>All contact and interaction records</li>
            <li>All AI predictions and analysis</li>
            <li>All briefs and generated content</li>
            <li>All uploaded files</li>
          </ul>

          {displayError && (
            <Alert variant="destructive">
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirmDelete">
              Type <strong>DELETE ALL DATA</strong> to confirm
            </Label>
            <Input
              id="confirmDelete"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="DELETE ALL DATA"
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || confirmPhrase !== "DELETE ALL DATA"}
          >
            {isPending ? "Deleting..." : "Delete Everything"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
