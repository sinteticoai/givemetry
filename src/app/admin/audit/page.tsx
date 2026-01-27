// T098: Audit Log Viewer Page
"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { DataTable, type Column } from "@/components/admin/shared/DataTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Download,
  FileText,
  Shield,
  Users,
  Building2,
  Clock,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// Types for audit log entries
interface CombinedAuditLog {
  id: string;
  source: "tenant" | "super_admin";
  action: string;
  actorType: "user" | "super_admin";
  actorId: string;
  actorName: string;
  organizationId: string | null;
  organizationName: string | null;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

interface SuperAdminLog {
  id: string;
  superAdminId: string;
  superAdminName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  organizationId: string | null;
  organizationName: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// Action type badge colors
const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  suspend: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  reactivate: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  login: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  logout: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  disable: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  enable: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  impersonation: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  export: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

function getActionColor(action: string): string {
  const actionParts = action.split(".");
  const actionType = actionParts[actionParts.length - 1] ?? "";
  return actionColors[actionType] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

function ActionBadge({ action }: { action: string }) {
  return (
    <Badge className={cn("font-mono text-xs", getActionColor(action))}>
      {action}
    </Badge>
  );
}

function SourceBadge({ source }: { source: "tenant" | "super_admin" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs",
        source === "super_admin"
          ? "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300"
          : "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
      )}
    >
      {source === "super_admin" ? (
        <Shield className="mr-1 h-3 w-3" />
      ) : (
        <Users className="mr-1 h-3 w-3" />
      )}
      {source === "super_admin" ? "Admin" : "Tenant"}
    </Badge>
  );
}

export default function AuditPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"all" | "admin">("all");
  const [selectedLog, setSelectedLog] = useState<CombinedAuditLog | SuperAdminLog | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Fetch action types for filters
  const actionTypesQuery = trpc.superAdmin.audit.actionTypes.useQuery();

  // Fetch combined audit logs
  const combinedLogsQuery = trpc.superAdmin.audit.list.useQuery(
    {
      limit: pageSize,
      cursor: page > 1 ? undefined : undefined, // We'll handle cursor-based pagination
      organizationId: filters.organizationId || undefined,
      action: filters.action || undefined,
      dateRange: dateRange.from || dateRange.to
        ? {
            from: dateRange.from,
            to: dateRange.to,
          }
        : undefined,
    },
    { enabled: activeTab === "all" }
  );

  // Fetch super admin logs only
  const adminLogsQuery = trpc.superAdmin.audit.superAdminLogs.useQuery(
    {
      limit: pageSize,
      action: filters.action || undefined,
      dateRange: dateRange.from || dateRange.to
        ? {
            from: dateRange.from,
            to: dateRange.to,
          }
        : undefined,
    },
    { enabled: activeTab === "admin" }
  );

  // Export mutation
  const exportMutation = trpc.superAdmin.audit.export.useMutation({
    onSuccess: (data) => {
      // Trigger download
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = `audit-export-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: `Downloaded ${data.recordCount.toLocaleString()} records`,
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Build filter options from action types
  const actionFilterOptions = useMemo(() => {
    if (!actionTypesQuery.data) return [];

    const allActions = [
      ...(actionTypesQuery.data.tenantActions || []),
      ...(actionTypesQuery.data.superAdminActions || []),
    ];

    // Group by prefix (e.g., "constituent", "organization")
    const grouped = new Map<string, string[]>();
    allActions.forEach((action) => {
      const prefix = action.split(".")[0] ?? "other";
      if (!grouped.has(prefix)) {
        grouped.set(prefix, []);
      }
      grouped.get(prefix)?.push(action);
    });

    const options: { value: string; label: string }[] = [];
    grouped.forEach((actions) => {
      actions.forEach((action) => {
        options.push({
          value: action,
          label: action,
        });
      });
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [actionTypesQuery.data]);

  // Combined logs columns
  const combinedColumns: Column<CombinedAuditLog>[] = [
    {
      key: "createdAt",
      header: "Time",
      sortable: true,
      width: "w-[180px]",
      render: (log) => (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      width: "w-[100px]",
      render: (log) => <SourceBadge source={log.source} />,
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      render: (log) => <ActionBadge action={log.action} />,
    },
    {
      key: "actorName",
      header: "Actor",
      sortable: true,
      render: (log) => (
        <div className="flex items-center gap-2">
          {log.actorType === "super_admin" ? (
            <Shield className="h-4 w-4 text-purple-500" />
          ) : (
            <Users className="h-4 w-4 text-blue-500" />
          )}
          <span className="truncate max-w-[150px]">{log.actorName}</span>
        </div>
      ),
    },
    {
      key: "organizationName",
      header: "Organization",
      render: (log) =>
        log.organizationName ? (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[150px]">{log.organizationName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "targetType",
      header: "Target",
      render: (log) =>
        log.targetType ? (
          <span className="text-sm">
            {log.targetType}
            {log.targetId && (
              <span className="text-muted-foreground ml-1">#{log.targetId.slice(0, 8)}</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "ipAddress",
      header: "IP",
      width: "w-[120px]",
      render: (log) => (
        <span className="font-mono text-xs text-muted-foreground">
          {log.ipAddress ?? "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-[50px]",
      render: (log) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(log);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // Admin-only logs columns
  const adminColumns: Column<SuperAdminLog>[] = [
    {
      key: "createdAt",
      header: "Time",
      sortable: true,
      width: "w-[180px]",
      render: (log) => (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      render: (log) => <ActionBadge action={log.action} />,
    },
    {
      key: "superAdminName",
      header: "Admin",
      sortable: true,
      render: (log) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-500" />
          <span className="truncate max-w-[150px]">{log.superAdminName}</span>
        </div>
      ),
    },
    {
      key: "organizationName",
      header: "Organization",
      render: (log) =>
        log.organizationName ? (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[150px]">{log.organizationName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "targetType",
      header: "Target",
      render: (log) => (
        <span className="text-sm">
          {log.targetType}
          {log.targetId && (
            <span className="text-muted-foreground ml-1">#{log.targetId.slice(0, 8)}</span>
          )}
        </span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP",
      width: "w-[120px]",
      render: (log) => (
        <span className="font-mono text-xs text-muted-foreground">
          {log.ipAddress ?? "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-[50px]",
      render: (log) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(log);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const handleExport = () => {
    exportMutation.mutate({
      organizationId: filters.organizationId || undefined,
      action: filters.action || undefined,
      dateRange: dateRange.from || dateRange.to
        ? {
            from: dateRange.from,
            to: dateRange.to,
          }
        : undefined,
      format: "csv",
    });
  };

  const clearFilters = () => {
    setFilters({});
    setDateRange({});
    setPage(1);
  };

  const hasActiveFilters =
    Object.keys(filters).length > 0 || dateRange.from || dateRange.to;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            View and export system activity logs
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={exportMutation.isPending}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {exportMutation.isPending ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {combinedLogsQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {combinedLogsQuery.data?.totalCount?.toLocaleString() ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenant Actions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actionTypesQuery.data?.tenantActions?.length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">unique action types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Actions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actionTypesQuery.data?.superAdminActions?.length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">unique action types</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Action type filter */}
            <Select
              value={filters.action || "all"}
              onValueChange={(value) =>
                setFilters((f) => ({
                  ...f,
                  action: value === "all" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range filter */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                placeholder="From"
                className="w-[150px]"
                value={dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    from: e.target.value ? new Date(e.target.value) : undefined,
                  }))
                }
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                placeholder="To"
                className="w-[150px]"
                value={dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    to: e.target.value ? new Date(e.target.value) : undefined,
                  }))
                }
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for All vs Admin-only logs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "admin")}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="h-4 w-4" />
            All Activity
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-2">
            <Shield className="h-4 w-4" />
            Admin Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Audit Logs</CardTitle>
              <CardDescription>
                Combined view of tenant and super admin activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={(combinedLogsQuery.data?.items ?? []) as CombinedAuditLog[]}
                columns={combinedColumns}
                getRowKey={(log) => log.id}
                isLoading={combinedLogsQuery.isLoading}
                emptyMessage="No audit logs found"
                onRowClick={(log) => setSelectedLog(log)}
                serverPagination={{
                  total: combinedLogsQuery.data?.totalCount ?? 0,
                  page,
                  pageSize,
                  onPageChange: setPage,
                  onPageSizeChange: (size) => {
                    setPageSize(size);
                    setPage(1);
                  },
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Super Admin Audit Logs</CardTitle>
              <CardDescription>
                Activity by platform administrators only
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={(adminLogsQuery.data?.items ?? []) as SuperAdminLog[]}
                columns={adminColumns}
                getRowKey={(log) => log.id}
                isLoading={adminLogsQuery.isLoading}
                emptyMessage="No admin audit logs found"
                onRowClick={(log) => setSelectedLog(log)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Full details for this audit log entry
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Action
                  </div>
                  <ActionBadge action={selectedLog.action} />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Timestamp
                  </div>
                  <div className="text-sm">
                    {format(new Date(selectedLog.createdAt), "PPpp")}
                  </div>
                </div>
              </div>

              {/* Actor info */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Actor
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {"actorType" in selectedLog ? (
                    <>
                      {selectedLog.actorType === "super_admin" ? (
                        <Shield className="h-4 w-4 text-purple-500" />
                      ) : (
                        <Users className="h-4 w-4 text-blue-500" />
                      )}
                      <span>{selectedLog.actorName}</span>
                      <span className="text-muted-foreground">
                        ({selectedLog.actorId})
                      </span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span>{(selectedLog as SuperAdminLog).superAdminName}</span>
                      <span className="text-muted-foreground">
                        ({(selectedLog as SuperAdminLog).superAdminId})
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Organization */}
              {selectedLog.organizationName && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Organization
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLog.organizationName}</span>
                    <span className="text-muted-foreground">
                      ({selectedLog.organizationId})
                    </span>
                  </div>
                </div>
              )}

              {/* Target */}
              {"targetType" in selectedLog && selectedLog.targetType && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Target
                  </div>
                  <div className="text-sm">
                    <span className="font-mono">{selectedLog.targetType}</span>
                    {selectedLog.targetId && (
                      <span className="text-muted-foreground ml-1">
                        ({selectedLog.targetId})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* IP Address */}
              {selectedLog.ipAddress && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    IP Address
                  </div>
                  <div className="font-mono text-sm">{selectedLog.ipAddress}</div>
                </div>
              )}

              {/* User Agent (for admin logs) */}
              {"userAgent" in selectedLog && selectedLog.userAgent && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    User Agent
                  </div>
                  <div className="font-mono text-xs text-muted-foreground break-all">
                    {selectedLog.userAgent}
                  </div>
                </div>
              )}

              {/* Details */}
              {selectedLog.details &&
                Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Details
                    </div>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-[200px]">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
