// T094-T097: Super Admin Audit Router
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminRouter, adminProtectedProcedure } from "./auth";
import prisma from "@/lib/prisma/client";

// Input schemas
const dateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

const auditListInputSchema = paginationSchema.extend({
  organizationId: z.string().uuid().optional(),
  superAdminId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  dateRange: dateRangeSchema.optional(),
});

const exportInputSchema = auditListInputSchema.extend({
  format: z.enum(["csv"]).default("csv"),
});

// Helper to build date filter
function buildDateFilter(dateRange?: { from?: Date; to?: Date }) {
  if (!dateRange) return undefined;

  const filter: { gte?: Date; lte?: Date } = {};
  if (dateRange.from) filter.gte = dateRange.from;
  if (dateRange.to) filter.lte = dateRange.to;

  return Object.keys(filter).length > 0 ? filter : undefined;
}

// Helper to convert BigInt id to string for JSON serialization
function serializeId(id: bigint | string): string {
  return typeof id === "bigint" ? id.toString() : id;
}

// Helper to generate CSV content
function generateAuditCsv(
  logs: Array<{
    id: string;
    source: string;
    action: string;
    actorType: string;
    actorId: string;
    actorName: string;
    organizationId: string | null;
    organizationName: string | null;
    targetType: string | null;
    targetId: string | null;
    details: unknown;
    ipAddress: string | null;
    createdAt: Date;
  }>
): string {
  const headers = [
    "ID",
    "Source",
    "Action",
    "Actor Type",
    "Actor ID",
    "Actor Name",
    "Organization ID",
    "Organization Name",
    "Target Type",
    "Target ID",
    "Details",
    "IP Address",
    "Created At",
  ];

  const rows = logs.map((log) => [
    log.id,
    log.source,
    log.action,
    log.actorType,
    log.actorId,
    log.actorName,
    log.organizationId ?? "",
    log.organizationName ?? "",
    log.targetType ?? "",
    log.targetId ?? "",
    log.details ? JSON.stringify(log.details) : "",
    log.ipAddress ?? "",
    log.createdAt.toISOString(),
  ]);

  // Escape CSV fields
  const escapeField = (field: string): string => {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const csvRows = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeField).join(",")),
  ];

  return csvRows.join("\n");
}

export const auditRouter = adminRouter({
  // T094: List audit logs (tenant + super admin combined view)
  list: adminProtectedProcedure
    .input(auditListInputSchema)
    .query(async ({ input }) => {
      const { cursor, limit, organizationId, userId, action, targetType, dateRange } = input;

      const dateFilter = buildDateFilter(dateRange);

      // Build tenant audit log query
      const tenantWhere: Record<string, unknown> = {};
      if (organizationId) tenantWhere.organizationId = organizationId;
      if (userId) tenantWhere.userId = userId;
      if (action) tenantWhere.action = { contains: action };
      if (targetType) tenantWhere.resourceType = targetType;
      if (dateFilter) tenantWhere.createdAt = dateFilter;

      // Build super admin audit log query
      const adminWhere: Record<string, unknown> = {};
      if (organizationId) adminWhere.organizationId = organizationId;
      if (input.superAdminId) adminWhere.superAdminId = input.superAdminId;
      if (action) adminWhere.action = { contains: action };
      if (targetType) adminWhere.targetType = targetType;
      if (dateFilter) adminWhere.createdAt = dateFilter;

      // Fetch both log types in parallel
      const [tenantLogs, adminLogs, tenantCount, adminCount] = await Promise.all([
        prisma.auditLog.findMany({
          where: tenantWhere,
          include: {
            user: { select: { id: true, name: true } },
            organization: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1, // Fetch one extra to check for next page
          ...(cursor ? { cursor: { id: BigInt(cursor) }, skip: 1 } : {}),
        }),
        prisma.superAdminAuditLog.findMany({
          where: adminWhere,
          include: {
            superAdmin: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: BigInt(cursor) }, skip: 1 } : {}),
        }),
        prisma.auditLog.count({ where: tenantWhere }),
        prisma.superAdminAuditLog.count({ where: adminWhere }),
      ]);

      // Get organization names for admin logs that have organizationId
      const adminOrgIds = adminLogs
        .filter((log) => log.organizationId)
        .map((log) => log.organizationId as string);

      const orgsMap = new Map<string, string>();
      if (adminOrgIds.length > 0) {
        const orgs = await prisma.organization.findMany({
          where: { id: { in: adminOrgIds } },
          select: { id: true, name: true },
        });
        orgs.forEach((org) => orgsMap.set(org.id, org.name));
      }

      // Transform tenant logs
      const transformedTenantLogs = tenantLogs.map((log) => ({
        id: serializeId(log.id),
        source: "tenant" as const,
        action: log.action,
        actorType: "user" as const,
        actorId: log.userId ?? "",
        actorName: log.user?.name ?? "Unknown",
        organizationId: log.organizationId,
        organizationName: log.organization?.name ?? null,
        targetType: log.resourceType,
        targetId: log.resourceId,
        details: log.details as Record<string, unknown> | null,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      }));

      // Transform admin logs
      const transformedAdminLogs = adminLogs.map((log) => ({
        id: serializeId(log.id),
        source: "super_admin" as const,
        action: log.action,
        actorType: "super_admin" as const,
        actorId: log.superAdminId,
        actorName: log.superAdmin?.name ?? "Unknown",
        organizationId: log.organizationId,
        organizationName: log.organizationId
          ? orgsMap.get(log.organizationId) ?? null
          : null,
        targetType: log.targetType,
        targetId: log.targetId,
        details: log.details as Record<string, unknown> | null,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      }));

      // Merge and sort by createdAt descending
      const allLogs = [...transformedTenantLogs, ...transformedAdminLogs]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit + 1);

      // Check if there's a next page
      const hasNextPage = allLogs.length > limit;
      const items = hasNextPage ? allLogs.slice(0, limit) : allLogs;
      const nextCursor = hasNextPage ? items[items.length - 1]?.id : undefined;

      return {
        items,
        nextCursor,
        totalCount: tenantCount + adminCount,
      };
    }),

  // T095: List super admin-only audit logs
  superAdminLogs: adminProtectedProcedure
    .input(auditListInputSchema.omit({ userId: true }))
    .query(async ({ input }) => {
      const { cursor, limit, organizationId, superAdminId, action, targetType, dateRange } = input;

      const dateFilter = buildDateFilter(dateRange);

      // Build where clause
      const where: Record<string, unknown> = {};
      if (organizationId) where.organizationId = organizationId;
      if (superAdminId) where.superAdminId = superAdminId;
      if (action) where.action = { contains: action };
      if (targetType) where.targetType = targetType;
      if (dateFilter) where.createdAt = dateFilter;

      // Fetch logs with related data
      const logs = await prisma.superAdminAuditLog.findMany({
        where,
        include: {
          superAdmin: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: BigInt(cursor) }, skip: 1 } : {}),
      });

      // Get organization names for logs that have organizationId
      const orgIds = logs
        .filter((log) => log.organizationId)
        .map((log) => log.organizationId as string);

      const orgsMap = new Map<string, string>();
      if (orgIds.length > 0) {
        const orgs = await prisma.organization.findMany({
          where: { id: { in: orgIds } },
          select: { id: true, name: true },
        });
        orgs.forEach((org) => orgsMap.set(org.id, org.name));
      }

      // Check for next page
      const hasNextPage = logs.length > limit;
      const items = hasNextPage ? logs.slice(0, limit) : logs;
      const nextCursor = hasNextPage
        ? serializeId(items[items.length - 1]!.id)
        : undefined;

      return {
        items: items.map((log) => ({
          id: serializeId(log.id),
          superAdminId: log.superAdminId,
          superAdminName: log.superAdmin?.name ?? "Unknown",
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          organizationId: log.organizationId,
          organizationName: log.organizationId
            ? orgsMap.get(log.organizationId) ?? null
            : null,
          details: log.details as Record<string, unknown> | null,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt,
        })),
        nextCursor,
      };
    }),

  // T096: Get unique action types for filtering
  actionTypes: adminProtectedProcedure.query(async () => {
    // Get unique tenant actions
    const tenantActionsRaw = await prisma.auditLog.groupBy({
      by: ["action"],
      orderBy: { action: "asc" },
    });

    // Get unique super admin actions
    const adminActionsRaw = await prisma.superAdminAuditLog.groupBy({
      by: ["action"],
      orderBy: { action: "asc" },
    });

    return {
      tenantActions: tenantActionsRaw.map((a) => a.action),
      superAdminActions: adminActionsRaw.map((a) => a.action),
    };
  }),

  // T097: Export audit logs to CSV
  export: adminProtectedProcedure
    .input(exportInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { organizationId, userId, superAdminId, action, targetType, dateRange } = input;

      const dateFilter = buildDateFilter(dateRange);

      // Build tenant audit log query
      const tenantWhere: Record<string, unknown> = {};
      if (organizationId) tenantWhere.organizationId = organizationId;
      if (userId) tenantWhere.userId = userId;
      if (action) tenantWhere.action = { contains: action };
      if (targetType) tenantWhere.resourceType = targetType;
      if (dateFilter) tenantWhere.createdAt = dateFilter;

      // Build super admin audit log query
      const adminWhere: Record<string, unknown> = {};
      if (organizationId) adminWhere.organizationId = organizationId;
      if (superAdminId) adminWhere.superAdminId = superAdminId;
      if (action) adminWhere.action = { contains: action };
      if (targetType) adminWhere.targetType = targetType;
      if (dateFilter) adminWhere.createdAt = dateFilter;

      // For large exports, we'll process in batches
      // In production, this would be a background job
      const batchSize = 5000;
      const allLogs: Array<{
        id: string;
        source: string;
        action: string;
        actorType: string;
        actorId: string;
        actorName: string;
        organizationId: string | null;
        organizationName: string | null;
        targetType: string | null;
        targetId: string | null;
        details: unknown;
        ipAddress: string | null;
        createdAt: Date;
      }> = [];

      // Fetch tenant logs in batches
      let tenantCursor: bigint | undefined;
      let hasMoreTenant = true;

      while (hasMoreTenant && allLogs.length < 100000) {
        const batch = await prisma.auditLog.findMany({
          where: tenantWhere,
          include: {
            user: { select: { id: true, name: true } },
            organization: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: batchSize,
          ...(tenantCursor ? { cursor: { id: tenantCursor }, skip: 1 } : {}),
        });

        if (batch.length < batchSize) {
          hasMoreTenant = false;
        } else {
          tenantCursor = batch[batch.length - 1]?.id;
        }

        allLogs.push(
          ...batch.map((log) => ({
            id: serializeId(log.id),
            source: "tenant",
            action: log.action,
            actorType: "user",
            actorId: log.userId ?? "",
            actorName: log.user?.name ?? "Unknown",
            organizationId: log.organizationId,
            organizationName: log.organization?.name ?? null,
            targetType: log.resourceType,
            targetId: log.resourceId,
            details: log.details,
            ipAddress: log.ipAddress,
            createdAt: log.createdAt,
          }))
        );
      }

      // Fetch admin logs in batches
      let adminCursor: bigint | undefined;
      let hasMoreAdmin = true;

      // Build org lookup map for admin logs
      const adminOrgIds = new Set<string>();

      while (hasMoreAdmin && allLogs.length < 100000) {
        const batch = await prisma.superAdminAuditLog.findMany({
          where: adminWhere,
          include: {
            superAdmin: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: batchSize,
          ...(adminCursor ? { cursor: { id: adminCursor }, skip: 1 } : {}),
        });

        if (batch.length < batchSize) {
          hasMoreAdmin = false;
        } else {
          adminCursor = batch[batch.length - 1]?.id;
        }

        batch.forEach((log) => {
          if (log.organizationId) adminOrgIds.add(log.organizationId);
        });

        allLogs.push(
          ...batch.map((log) => ({
            id: serializeId(log.id),
            source: "super_admin",
            action: log.action,
            actorType: "super_admin",
            actorId: log.superAdminId,
            actorName: log.superAdmin?.name ?? "Unknown",
            organizationId: log.organizationId,
            organizationName: null, // Will be populated below
            targetType: log.targetType,
            targetId: log.targetId,
            details: log.details,
            ipAddress: log.ipAddress,
            createdAt: log.createdAt,
          }))
        );
      }

      // Fetch organization names for admin logs
      if (adminOrgIds.size > 0) {
        const orgs = await prisma.organization.findMany({
          where: { id: { in: Array.from(adminOrgIds) } },
          select: { id: true, name: true },
        });

        const orgsMap = new Map(orgs.map((o) => [o.id, o.name]));

        // Update organization names in admin logs
        allLogs.forEach((log) => {
          if (log.source === "super_admin" && log.organizationId) {
            log.organizationName = orgsMap.get(log.organizationId) ?? null;
          }
        });
      }

      // Sort all logs by createdAt descending
      allLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Generate CSV content
      const csvContent = generateAuditCsv(allLogs);

      // In a real implementation, we would:
      // 1. Upload to S3 or similar storage
      // 2. Generate a signed URL with expiration
      // For now, we'll use a data URL (for development) or throw if too large

      if (csvContent.length > 1024 * 1024 * 10) {
        // > 10MB
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message:
            "Export too large. Please narrow your filter criteria or contact support for large exports.",
        });
      }

      // Create a base64 data URL for the CSV
      const base64Content = Buffer.from(csvContent).toString("base64");
      const downloadUrl = `data:text/csv;base64,${base64Content}`;

      // Set expiration to 1 hour from now
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Log the export action
      await ctx.logAuditAction({
        action: "audit.export",
        targetType: "audit_log",
        details: {
          recordCount: allLogs.length,
          filters: {
            organizationId,
            userId,
            superAdminId,
            action,
            targetType,
            dateRange,
          },
        },
      });

      return {
        downloadUrl,
        expiresAt,
        recordCount: allLogs.length,
      };
    }),
});

export type AuditRouter = typeof auditRouter;
