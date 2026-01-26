// T189: Save query dialog
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bookmark, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface SaveQueryDialogProps {
  queryId: string;
  queryText: string;
  onSaved?: () => void;
  trigger?: React.ReactNode;
}

export function SaveQueryDialog({
  queryId,
  queryText,
  onSaved,
  trigger,
}: SaveQueryDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  const saveQueryMutation = trpc.ai.saveQuery.useMutation({
    onSuccess: () => {
      toast.success("Query saved successfully");
      setOpen(false);
      setName("");
      onSaved?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save query");
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    saveQueryMutation.mutate({
      queryId,
      name: name.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Bookmark className="h-4 w-4 mr-2" />
            Save Query
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Save Query</DialogTitle>
            <DialogDescription>
              Save this search query for quick access later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="query-text" className="text-sm text-muted-foreground">
                Query
              </Label>
              <p
                id="query-text"
                className="text-sm p-2 bg-muted rounded-md"
              >
                &ldquo;{queryText}&rdquo;
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Major Donors At Risk"
                maxLength={100}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Give your query a memorable name
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saveQueryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || saveQueryMutation.isPending}
            >
              {saveQueryMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Query
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
