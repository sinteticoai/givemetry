// T068: Users List Page
"use client";

import { useState, useCallback } from "react";
import { adminTrpc } from "@/lib/trpc/admin-client";
import { UserTable } from "@/components/admin/users/UserTable";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function UsersPage() {

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");

  // Build cursor from page number
  const cursor = page > 1 ? undefined : undefined;

  // Fetch users with filters
  const {
    data,
    isLoading,
    refetch,
    isFetching,
    error,
  } = adminTrpc.users.list.useQuery(
    {
      limit: pageSize,
      cursor,
      search: searchQuery || undefined,
      role: roleFilter ? (roleFilter as "admin" | "manager" | "gift_officer" | "viewer") : undefined,
      status: statusFilter ? (statusFilter as "active" | "disabled") : undefined,
      organizationId: orgFilter || undefined,
      sort: {
        field: "createdAt",
        direction: "desc",
      },
    },
    {
      placeholderData: (prev) => prev,
    }
  );

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Handle page size change
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  // Handle search
  const handleSearch = useCallback((search: string) => {
    setSearchQuery(search);
    setPage(1);
  }, []);

  // Handle role filter
  const handleRoleFilter = useCallback((role: string) => {
    setRoleFilter(role);
    setPage(1);
  }, []);

  // Handle status filter
  const handleStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  // Handle org filter
  const handleOrgFilter = useCallback((orgId: string) => {
    setOrgFilter(orgId);
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage users across all organizations
          </p>
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
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-medium">Error loading users:</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Users table */}
      <UserTable
        users={data?.items ?? []}
        isLoading={isLoading}
        totalCount={data?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearch={handleSearch}
        onRoleFilter={handleRoleFilter}
        onStatusFilter={handleStatusFilter}
        onOrgFilter={handleOrgFilter}
        searchQuery={searchQuery}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        orgFilter={orgFilter}
      />
    </div>
  );
}
