// T039-T041: Super Admin Organizations Router
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminRouter, adminProtectedProcedure } from "./auth";
import prisma from "@/lib/prisma/client";
import type { OrgStatus, Prisma } from "@prisma/client";

// Input schemas
const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["name", "createdAt", "usersCount", "status"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const listInputSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(["active", "suspended", "pending_deletion"]).optional(),
  plan: z.string().optional(),
  sort: sortSchema.optional(),
});

const updateInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  plan: z.string().optional(),
  planExpiresAt: z.date().optional(),
  usageLimits: z.record(z.string(), z.number()).optional(),
});

// Helper to build where clause for organization queries
function buildWhereClause(input: z.infer<typeof listInputSchema>) {
  const where: Prisma.OrganizationWhereInput = {
    // Always exclude soft-deleted organizations unless status explicitly requests them
    ...(input.status !== "pending_deletion" && { deletedAt: null }),
  };

  if (input.status) {
    where.status = input.status as OrgStatus;
  }

  if (input.plan) {
    where.plan = input.plan;
  }

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { slug: { contains: input.search, mode: "insensitive" } },
    ];
  }

  return where;
}

// Helper to get last activity timestamp for an org
async function getLastActivityAt(organizationId: string): Promise<Date | null> {
  const lastLog = await prisma.auditLog.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return lastLog?.createdAt ?? null;
}

export const organizationsRouter = adminRouter({
  // T039: List all organizations with pagination and filters
  list: adminProtectedProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const { cursor, limit, sort } = input;
      const where = buildWhereClause(input);

      // Build orderBy based on sort input
      const sortField = sort?.field ?? "createdAt";
      const sortDir = sort?.direction ?? "desc";

      // Build orderBy - handle special case for usersCount
      let orderBy: Prisma.OrganizationOrderByWithRelationInput = {};
      if (sortField === "usersCount") {
        orderBy = { users: { _count: sortDir } };
      } else {
        orderBy = { [sortField]: sortDir };
      }

      // Query organizations with counts
      const organizations = await prisma.organization.findMany({
        where,
        take: limit + 1, // Take one extra to determine if there's a next page
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0, // Skip cursor record on subsequent pages
        orderBy,
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          planExpiresAt: true,
          status: true,
          createdAt: true,
          suspendedAt: true,
          suspendedReason: true,
          deletedAt: true,
          _count: {
            select: {
              users: true,
              constituents: true,
            },
          },
        },
      });

      // Check if there's a next page
      let nextCursor: string | undefined;
      if (organizations.length > limit) {
        const nextItem = organizations.pop();
        nextCursor = nextItem?.id;
      }

      // Get total count for the query
      const totalCount = await prisma.organization.count({ where });

      // Get last activity for each org (optimize with batch query in production)
      const items = await Promise.all(
        organizations.map(async (org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
          planExpiresAt: org.planExpiresAt,
          status: org.status,
          usersCount: org._count.users,
          constituentsCount: org._count.constituents,
          lastActivityAt: await getLastActivityAt(org.id),
          createdAt: org.createdAt,
          suspendedAt: org.suspendedAt,
          suspendedReason: org.suspendedReason,
          deletedAt: org.deletedAt,
        }))
      );

      return {
        items,
        nextCursor,
        totalCount,
      };
    }),

  // T040: Get single organization with full details
  get: adminProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const org = await prisma.organization.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          planExpiresAt: true,
          status: true,
          settings: true,
          usageLimits: true,
          features: true,
          createdAt: true,
          suspendedAt: true,
          suspendedReason: true,
          deletedAt: true,
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              lastLoginAt: true,
              isDisabled: true,
            },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              users: true,
              constituents: true,
            },
          },
        },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Get recent activity from audit logs
      const recentActivity = await prisma.auditLog.findMany({
        where: { organizationId: input.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          userId: true,
          createdAt: true,
          user: {
            select: { name: true },
          },
        },
      });

      // Get last activity timestamp
      const lastActivityAt = await getLastActivityAt(input.id);

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        planExpiresAt: org.planExpiresAt,
        status: org.status,
        usersCount: org._count.users,
        constituentsCount: org._count.constituents,
        lastActivityAt,
        createdAt: org.createdAt,
        suspendedAt: org.suspendedAt,
        suspendedReason: org.suspendedReason,
        deletedAt: org.deletedAt,
        settings: org.settings as Record<string, unknown>,
        usageLimits: org.usageLimits as Record<string, number>,
        features: org.features as Record<string, boolean>,
        users: org.users.map((user) => ({
          id: user.id,
          name: user.name ?? "",
          email: user.email,
          role: user.role,
          lastLoginAt: user.lastLoginAt,
          isDisabled: user.isDisabled,
        })),
        recentActivity: recentActivity.map((log) => ({
          id: log.id.toString(),
          action: log.action,
          userId: log.userId,
          userName: log.user?.name ?? null,
          createdAt: log.createdAt,
        })),
      };
    }),

  // T041: Update organization settings
  update: adminProtectedProcedure
    .input(updateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if organization exists
      const existingOrg = await prisma.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          plan: true,
          planExpiresAt: true,
          usageLimits: true,
          status: true,
        },
      });

      if (!existingOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Build update data - only include provided fields
      const data: Prisma.OrganizationUpdateInput = {};
      const changes: Record<string, [unknown, unknown]> = {};

      if (updateData.name !== undefined) {
        data.name = updateData.name;
        changes.name = [existingOrg.name, updateData.name];
      }

      if (updateData.plan !== undefined) {
        data.plan = updateData.plan;
        changes.plan = [existingOrg.plan, updateData.plan];
      }

      if (updateData.planExpiresAt !== undefined) {
        data.planExpiresAt = updateData.planExpiresAt;
        changes.planExpiresAt = [existingOrg.planExpiresAt, updateData.planExpiresAt];
      }

      if (updateData.usageLimits !== undefined) {
        data.usageLimits = updateData.usageLimits as Prisma.InputJsonValue;
        changes.usageLimits = [existingOrg.usageLimits, updateData.usageLimits];
      }

      // Perform update
      const updatedOrg = await prisma.organization.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          planExpiresAt: true,
          status: true,
          createdAt: true,
          suspendedAt: true,
          suspendedReason: true,
          deletedAt: true,
          _count: {
            select: {
              users: true,
              constituents: true,
            },
          },
        },
      });

      // Log audit action
      await ctx.logAuditAction({
        action: "organization.update",
        targetType: "organization",
        targetId: id,
        organizationId: id,
        details: { changes },
      });

      // Get last activity
      const lastActivityAt = await getLastActivityAt(id);

      return {
        id: updatedOrg.id,
        name: updatedOrg.name,
        slug: updatedOrg.slug,
        plan: updatedOrg.plan,
        planExpiresAt: updatedOrg.planExpiresAt,
        status: updatedOrg.status,
        usersCount: updatedOrg._count.users,
        constituentsCount: updatedOrg._count.constituents,
        lastActivityAt,
        createdAt: updatedOrg.createdAt,
        suspendedAt: updatedOrg.suspendedAt,
        suspendedReason: updatedOrg.suspendedReason,
        deletedAt: updatedOrg.deletedAt,
      };
    }),
});

export type OrganizationsRouter = typeof organizationsRouter;
