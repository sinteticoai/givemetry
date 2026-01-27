// T069: User Detail Page
"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminTrpc } from "@/lib/trpc/admin-client";
import { UserDetailCard } from "@/components/admin/users/UserDetailCard";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import type { UserRole } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "gift_officer", label: "Gift Officer" },
  { value: "viewer", label: "Viewer" },
];

export default function UserDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  // Dialog states
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  const [isEnableOpen, setIsEnableOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState<UserRole | "">("");

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
      setNewRole("");
      refetch();
    },
  });

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
    </div>
  );
}
