// T039-T041, T049-T052: Super Admin Organizations Router
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminRouter, adminProtectedProcedure, superAdminOnlyProcedure } from "./auth";
import prisma from "@/lib/prisma/client";
import type { OrgStatus, Prisma } from "@prisma/client";
import { sendInviteEmail } from "@/server/services/email";

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

// T049: Create organization input schema
const createInputSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  plan: z.string().optional(),
  initialAdminEmail: z.string().email().optional(),
});

// T051: Suspend organization input schema
const suspendInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1).max(1000),
});

// T052: Reactivate organization input schema
const reactivateInputSchema = z.object({
  id: z.string().uuid(),
});

// T111: Soft delete organization input schema
const deleteInputSchema = z.object({
  id: z.string().uuid(),
  confirmationName: z.string().min(1, "Confirmation name is required"),
});

// T112: Hard delete organization input schema
const hardDeleteInputSchema = z.object({
  id: z.string().uuid(),
  confirmationName: z.string().min(1, "Confirmation name is required"),
});

// Helper to generate a random token for invitation
function generateInviteToken(): string {
  return crypto.randomUUID() + "-" + crypto.randomUUID();
}

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
  // T049: Create new organization
  create: adminProtectedProcedure
    .input(createInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if slug already exists
      const existingOrg = await prisma.organization.findFirst({
        where: { slug: input.slug },
      });

      if (existingOrg) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `An organization with slug "${input.slug}" already exists`,
        });
      }

      // Create the organization
      const newOrg = await prisma.organization.create({
        data: {
          name: input.name,
          slug: input.slug,
          plan: input.plan || "trial",
          status: "active",
          settings: {},
          features: {},
          usageLimits: {},
        },
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

      // T050: Create initial admin user if email provided
      if (input.initialAdminEmail) {
        const inviteToken = generateInviteToken();

        // Create the user with pending verification
        await prisma.user.create({
          data: {
            email: input.initialAdminEmail,
            organizationId: newOrg.id,
            role: "admin",
            // User will set password when accepting invite
          },
        });

        // Send invitation email
        try {
          await sendInviteEmail({
            to: input.initialAdminEmail,
            inviterName: ctx.session.name,
            organizationName: newOrg.name,
            token: inviteToken,
          });
        } catch (error) {
          // Log error but don't fail the org creation
          console.error("Failed to send invite email:", error);
        }
      }

      // Log audit action
      await ctx.logAuditAction({
        action: "organization.create",
        targetType: "organization",
        targetId: newOrg.id,
        organizationId: newOrg.id,
        details: {
          name: newOrg.name,
          slug: newOrg.slug,
          plan: newOrg.plan,
          initialAdminEmail: input.initialAdminEmail || null,
        },
      });

      // Get last activity (will be null for new org)
      const lastActivityAt = await getLastActivityAt(newOrg.id);

      return {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        plan: newOrg.plan,
        planExpiresAt: newOrg.planExpiresAt,
        status: newOrg.status,
        usersCount: newOrg._count.users,
        constituentsCount: newOrg._count.constituents,
        lastActivityAt,
        createdAt: newOrg.createdAt,
        suspendedAt: newOrg.suspendedAt,
        suspendedReason: newOrg.suspendedReason,
        deletedAt: newOrg.deletedAt,
      };
    }),

  // T051: Suspend organization
  suspend: adminProtectedProcedure
    .input(suspendInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if organization exists
      const existingOrg = await prisma.organization.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

      if (!existingOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Check if already suspended
      if (existingOrg.status === "suspended") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization is already suspended",
        });
      }

      // Check if pending deletion
      if (existingOrg.status === "pending_deletion") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot suspend an organization pending deletion",
        });
      }

      // Suspend the organization
      const suspendedOrg = await prisma.organization.update({
        where: { id: input.id },
        data: {
          status: "suspended",
          suspendedAt: new Date(),
          suspendedReason: input.reason,
        },
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
        action: "organization.suspend",
        targetType: "organization",
        targetId: input.id,
        organizationId: input.id,
        details: {
          reason: input.reason,
          previousStatus: existingOrg.status,
        },
      });

      // Get last activity
      const lastActivityAt = await getLastActivityAt(input.id);

      return {
        id: suspendedOrg.id,
        name: suspendedOrg.name,
        slug: suspendedOrg.slug,
        plan: suspendedOrg.plan,
        planExpiresAt: suspendedOrg.planExpiresAt,
        status: suspendedOrg.status,
        usersCount: suspendedOrg._count.users,
        constituentsCount: suspendedOrg._count.constituents,
        lastActivityAt,
        createdAt: suspendedOrg.createdAt,
        suspendedAt: suspendedOrg.suspendedAt,
        suspendedReason: suspendedOrg.suspendedReason,
        deletedAt: suspendedOrg.deletedAt,
      };
    }),

  // T052: Reactivate organization
  reactivate: adminProtectedProcedure
    .input(reactivateInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if organization exists
      const existingOrg = await prisma.organization.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          status: true,
          suspendedAt: true,
          suspendedReason: true,
        },
      });

      if (!existingOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Check if not suspended
      if (existingOrg.status !== "suspended") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization is not suspended",
        });
      }

      // Reactivate the organization
      const reactivatedOrg = await prisma.organization.update({
        where: { id: input.id },
        data: {
          status: "active",
          suspendedAt: null,
          suspendedReason: null,
        },
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
        action: "organization.reactivate",
        targetType: "organization",
        targetId: input.id,
        organizationId: input.id,
        details: {
          previousSuspendedAt: existingOrg.suspendedAt?.toISOString() || null,
          previousSuspendedReason: existingOrg.suspendedReason,
        },
      });

      // Get last activity
      const lastActivityAt = await getLastActivityAt(input.id);

      return {
        id: reactivatedOrg.id,
        name: reactivatedOrg.name,
        slug: reactivatedOrg.slug,
        plan: reactivatedOrg.plan,
        planExpiresAt: reactivatedOrg.planExpiresAt,
        status: reactivatedOrg.status,
        usersCount: reactivatedOrg._count.users,
        constituentsCount: reactivatedOrg._count.constituents,
        lastActivityAt,
        createdAt: reactivatedOrg.createdAt,
        suspendedAt: reactivatedOrg.suspendedAt,
        suspendedReason: reactivatedOrg.suspendedReason,
        deletedAt: reactivatedOrg.deletedAt,
      };
    }),

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

  // T111: Soft delete organization (30-day retention period)
  delete: adminProtectedProcedure
    .input(deleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if organization exists
      const existingOrg = await prisma.organization.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          status: true,
          deletedAt: true,
        },
      });

      if (!existingOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Verify confirmation name matches
      if (input.confirmationName !== existingOrg.name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Confirmation name does not match organization name",
        });
      }

      // Check if already pending deletion
      if (existingOrg.status === "pending_deletion") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization is already pending deletion",
        });
      }

      // Soft delete the organization
      const deletedOrg = await prisma.organization.update({
        where: { id: input.id },
        data: {
          status: "pending_deletion",
          deletedAt: new Date(),
        },
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

      // T115: Invalidate all user sessions for this organization
      // This is handled by the auth check in config.ts which checks organization.status

      // Log audit action
      await ctx.logAuditAction({
        action: "organization.delete",
        targetType: "organization",
        targetId: input.id,
        organizationId: input.id,
        details: {
          name: existingOrg.name,
          previousStatus: existingOrg.status,
          retentionDays: 30,
        },
      });

      // Get last activity
      const lastActivityAt = await getLastActivityAt(input.id);

      return {
        id: deletedOrg.id,
        name: deletedOrg.name,
        slug: deletedOrg.slug,
        plan: deletedOrg.plan,
        planExpiresAt: deletedOrg.planExpiresAt,
        status: deletedOrg.status,
        usersCount: deletedOrg._count.users,
        constituentsCount: deletedOrg._count.constituents,
        lastActivityAt,
        createdAt: deletedOrg.createdAt,
        suspendedAt: deletedOrg.suspendedAt,
        suspendedReason: deletedOrg.suspendedReason,
        deletedAt: deletedOrg.deletedAt,
      };
    }),

  // T112: Hard delete organization (super_admin only - permanent deletion)
  hardDelete: superAdminOnlyProcedure
    .input(hardDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if organization exists
      const existingOrg = await prisma.organization.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          deletedAt: true,
          _count: {
            select: {
              users: true,
              constituents: true,
            },
          },
        },
      });

      if (!existingOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Verify confirmation name matches
      if (input.confirmationName !== existingOrg.name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Confirmation name does not match organization name",
        });
      }

      // Require organization to be in pending_deletion status
      if (existingOrg.status !== "pending_deletion") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization must be in pending_deletion status before hard delete. Soft delete first.",
        });
      }

      // Store details for audit log before deletion
      const deletionDetails = {
        name: existingOrg.name,
        slug: existingOrg.slug,
        usersCount: existingOrg._count.users,
        constituentsCount: existingOrg._count.constituents,
        deletedAt: existingOrg.deletedAt?.toISOString(),
      };

      // Hard delete the organization (cascade deletes related data)
      await prisma.organization.delete({
        where: { id: input.id },
      });

      // Log audit action
      await ctx.logAuditAction({
        action: "organization.hard_delete",
        targetType: "organization",
        targetId: input.id,
        organizationId: undefined, // Org no longer exists
        details: deletionDetails,
      });

      return {
        success: true,
        deletedOrganization: deletionDetails,
      };
    }),
});

export type OrganizationsRouter = typeof organizationsRouter;
