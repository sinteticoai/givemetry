// T042: Organization Table Component
"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DataTable, type Column, type Filter } from "@/components/admin/shared/DataTable";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import type { OrgStatus } from "@prisma/client";

export interface OrganizationListItem {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  planExpiresAt: Date | null;
  status: OrgStatus;
  usersCount: number;
  constituentsCount: number;
  lastActivityAt: Date | null;
  createdAt: Date;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  deletedAt: Date | null;
}

interface OrganizationTableProps {
  organizations: OrganizationListItem[];
  isLoading?: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSearch: (search: string) => void;
  onStatusFilter: (status: string) => void;
  onPlanFilter: (plan: string) => void;
  searchQuery?: string;
  statusFilter?: string;
  planFilter?: string;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return "-";
  return format(new Date(date), "MMM d, yyyy");
};

const formatPlan = (plan: string | null): string => {
  if (!plan) return "None";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
};

export function OrganizationTable({
  organizations,
  isLoading,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSearch: _onSearch,
  onStatusFilter,
  onPlanFilter,
  searchQuery: _searchQuery,
  statusFilter,
  planFilter,
}: OrganizationTableProps) {
  // Note: onSearch and searchQuery are passed for potential external search handling
  // but DataTable handles client-side search internally
  void _onSearch;
  void _searchQuery;
  const router = useRouter();

  const columns: Column<OrganizationListItem>[] = [
    {
      key: "name",
      header: "Organization",
      sortable: true,
      render: (org) => (
        <div>
          <div className="font-medium">{org.name}</div>
          <div className="text-sm text-muted-foreground">{org.slug}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (org) => <StatusBadge status={org.status} />,
    },
    {
      key: "plan",
      header: "Plan",
      sortable: true,
      render: (org) => (
        <div>
          <div>{formatPlan(org.plan)}</div>
          {org.planExpiresAt && (
            <div className="text-xs text-muted-foreground">
              Expires: {formatDate(org.planExpiresAt)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "usersCount",
      header: "Users",
      sortable: true,
      render: (org) => formatNumber(org.usersCount),
      accessor: (org) => org.usersCount,
    },
    {
      key: "constituentsCount",
      header: "Constituents",
      sortable: true,
      render: (org) => formatNumber(org.constituentsCount),
      accessor: (org) => org.constituentsCount,
    },
    {
      key: "lastActivityAt",
      header: "Last Activity",
      sortable: true,
      render: (org) => formatDate(org.lastActivityAt),
      accessor: (org) => org.lastActivityAt,
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (org) => formatDate(org.createdAt),
      accessor: (org) => org.createdAt,
    },
  ];

  const filters: Filter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "suspended", label: "Suspended" },
        { value: "pending_deletion", label: "Pending Deletion" },
      ],
    },
    {
      key: "plan",
      label: "Plan",
      options: [
        { value: "trial", label: "Trial" },
        { value: "pro", label: "Pro" },
        { value: "enterprise", label: "Enterprise" },
      ],
    },
  ];

  const handleRowClick = (org: OrganizationListItem) => {
    router.push(`/admin/organizations/${org.id}`);
  };

  const handleFilterChange = (newFilters: Record<string, string>) => {
    if ("status" in newFilters || statusFilter) {
      onStatusFilter(newFilters.status || "");
    }
    if ("plan" in newFilters || planFilter) {
      onPlanFilter(newFilters.plan || "");
    }
  };

  return (
    <DataTable
      data={organizations}
      columns={columns}
      getRowKey={(org) => org.id}
      searchable
      searchPlaceholder="Search organizations..."
      searchColumns={["name", "slug"]}
      filters={filters}
      isLoading={isLoading}
      emptyMessage="No organizations found"
      onRowClick={handleRowClick}
      filterValues={{
        ...(statusFilter && { status: statusFilter }),
        ...(planFilter && { plan: planFilter }),
      }}
      onFilterChange={handleFilterChange}
      serverPagination={{
        total: totalCount,
        page,
        pageSize,
        onPageChange,
        onPageSizeChange,
      }}
    />
  );
}

export default OrganizationTable;
