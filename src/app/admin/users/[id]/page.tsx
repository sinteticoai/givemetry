// T069, T080: User Detail Page with Impersonation
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminTrpc } from "@/lib/trpc/admin-client";
import { UserDetailCard } from "@/components/admin/users/UserDetailCard";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  ArrowLeft,
  RefreshCw,
  UserX,
  UserCheck,
  KeyRound,
  Shield,
  Eye,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

interface PageProps {
  params: { id: string };
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "gift_officer", label: "Gift Officer" },
  { value: "viewer", label: "Viewer" },
];

export default function UserDetailPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();

  // Dialog states
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  const [isEnableOpen, setIsEnableOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState<UserRole | "">("");
  // T080: Impersonation state
  const [isImpersonateOpen, setIsImpersonateOpen] = useState(false);
  const [impersonationReason, setImpersonationReason] = useState("");
  // Edit user state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole | "">("");

  // Fetch user details
  const {
    data: user,
    isLoading,
    refetch,
    isFetching,
  } = adminTrpc.users.get.useQuery({ id });

  // Mutations
  const disableMutation = adminTrpc.users.disable.useMutation({
    onSuccess: () => {
      setIsDisableOpen(false);
      setDisableReason("");
      refetch();
    },
  });

  const enableMutation = adminTrpc.users.enable.useMutation({
    onSuccess: () => {
      setIsEnableOpen(false);
      refetch();
    },
  });

  const resetPasswordMutation = adminTrpc.users.resetPassword.useMutation({
    onSuccess: () => {
      setIsResetPasswordOpen(false);
    },
  });

  const changeRoleMutation = adminTrpc.users.changeRole.useMutation({
    onSuccess: () => {
      setIsChangeRoleOpen(false);
      setIsEditOpen(false);
      setNewRole("");
      setEditRole("");
      refetch();
    },
  });

  const updateMutation = adminTrpc.users.update.useMutation({
    onSuccess: () => {
      setIsEditOpen(false);
      setEditName("");
      setEditEmail("");
      setEditRole("");
      refetch();
    },
  });

  // T080: Impersonation mutation
  const impersonateMutation = adminTrpc.impersonation.start.useMutation({
    onSuccess: () => {
      setIsImpersonateOpen(false);
      setImpersonationReason("");
      // Redirect to tenant dashboard as the impersonated user
      router.push("/dashboard");
    },
  });

  // T080: Check admin session to determine if user has super_admin role
  const { data: adminSession } = adminTrpc.auth.me.useQuery();

  // Handle org click - navigate to org detail
  const handleOrgClick = useCallback(
    (orgId: string) => {
      router.push(`/admin/organizations/${orgId}`);
    },
    [router]
  );

  // Handle change role dialog open
  const handleChangeRoleOpen = useCallback(() => {
    if (user) {
      setNewRole(user.role);
      setIsChangeRoleOpen(true);
    }
  }, [user]);

  // Handle edit dialog open
  const handleEditOpen = useCallback(() => {
    if (user) {
      setEditName(user.name || "");
      setEditEmail(user.email);
      setEditRole(user.role);
      setIsEditOpen(true);
    }
  }, [user]);

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
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <h2 className="text-2xl font-bold">User Not Found</h2>
        <p className="text-muted-foreground">
          The user you are looking for does not exist or has been deleted.
        </p>
        <Button variant="outline" onClick={() => router.push("/admin/users")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
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
            onClick={() => router.push("/admin/users")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{user.name || user.email}</h1>
              <StatusBadge status={user.isDisabled ? "disabled" : "active"} />
            </div>
            <p className="text-muted-foreground">{user.email}</p>
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
          <Button variant="outline" onClick={handleChangeRoleOpen}>
            <Shield className="mr-2 h-4 w-4" />
            Change Role
          </Button>
          <Button variant="outline" onClick={() => setIsResetPasswordOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Reset Password
          </Button>
          {user.isDisabled ? (
            <Button
              variant="outline"
              className="text-green-600 hover:text-green-700"
              onClick={() => setIsEnableOpen(true)}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Enable
            </Button>
          ) : (
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => setIsDisableOpen(true)}
            >
              <UserX className="mr-2 h-4 w-4" />
              Disable
            </Button>
          )}
          {/* T080: Impersonate button - only shown for super_admin role */}
          {adminSession?.role === "super_admin" && !user.isDisabled && (
            <Button
              variant="default"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => setIsImpersonateOpen(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Impersonate
            </Button>
          )}
        </div>
      </div>

      {/* User details */}
      <UserDetailCard user={user} onOrgClick={handleOrgClick} />

      {/* Disable dialog with reason input */}
      <Dialog
        open={isDisableOpen}
        onOpenChange={(open) => {
          setIsDisableOpen(open);
          if (!open) setDisableReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable User</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable &quot;{user.name || user.email}&quot;?
              They will not be able to log in until re-enabled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disableReason">Reason for disabling</Label>
              <Input
                id="disableReason"
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                placeholder="e.g., Security concern, Policy violation"
              />
              <p className="text-sm text-muted-foreground">
                This reason will be recorded in the audit log.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDisableOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                disableMutation.mutate({
                  id: id,
                  reason: disableReason,
                });
              }}
              disabled={disableMutation.isPending || !disableReason.trim()}
            >
              {disableMutation.isPending ? "Disabling..." : "Disable User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enable confirmation */}
      <ConfirmDialog
        open={isEnableOpen}
        onOpenChange={setIsEnableOpen}
        title="Enable User"
        description={`Are you sure you want to enable "${user.name || user.email}"? They will be able to log in again.`}
        confirmLabel={enableMutation.isPending ? "Enabling..." : "Enable"}
        variant="default"
        onConfirm={() => {
          enableMutation.mutate({ id: id });
        }}
      />

      {/* Reset password confirmation */}
      <ConfirmDialog
        open={isResetPasswordOpen}
        onOpenChange={setIsResetPasswordOpen}
        title="Reset Password"
        description={`Are you sure you want to send a password reset email to "${user.email}"?`}
        confirmLabel={resetPasswordMutation.isPending ? "Sending..." : "Send Reset Email"}
        variant="default"
        onConfirm={() => {
          resetPasswordMutation.mutate({ id: id });
        }}
      />

      {/* Change role dialog */}
      <Dialog open={isChangeRoleOpen} onOpenChange={setIsChangeRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Change the role for &quot;{user.name || user.email}&quot; within their organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newRole">New Role</Label>
              <Select
                value={newRole}
                onValueChange={(value) => setNewRole(value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Current role: {roleOptions.find((r) => r.value === user.role)?.label}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeRoleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newRole) {
                  changeRoleMutation.mutate({
                    id: id,
                    role: newRole as UserRole,
                  });
                }
              }}
              disabled={changeRoleMutation.isPending || !newRole || newRole === user.role}
            >
              {changeRoleMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditName("");
            setEditEmail("");
            setEditRole("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit User
            </DialogTitle>
            <DialogDescription>
              Update user details for &quot;{user.name || user.email}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter user's name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Enter user's email"
              />
              {editEmail !== user.email && (
                <p className="text-sm text-amber-600">
                  Changing the email will require the user to verify their new email address.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select
                value={editRole}
                onValueChange={(value) => setEditRole(value as UserRole)}
              >
                <SelectTrigger id="editRole">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(updateMutation.isError || changeRoleMutation.isError) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {updateMutation.error?.message || changeRoleMutation.error?.message || "Failed to update user"}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const hasNameChange = editName !== (user.name || "");
                const hasEmailChange = editEmail !== user.email;
                const hasRoleChange = editRole !== user.role;

                // Update name/email if changed
                if (hasNameChange || hasEmailChange) {
                  const updates: { id: string; name?: string; email?: string } = { id };
                  if (hasNameChange) updates.name = editName;
                  if (hasEmailChange) updates.email = editEmail;
                  updateMutation.mutate(updates);
                }

                // Update role if changed (separate API call)
                if (hasRoleChange && editRole) {
                  changeRoleMutation.mutate({ id, role: editRole as UserRole });
                }

                // Close if no changes
                if (!hasNameChange && !hasEmailChange && !hasRoleChange) {
                  setIsEditOpen(false);
                }
              }}
              disabled={
                updateMutation.isPending ||
                changeRoleMutation.isPending ||
                !editName.trim() ||
                !editEmail.trim() ||
                !editRole ||
                (editName === (user.name || "") && editEmail === user.email && editRole === user.role)
              }
            >
              {(updateMutation.isPending || changeRoleMutation.isPending) ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* T080: Impersonate dialog */}
      <Dialog
        open={isImpersonateOpen}
        onOpenChange={(open) => {
          setIsImpersonateOpen(open);
          if (!open) setImpersonationReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              Impersonate User
            </DialogTitle>
            <DialogDescription>
              You are about to impersonate &quot;{user.name || user.email}&quot;. This will
              allow you to view the application as this user for support purposes.
            </DialogDescription>
          </DialogHeader>
          <Alert className="border-orange-500 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              All actions taken while impersonating will be logged in the audit trail.
              The session will automatically expire after 1 hour.
            </AlertDescription>
          </Alert>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="impersonationReason">Reason for impersonation</Label>
              <Textarea
                id="impersonationReason"
                value={impersonationReason}
                onChange={(e) => setImpersonationReason(e.target.value)}
                placeholder="e.g., Support ticket #12345 - User unable to see their donors"
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                This reason will be recorded in the audit log and visible in impersonation history.
              </p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm font-medium">Session Details:</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>User: {user.email}</li>
                <li>Organization: {user.organizationName}</li>
                <li>Role: {roleOptions.find((r) => r.value === user.role)?.label}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImpersonateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => {
                impersonateMutation.mutate({
                  userId: id,
                  reason: impersonationReason,
                });
              }}
              disabled={impersonateMutation.isPending || !impersonationReason.trim()}
            >
              {impersonateMutation.isPending ? "Starting..." : "Start Impersonation"}
            </Button>
          </DialogFooter>
          {impersonateMutation.isError && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {impersonateMutation.error?.message || "Failed to start impersonation session"}
              </AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
