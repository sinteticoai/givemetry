// T108: Feature Flags Management Page
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { DataTable, type Column } from "@/components/admin/shared/DataTable";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import {
  Flag,
  Plus,
  Settings,
  Building2,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  Search,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  defaultEnabled: boolean;
  overrideCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Override {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationStatus: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function FeatureFlagsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // State
  const [search, setSearch] = useState("");
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [overrideToRemove, setOverrideToRemove] = useState<{
    featureFlagId: string;
    organizationId: string;
    organizationName: string;
  } | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    key: "",
    name: "",
    description: "",
    defaultEnabled: false,
  });

  // Form state for override
  const [overrideData, setOverrideData] = useState({
    organizationId: "",
    enabled: true,
  });
  const [orgSearch, setOrgSearch] = useState("");

  // Queries
  const flagsQuery = trpc.superAdmin.featureFlags.list.useQuery({
    search: search || undefined,
    limit: 100,
  });

  const flagDetailQuery = trpc.superAdmin.featureFlags.get.useQuery(
    { id: selectedFlag?.id ?? "" },
    { enabled: !!selectedFlag }
  );

  const orgsForOverrideQuery = trpc.superAdmin.featureFlags.getOrganizationsForOverride.useQuery(
    {
      featureFlagId: selectedFlag?.id ?? "",
      search: orgSearch || undefined,
    },
    { enabled: !!selectedFlag && isOverrideDialogOpen }
  );

  // Mutations
  const createMutation = trpc.superAdmin.featureFlags.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Feature flag created",
        description: `Created "${data.name}" with key "${data.key}"`,
      });
      setIsCreateDialogOpen(false);
      resetForm();
      utils.superAdmin.featureFlags.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Failed to create flag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = trpc.superAdmin.featureFlags.update.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Feature flag updated",
        description: `Updated "${data.name}"`,
      });
      setIsEditDialogOpen(false);
      utils.superAdmin.featureFlags.list.invalidate();
      utils.superAdmin.featureFlags.get.invalidate({ id: data.id });
    },
    onError: (error) => {
      toast({
        title: "Failed to update flag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setOverrideMutation = trpc.superAdmin.featureFlags.setOverride.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Override set",
        description: `${data.organizationName} will now ${data.enabled ? "have" : "not have"} access`,
      });
      setIsOverrideDialogOpen(false);
      setOverrideData({ organizationId: "", enabled: true });
      setOrgSearch("");
      utils.superAdmin.featureFlags.get.invalidate({ id: selectedFlag?.id ?? "" });
      utils.superAdmin.featureFlags.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Failed to set override",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeOverrideMutation = trpc.superAdmin.featureFlags.removeOverride.useMutation({
    onSuccess: () => {
      toast({
        title: "Override removed",
        description: "Organization will now use the default value",
      });
      setOverrideToRemove(null);
      utils.superAdmin.featureFlags.get.invalidate({ id: selectedFlag?.id ?? "" });
      utils.superAdmin.featureFlags.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Failed to remove override",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helpers
  const resetForm = () => {
    setFormData({
      key: "",
      name: "",
      description: "",
      defaultEnabled: false,
    });
  };

  const openEditDialog = (flag: FeatureFlag) => {
    setFormData({
      key: flag.key,
      name: flag.name,
      description: flag.description ?? "",
      defaultEnabled: flag.defaultEnabled,
    });
    setSelectedFlag(flag);
    setIsEditDialogOpen(true);
  };

  const handleCreate = () => {
    createMutation.mutate({
      key: formData.key,
      name: formData.name,
      description: formData.description || undefined,
      defaultEnabled: formData.defaultEnabled,
    });
  };

  const handleUpdate = () => {
    if (!selectedFlag) return;
    updateMutation.mutate({
      id: selectedFlag.id,
      name: formData.name,
      description: formData.description || null,
      defaultEnabled: formData.defaultEnabled,
    });
  };

  const handleSetOverride = () => {
    if (!selectedFlag || !overrideData.organizationId) return;
    setOverrideMutation.mutate({
      featureFlagId: selectedFlag.id,
      organizationId: overrideData.organizationId,
      enabled: overrideData.enabled,
    });
  };

  const handleRemoveOverride = () => {
    if (!overrideToRemove) return;
    removeOverrideMutation.mutate({
      featureFlagId: overrideToRemove.featureFlagId,
      organizationId: overrideToRemove.organizationId,
    });
  };

  // Table columns
  const columns: Column<FeatureFlag>[] = [
    {
      key: "key",
      header: "Key",
      sortable: true,
      render: (flag) => (
        <code className="text-sm bg-muted px-2 py-1 rounded">{flag.key}</code>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (flag) => (
        <div>
          <div className="font-medium">{flag.name}</div>
          {flag.description && (
            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
              {flag.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "defaultEnabled",
      header: "Default",
      width: "w-[100px]",
      render: (flag) => (
        <StatusBadge
          status={flag.defaultEnabled ? "enabled" : "disabled"}
        />
      ),
    },
    {
      key: "overrideCount",
      header: "Overrides",
      width: "w-[100px]",
      render: (flag) => (
        <Badge variant="outline" className="font-mono">
          {flag.overrideCount}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      width: "w-[150px]",
      render: (flag) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(flag.updatedAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-[100px]",
      render: (flag) => (
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(flag);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit flag</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFlag(flag);
                    setIsOverrideDialogOpen(true);
                  }}
                >
                  <Building2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Manage overrides</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  // Override columns
  const overrideColumns: Column<Override>[] = [
    {
      key: "organizationName",
      header: "Organization",
      render: (override) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{override.organizationName}</div>
            <div className="text-sm text-muted-foreground">{override.organizationSlug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "enabled",
      header: "Status",
      width: "w-[120px]",
      render: (override) => (
        <div className="flex items-center gap-2">
          {override.enabled ? (
            <ToggleRight className="h-5 w-5 text-green-600" />
          ) : (
            <ToggleLeft className="h-5 w-5 text-red-600" />
          )}
          <span className={cn(
            "font-medium",
            override.enabled ? "text-green-600" : "text-red-600"
          )}>
            {override.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      width: "w-[150px]",
      render: (override) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(override.updatedAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-[80px]",
      render: (override) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setOverrideToRemove({
              featureFlagId: selectedFlag?.id ?? "",
              organizationId: override.organizationId,
              organizationName: override.organizationName,
            });
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground">
            Manage platform-wide feature toggles and organization overrides
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Flag
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {flagsQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {flagsQuery.data?.totalCount ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled by Default</CardTitle>
            <ToggleRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {flagsQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {flagsQuery.data?.items.filter((f) => f.defaultEnabled).length ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overrides</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {flagsQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {flagsQuery.data?.items.reduce((sum, f) => sum + f.overrideCount, 0) ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Feature Flags</CardTitle>
          <CardDescription>
            Click on a flag to view and manage its organization overrides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by key, name, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <DataTable
            data={flagsQuery.data?.items ?? []}
            columns={columns}
            getRowKey={(flag) => flag.id}
            isLoading={flagsQuery.isLoading}
            emptyMessage="No feature flags found"
            onRowClick={(flag) => setSelectedFlag(flag)}
          />
        </CardContent>
      </Card>

      {/* Selected Flag Detail */}
      {selectedFlag && !isEditDialogOpen && !isOverrideDialogOpen && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                {flagDetailQuery.data?.name ?? selectedFlag.name}
              </CardTitle>
              <CardDescription>
                <code className="text-sm">{selectedFlag.key}</code>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOverrideDialogOpen(true)}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Add Override
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(selectedFlag)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFlag(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Default Status</Label>
                  <div className="mt-1">
                    <StatusBadge
                      status={flagDetailQuery.data?.defaultEnabled ? "enabled" : "disabled"}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">
                    {flagDetailQuery.data?.description || "No description"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">
                  Organization Overrides ({flagDetailQuery.data?.overrides.length ?? 0})
                </Label>
                <div className="mt-2">
                  {flagDetailQuery.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : flagDetailQuery.data?.overrides.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No overrides. All organizations use the default value.
                    </p>
                  ) : (
                    <DataTable
                      data={flagDetailQuery.data?.overrides ?? []}
                      columns={overrideColumns}
                      getRowKey={(override) => override.id}
                      emptyMessage="No overrides"
                    />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
            <DialogDescription>
              Add a new feature flag to control feature availability
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                placeholder="e.g., ai_briefings"
                value={formData.key}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., AI Briefings"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this feature flag controls..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="defaultEnabled">Default Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Enable this feature for all organizations by default
                </p>
              </div>
              <Switch
                id="defaultEnabled"
                checked={formData.defaultEnabled}
                onCheckedChange={(checked) =>
                  setFormData((f) => ({ ...f, defaultEnabled: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.key || !formData.name || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Feature Flag</DialogTitle>
            <DialogDescription>
              Update the feature flag settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Key</Label>
              <Input value={formData.key} disabled />
              <p className="text-xs text-muted-foreground mt-1">
                Key cannot be changed after creation
              </p>
            </div>

            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="edit-defaultEnabled">Default Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Enable this feature for all organizations by default
                </p>
              </div>
              <Switch
                id="edit-defaultEnabled"
                checked={formData.defaultEnabled}
                onCheckedChange={(checked) =>
                  setFormData((f) => ({ ...f, defaultEnabled: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Override Dialog */}
      <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Override</DialogTitle>
            <DialogDescription>
              Set a specific value for an organization for{" "}
              <code className="bg-muted px-1 rounded">{selectedFlag?.key}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="org-search">Organization</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="org-search"
                  placeholder="Search organizations..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={overrideData.organizationId}
                onValueChange={(value) =>
                  setOverrideData((d) => ({ ...d, organizationId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgsForOverrideQuery.isLoading ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Loading...
                    </div>
                  ) : orgsForOverrideQuery.data?.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      No organizations available
                    </div>
                  ) : (
                    orgsForOverrideQuery.data?.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{org.name}</span>
                          <span className="text-muted-foreground">({org.slug})</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Override Value</Label>
                <p className="text-sm text-muted-foreground">
                  {overrideData.enabled
                    ? "Feature will be ENABLED for this organization"
                    : "Feature will be DISABLED for this organization"}
                </p>
              </div>
              <Switch
                checked={overrideData.enabled}
                onCheckedChange={(checked) =>
                  setOverrideData((d) => ({ ...d, enabled: checked }))
                }
              />
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <strong>Note:</strong> Default value is{" "}
              <Badge variant="outline">
                {selectedFlag?.defaultEnabled ? "Enabled" : "Disabled"}
              </Badge>
              . This override will take precedence over the default.
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOverrideDialogOpen(false);
                setOverrideData({ organizationId: "", enabled: true });
                setOrgSearch("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSetOverride}
              disabled={!overrideData.organizationId || setOverrideMutation.isPending}
            >
              {setOverrideMutation.isPending ? "Setting..." : "Set Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Override Confirmation */}
      <ConfirmDialog
        open={!!overrideToRemove}
        onOpenChange={(open) => !open && setOverrideToRemove(null)}
        title="Remove Override"
        description={`Are you sure you want to remove the override for "${overrideToRemove?.organizationName}"? The organization will revert to the default value.`}
        confirmLabel="Remove Override"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleRemoveOverride}
        isLoading={removeOverrideMutation.isPending}
      />
    </div>
  );
}
