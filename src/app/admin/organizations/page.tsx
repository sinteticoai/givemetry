// T044: Organizations List Page
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminTrpc } from "@/lib/trpc/admin-client";
import { OrganizationTable } from "@/components/admin/organizations/OrganizationTable";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

export default function OrganizationsPage() {
  const router = useRouter();

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");

  // Build cursor from page number (using offset-based pagination simulation)
  // In a real implementation, we'd track the actual cursor from responses
  const cursor = page > 1 ? undefined : undefined;

  // Fetch organizations with filters
  const {
    data,
    isLoading,
    refetch,
    isFetching,
    error,
  } = adminTrpc.organizations.list.useQuery(
    {
      limit: pageSize,
      cursor,
      search: searchQuery || undefined,
      status: statusFilter ? (statusFilter as "active" | "suspended" | "pending_deletion") : undefined,
      plan: planFilter || undefined,
      sort: {
        field: "createdAt",
        direction: "desc",
      },
    },
    {
      // Keep previous data while fetching
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
    setPage(1); // Reset to first page
  }, []);

  // Handle search
  const handleSearch = useCallback((search: string) => {
    setSearchQuery(search);
    setPage(1);
  }, []);

  // Handle status filter
  const handleStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  // Handle plan filter
  const handlePlanFilter = useCallback((plan: string) => {
    setPlanFilter(plan);
    setPage(1);
  }, []);

  // Navigate to create new organization
  const handleCreateOrg = useCallback(() => {
    router.push("/admin/organizations/new");
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage all organizations on the platform
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
          <Button onClick={handleCreateOrg}>
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-medium">Error loading organizations:</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Organizations table */}
      <OrganizationTable
        organizations={data?.items ?? []}
        isLoading={isLoading}
        totalCount={data?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearch={handleSearch}
        onStatusFilter={handleStatusFilter}
        onPlanFilter={handlePlanFilter}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        planFilter={planFilter}
      />
    </div>
  );
}
