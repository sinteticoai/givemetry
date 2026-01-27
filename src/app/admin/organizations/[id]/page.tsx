// T045: Organization Detail Page
"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminTrpc } from "@/lib/trpc/admin-client";
import { OrganizationDetailTabs } from "@/components/admin/organizations/OrganizationDetailTabs";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
// Card components available for future use
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Pencil,
  RefreshCw,
  Pause,
  Play,
  Trash2,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPlan, setEditPlan] = useState("");

  // Confirm dialogs state
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [isReactivateOpen, setIsReactivateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isHardDeleteOpen, setIsHardDeleteOpen] = useState(false);

  // T056: Suspend mutation
  const suspendMutation = adminTrpc.organizations.suspend.useMutation({
    onSuccess: () => {
      setIsSuspendOpen(false);
      setSuspendReason("");
      refetch();
    },
  });

  // T056: Reactivate mutation
  const reactivateMutation = adminTrpc.organizations.reactivate.useMutation({
    onSuccess: () => {
      setIsReactivateOpen(false);
      refetch();
    },
  });

  // T113: Delete mutation (soft delete)
  const deleteMutation = adminTrpc.organizations.delete.useMutation({
    onSuccess: () => {
      setIsDeleteOpen(false);
      refetch();
    },
  });

  // T113: Hard delete mutation (super_admin only)
  const hardDeleteMutation = adminTrpc.organizations.hardDelete.useMutation({
    onSuccess: () => {
      setIsHardDeleteOpen(false);
      router.push("/admin/organizations");
    },
  });

  // Fetch organization details
  const {
    data: organization,
    isLoading,
    refetch,
    isFetching,
  } = adminTrpc.organizations.get.useQuery({ id });

  // Update mutation
  const updateMutation = adminTrpc.organizations.update.useMutation({
    onSuccess: () => {
      setIsEditOpen(false);
      refetch();
    },
  });

  // Handle edit dialog open
  const handleEditOpen = useCallback(() => {
    if (organization) {
      setEditName(organization.name);
      setEditPlan(organization.plan || "");
      setIsEditOpen(true);
    }
  }, [organization]);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    updateMutation.mutate({
      id,
      name: editName,
      plan: editPlan || undefined,
    });
  }, [id, editName, editPlan, updateMutation]);

  // Handle user click - navigate to user detail
  const handleUserClick = useCallback(
    (userId: string) => {
      router.push(`/admin/users/${userId}`);
    },
    [router]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Not found state
  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <h2 className="text-2xl font-bold">Organization Not Found</h2>
        <p className="text-muted-foreground">
          The organization you are looking for does not exist or has been deleted.
        </p>
        <Button variant="outline" onClick={() => router.push("/admin/organizations")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Organizations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/admin/organizations")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{organization.name}</h1>
              <StatusBadge status={organization.status} />
            </div>
            <p className="text-muted-foreground font-mono text-sm">
              {organization.slug}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
          <Button variant="outline" onClick={handleEditOpen}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {organization.status === "active" && (
            <Button
              variant="outline"
              className="text-yellow-600 hover:text-yellow-700"
              onClick={() => setIsSuspendOpen(true)}
            >
              <Pause className="mr-2 h-4 w-4" />
              Suspend
            </Button>
          )}
          {organization.status === "suspended" && (
            <Button
              variant="outline"
              className="text-green-600 hover:text-green-700"
              onClick={() => setIsReactivateOpen(true)}
            >
              <Play className="mr-2 h-4 w-4" />
              Reactivate
            </Button>
          )}
          {organization.status !== "pending_deletion" && (
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
          {organization.status === "pending_deletion" && (
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => setIsHardDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Permanently Delete
            </Button>
          )}
        </div>
      </div>

      {/* Organization details tabs */}
      <OrganizationDetailTabs
        organization={organization}
        onUserClick={handleUserClick}
      />

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization details. Changes are saved immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Organization name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Input
                id="plan"
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                placeholder="e.g., trial, pro, enterprise"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending || !editName}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* T056: Suspend confirmation with reason input */}
      <Dialog open={isSuspendOpen} onOpenChange={(open) => {
        setIsSuspendOpen(open);
        if (!open) setSuspendReason("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend &quot;{organization.name}&quot;? All users will be blocked from logging in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suspendReason">Reason for suspension</Label>
              <Input
                id="suspendReason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g., Non-payment, Terms violation"
              />
              <p className="text-sm text-muted-foreground">
                This reason will be recorded in the audit log and displayed to super admins.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={() => {
                suspendMutation.mutate({
                  id: id,
                  reason: suspendReason,
                });
              }}
              disabled={suspendMutation.isPending || !suspendReason.trim()}
            >
              {suspendMutation.isPending ? "Suspending..." : "Suspend Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* T056: Reactivate confirmation */}
      <ConfirmDialog
        open={isReactivateOpen}
        onOpenChange={setIsReactivateOpen}
        title="Reactivate Organization"
        description={`Are you sure you want to reactivate "${organization.name}"? Users will be able to log in again.`}
        confirmLabel={reactivateMutation.isPending ? "Reactivating..." : "Reactivate"}
        variant="default"
        onConfirm={() => {
          reactivateMutation.mutate({ id: id });
        }}
      />

      {/* T113: Delete confirmation with name typing */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Organization"
        description={`Are you sure you want to delete "${organization.name}"? This action will soft-delete the organization with a 30-day retention period. All users will be immediately blocked from logging in.`}
        confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete Organization"}
        variant="destructive"
        confirmText={organization.name}
        confirmPlaceholder="Type organization name to confirm"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate({
            id: id,
            confirmationName: organization.name,
          });
        }}
      />

      {/* T113: Hard delete confirmation (super_admin only) */}
      <ConfirmDialog
        open={isHardDeleteOpen}
        onOpenChange={setIsHardDeleteOpen}
        title="Permanently Delete Organization"
        description={`WARNING: This action is IRREVERSIBLE. All data associated with "${organization.name}" will be permanently deleted, including all users, constituents, gifts, and other records. This cannot be undone.`}
        confirmLabel={hardDeleteMutation.isPending ? "Deleting..." : "Permanently Delete"}
        variant="destructive"
        confirmText={organization.name}
        confirmPlaceholder="Type organization name to confirm"
        isLoading={hardDeleteMutation.isPending}
        onConfirm={() => {
          hardDeleteMutation.mutate({
            id: id,
            confirmationName: organization.name,
          });
        }}
      />
    </div>
  );
}
