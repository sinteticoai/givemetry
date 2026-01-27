"use client";

import { cn } from "@/lib/utils";
import type { OrgStatus } from "@prisma/client";

export type StatusVariant = "active" | "suspended" | "pending_deletion" | "disabled" | "enabled" | "locked";

interface StatusBadgeProps {
  status: StatusVariant | OrgStatus;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<StatusVariant, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  suspended: {
    label: "Suspended",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  pending_deletion: {
    label: "Pending Deletion",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  disabled: {
    label: "Disabled",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
  enabled: {
    label: "Enabled",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  locked: {
    label: "Locked",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
  lg: "px-3 py-1 text-base",
};

export function StatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status as StatusVariant] || {
    label: status,
    className: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export default StatusBadge;
