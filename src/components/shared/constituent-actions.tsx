// T068: Constituent deletion and deactivation UI components
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, MoreHorizontal, Trash2, Archive, RotateCcw } from "lucide-react";

interface ConstituentActionsProps {
  constituentId: string;
  constituentName: string;
  isActive?: boolean;
  onActionComplete?: () => void;
  compact?: boolean;
}

export function ConstituentActions({
  constituentId,
  constituentName,
  isActive = true,
  onActionComplete,
  compact = false,
}: ConstituentActionsProps) {
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const utils = trpc.useUtils();

  const deleteMutation = trpc.constituent.delete.useMutation({
    onSuccess: () => {
      setDeactivateOpen(false);
      setDeleteOpen(false);
      utils.constituent.list.invalidate();
      utils.constituent.stats.invalidate();
      onActionComplete?.();
    },
  });

  const reactivateMutation = trpc.constituent.reactivate.useMutation({
    onSuccess: () => {
      setReactivateOpen(false);
      utils.constituent.list.invalidate();
      utils.constituent.listDeactivated.invalidate();
      onActionComplete?.();
    },
  });

  const handleDeactivate = () => {
    deleteMutation.mutate({ id: constituentId, hardDelete: false });
  };

  const handlePermanentDelete = () => {
    deleteMutation.mutate({ id: constituentId, hardDelete: true });
  };

  const handleReactivate = () => {
    reactivateMutation.mutate({ id: constituentId });
  };

  if (!isActive) {
    // Show reactivate option for deactivated constituents
    return (
      <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <DialogTrigger asChild>
          {compact ? (
            <Button variant="ghost" size="sm">
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reactivate
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Constituent</DialogTitle>
            <DialogDescription>
              Are you sure you want to reactivate <strong>{constituentName}</strong>?
              They will appear in searches and reports again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReactivate}
              disabled={reactivateMutation.isPending}
            >
              {reactivateMutation.isPending ? "Reactivating..." : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              Actions
              <MoreHorizontal className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDeactivateOpen(true)}>
            <Archive className="mr-2 h-4 w-4" />
            Deactivate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deactivate Dialog */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Constituent</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate <strong>{constituentName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Deactivated constituents will no longer appear in searches, reports, or
              analysis. Their data is preserved and they can be reactivated later.
            </p>
          </div>
          {deleteMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>{deleteMutation.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeactivate}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Constituent
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{constituentName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action cannot be undone. All associated data will be permanently deleted.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              The following data will be deleted:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>All gift history records</li>
              <li>All contact and interaction records</li>
              <li>All AI predictions and analysis</li>
              <li>All generated briefs</li>
              <li>All alerts for this constituent</li>
            </ul>
          </div>
          {deleteMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>{deleteMutation.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface BulkConstituentActionsProps {
  selectedIds: string[];
  onActionComplete?: () => void;
  onClearSelection?: () => void;
}

export function BulkConstituentActions({
  selectedIds,
  onActionComplete,
  onClearSelection,
}: BulkConstituentActionsProps) {
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const utils = trpc.useUtils();

  const bulkDeleteMutation = trpc.constituent.bulkDelete.useMutation({
    onSuccess: () => {
      setDeactivateOpen(false);
      setDeleteOpen(false);
      utils.constituent.list.invalidate();
      utils.constituent.stats.invalidate();
      onClearSelection?.();
      onActionComplete?.();
    },
  });

  const handleBulkDeactivate = () => {
    bulkDeleteMutation.mutate({ ids: selectedIds, hardDelete: false });
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate({ ids: selectedIds, hardDelete: true });
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
      <span className="text-sm font-medium">
        {selectedIds.length} selected
      </span>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Archive className="mr-2 h-4 w-4" />
            Deactivate
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate {selectedIds.length} Constituents</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {selectedIds.length} constituents?
              Their data will be preserved and they can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          {bulkDeleteMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>{bulkDeleteMutation.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkDeactivate}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Deactivating..." : "Deactivate All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete {selectedIds.length} Constituents
            </DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedIds.length} constituents and all
              their associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              All gift records, contacts, predictions, and briefs for these
              constituents will be permanently deleted.
            </AlertDescription>
          </Alert>
          {bulkDeleteMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>{bulkDeleteMutation.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete All Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
      >
        Clear Selection
      </Button>
    </div>
  );
}
