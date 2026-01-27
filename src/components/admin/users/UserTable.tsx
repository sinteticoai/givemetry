// T066: User Table Component
"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DataTable, type Column, type Filter } from "@/components/admin/shared/DataTable";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import type { UserRole } from "@prisma/client";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
  lastLoginAt: Date | null;
  isDisabled: boolean;
  disabledAt: Date | null;
  disabledReason: string | null;
  createdAt: Date;
}

interface UserTableProps {
  users: UserListItem[];
  isLoading?: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSearch: (search: string) => void;
  onRoleFilter: (role: string) => void;
  onStatusFilter: (status: string) => void;
  onOrgFilter: (orgId: string) => void;
  searchQuery?: string;
  roleFilter?: string;
  statusFilter?: string;
  orgFilter?: string;
}

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return "Never";
  return format(new Date(date), "MMM d, yyyy");
};

const formatDateTime = (date: Date | null | undefined): string => {
  if (!date) return "Never";
  return format(new Date(date), "MMM d, yyyy h:mm a");
};

const formatRole = (role: UserRole): string => {
  const roleMap: Record<UserRole, string> = {
    admin: "Admin",
    manager: "Manager",
    gift_officer: "Gift Officer",
    viewer: "Viewer",
  };
  return roleMap[role] || role;
};

export function UserTable({
  users,
  isLoading,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSearch: _onSearch,
  onRoleFilter,
  onStatusFilter,
  onOrgFilter: _onOrgFilter,
  searchQuery: _searchQuery,
  roleFilter,
  statusFilter,
  orgFilter: _orgFilter,
}: UserTableProps) {
  // Note: some props are passed for potential external handling
  // but DataTable handles client-side search internally
  void _onSearch;
  void _searchQuery;
  void _onOrgFilter;
  void _orgFilter;
  const router = useRouter();

  const columns: Column<UserListItem>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      render: (user) => (
        <div>
          <div className="font-medium">{user.name || "(No name)"}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      ),
    },
    {
      key: "organizationName",
      header: "Organization",
      sortable: true,
      render: (user) => (
        <span className="text-sm">{user.organizationName}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (user) => (
        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium">
          {formatRole(user.role)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (user) => (
        <StatusBadge status={user.isDisabled ? "disabled" : "active"} />
      ),
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      sortable: true,
      render: (user) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(user.lastLoginAt)}
        </span>
      ),
      accessor: (user) => user.lastLoginAt,
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (user) => formatDate(user.createdAt),
      accessor: (user) => user.createdAt,
    },
  ];

  const filters: Filter[] = [
    {
      key: "role",
      label: "Role",
      options: [
        { value: "admin", label: "Admin" },
        { value: "manager", label: "Manager" },
        { value: "gift_officer", label: "Gift Officer" },
        { value: "viewer", label: "Viewer" },
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "disabled", label: "Disabled" },
      ],
    },
  ];

  const handleRowClick = (user: UserListItem) => {
    router.push(`/admin/users/${user.id}`);
  };

  const handleFilterChange = (newFilters: Record<string, string>) => {
    if ("role" in newFilters || roleFilter) {
      onRoleFilter(newFilters.role || "");
    }
    if ("status" in newFilters || statusFilter) {
      onStatusFilter(newFilters.status || "");
    }
  };

  return (
    <DataTable
      data={users}
      columns={columns}
      getRowKey={(user) => user.id}
      searchable
      searchPlaceholder="Search users by name or email..."
      searchColumns={["name", "email"]}
      filters={filters}
      isLoading={isLoading}
      emptyMessage="No users found"
      onRowClick={handleRowClick}
      filterValues={{
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
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

export default UserTable;
