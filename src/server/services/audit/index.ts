// T066, T070: Audit log service for user actions
import prisma from "@/lib/prisma/client";

export interface AuditLogEntry {
  organizationId?: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry) {
  return prisma.auditLog.create({
    data: {
      organizationId: entry.organizationId,
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      details: entry.details,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    },
  });
}

/**
 * Log a user action with context
 */
export async function logAction(
  organizationId: string,
  userId: string,
  action: string,
  options?: {
    resourceType?: string;
    resourceId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: Record<string, any>;
    request?: Request;
  }
) {
  const ipAddress = options?.request?.headers.get("x-forwarded-for") || undefined;
  const userAgent = options?.request?.headers.get("user-agent") || undefined;

  return createAuditLog({
    organizationId,
    userId,
    action,
    resourceType: options?.resourceType,
    resourceId: options?.resourceId,
    details: options?.details,
    ipAddress,
    userAgent,
  });
}

/**
 * Standard audit actions
 */
export const AuditActions = {
  // User actions
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  USER_SIGNUP: "user.signup",
  USER_PASSWORD_RESET: "user.password_reset",
  USER_PASSWORD_CHANGE: "user.password_change",
  USER_INVITE: "user.invite",
  USER_ROLE_CHANGE: "user.role_change",
  USER_DELETE: "user.delete",

  // Upload actions
  UPLOAD_CREATE: "upload.create",
  UPLOAD_COMPLETE: "upload.complete",
  UPLOAD_FAILED: "upload.failed",

  // AI actions
  BRIEF_GENERATE: "brief.generate",
  QUERY_EXECUTE: "query.execute",

  // Report actions
  REPORT_GENERATE: "report.generate",

  // Constituent actions
  CONSTITUENT_VIEW: "constituent.view",
  CONSTITUENT_UPDATE: "constituent.update",
  CONSTITUENT_BULK_ASSIGN: "constituent.bulk_assign",

  // Settings
  SETTINGS_CHANGE: "settings.change",

  // Data management
  DATA_DELETE: "data.delete",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

/**
 * T066: Log route access (for sensitive routes)
 */
export async function logRouteAccess(
  organizationId: string,
  userId: string,
  route: string,
  options?: {
    method?: string;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  return createAuditLog({
    organizationId,
    userId,
    action: "route.access",
    resourceType: "route",
    resourceId: route,
    details: {
      method: options?.method || "GET",
    },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
}

/**
 * T066: Log data export
 */
export async function logDataExport(
  organizationId: string,
  userId: string,
  exportType: string,
  recordCount: number
) {
  return createAuditLog({
    organizationId,
    userId,
    action: "data.export",
    resourceType: "export",
    details: {
      exportType,
      recordCount,
    },
  });
}

/**
 * Get audit logs for an organization
 */
export async function getAuditLogs(
  organizationId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const where = {
    organizationId,
    ...(options?.action && { action: options.action }),
    ...(options?.userId && { userId: options.userId }),
    ...(options?.startDate && { createdAt: { gte: options.startDate } }),
    ...(options?.endDate && { createdAt: { lte: options.endDate } }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
