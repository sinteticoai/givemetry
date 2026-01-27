/**
 * Super Admin Audit Logging Service
 *
 * Provides centralized audit logging for all super admin actions.
 * Logs are retained for 2 years per compliance requirements.
 */

import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export type AuditActionType =
  // Organization actions
  | "organization.create"
  | "organization.update"
  | "organization.suspend"
  | "organization.reactivate"
  | "organization.delete"
  | "organization.hard_delete"
  // User actions
  | "user.disable"
  | "user.enable"
  | "user.reset_password"
  | "user.change_role"
  // Impersonation actions
  | "impersonation.start"
  | "impersonation.end"
  | "impersonation.timeout"
  // Feature flag actions
  | "feature_flag.create"
  | "feature_flag.update"
  | "feature_flag.delete"
  | "feature_flag_override.set"
  | "feature_flag_override.remove"
  // Super admin actions
  | "super_admin.login"
  | "super_admin.logout"
  | "super_admin.login_failed"
  | "super_admin.locked"
  // Audit actions
  | "audit.export";

export type TargetType = "organization" | "user" | "feature_flag" | "super_admin" | "audit";

export interface LogAdminActionParams {
  superAdminId: string;
  action: AuditActionType;
  targetType: TargetType;
  targetId?: string;
  organizationId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Log a super admin action to the audit trail
 */
export async function logAdminAction(params: LogAdminActionParams) {
  return prisma.superAdminAuditLog.create({
    data: {
      superAdminId: params.superAdminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      organizationId: params.organizationId,
      details: params.details ? (params.details as Prisma.InputJsonValue) : Prisma.DbNull,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export interface GetAdminAuditLogsParams {
  superAdminId?: string;
  organizationId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query super admin audit logs with filters
 */
export async function getAdminAuditLogs(params: GetAdminAuditLogsParams = {}) {
  const { superAdminId, organizationId, action, targetType, targetId, startDate, endDate, limit = 50, offset = 0 } = params;

  const where: Prisma.SuperAdminAuditLogWhereInput = {};

  if (superAdminId) {
    where.superAdminId = superAdminId;
  }

  if (organizationId) {
    where.organizationId = organizationId;
  }

  if (action) {
    where.action = action;
  }

  if (targetType) {
    where.targetType = targetType;
  }

  if (targetId) {
    where.targetId = targetId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.superAdminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        superAdmin: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.superAdminAuditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    limit,
    offset,
    hasMore: offset + logs.length < total,
  };
}

/**
 * Get all unique action types for filtering
 */
export async function getActionTypes(): Promise<string[]> {
  const result = await prisma.superAdminAuditLog.findMany({
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });

  return result.map((r) => r.action);
}

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogsToCsv(params: GetAdminAuditLogsParams = {}): Promise<string> {
  // Override limit for export
  const exportParams = { ...params, limit: 100000, offset: 0 };
  const { logs } = await getAdminAuditLogs(exportParams);

  // CSV header
  const headers = ["ID", "Timestamp", "Admin Email", "Admin Name", "Action", "Target Type", "Target ID", "Organization ID", "IP Address", "Details"];

  // CSV rows
  const rows = logs.map((log) => [
    log.id.toString(),
    log.createdAt.toISOString(),
    log.superAdmin.email,
    log.superAdmin.name,
    log.action,
    log.targetType,
    log.targetId || "",
    log.organizationId || "",
    log.ipAddress || "",
    log.details ? JSON.stringify(log.details) : "",
  ]);

  // Combine header and rows
  const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");

  return csvContent;
}
