// T059-T064: Super Admin Users Router
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminRouter, adminProtectedProcedure, superAdminOnlyProcedure } from "./auth";
import prisma from "@/lib/prisma/client";
import { sendPasswordResetEmail } from "@/server/services/email";
import type { Prisma, UserRole } from "@prisma/client";

// Input schemas
const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

const sortSchema = z.object({
  field: z.enum(["name", "email", "createdAt", "lastLoginAt", "role"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

// T059: List users input schema
const listInputSchema = paginationSchema.extend({
  search: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  role: z.enum(["admin", "manager", "gift_officer", "viewer"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  lastLoginDays: z.number().int().optional(),
  sort: sortSchema.optional(),
});

// T061: Disable user input schema
const disableInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1).max(1000),
});

// T062: Enable user input schema
const enableInputSchema = z.object({
  id: z.string().uuid(),
});

// T063: Reset password input schema
const resetPasswordInputSchema = z.object({
  id: z.string().uuid(),
});

// T064: Change role input schema
const changeRoleInputSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "manager", "gift_officer", "viewer"]),
});

// Helper to build where clause for user queries
function buildWhereClause(input: z.infer<typeof listInputSchema>) {
  const where: Prisma.UserWhereInput = {};

  if (input.organizationId) {
    where.organizationId = input.organizationId;
  }

  if (input.role) {
    where.role = input.role as UserRole;
  }

  if (input.status === "active") {
    where.isDisabled = false;
  } else if (input.status === "disabled") {
    where.isDisabled = true;
  }

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { email: { contains: input.search, mode: "insensitive" } },
    ];
  }

  if (input.lastLoginDays !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - input.lastLoginDays);
    where.lastLoginAt = { gte: cutoffDate };
  }

  return where;
}

// Helper to generate password reset token
function generateResetToken(): string {
  return crypto.randomUUID() + "-" + crypto.randomUUID();
}

export const usersRouter = adminRouter({
  // T059: List all users across organizations
  list: adminProtectedProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const { cursor, limit, sort } = input;
      const where = buildWhereClause(input);

      // Build orderBy based on sort input
      const sortField = sort?.field ?? "createdAt";
      const sortDir = sort?.direction ?? "desc";
      const orderBy: Prisma.UserOrderByWithRelationInput = { [sortField]: sortDir };

      // Query users with organization info
      const users = await prisma.user.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
          organization: {
            select: { name: true },
          },
          role: true,
          lastLoginAt: true,
          isDisabled: true,
          disabledAt: true,
          disabledReason: true,
          createdAt: true,
        },
      });

      // Check if there's a next page
      let nextCursor: string | undefined;
      if (users.length > limit) {
        const nextItem = users.pop();
        nextCursor = nextItem?.id;
      }

      // Get total count
      const totalCount = await prisma.user.count({ where });

      // Transform results
      const items = users.map((user) => ({
        id: user.id,
        name: user.name ?? "",
        email: user.email,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
        isDisabled: user.isDisabled,
        disabledAt: user.disabledAt,
        disabledReason: user.disabledReason,
        createdAt: user.createdAt,
      }));

      return {
        items,
        nextCursor,
        totalCount,
      };
    }),

  // T060: Get single user with activity history
  get: adminProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
          organization: {
            select: { id: true, name: true },
          },
          role: true,
          lastLoginAt: true,
          isDisabled: true,
          disabledAt: true,
          disabledReason: true,
          disabledBy: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Get recent actions from audit logs
      const recentActions = await prisma.auditLog.findMany({
        where: { userId: input.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          resourceType: true,
          createdAt: true,
        },
      });

      // Get login history (we can derive this from audit logs or a dedicated table)
      // For now, we'll return the last login info
      const loginHistory = user.lastLoginAt
        ? [{ timestamp: user.lastLoginAt, ipAddress: null, userAgent: null }]
        : [];

      return {
        id: user.id,
        name: user.name ?? "",
        email: user.email,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
        isDisabled: user.isDisabled,
        disabledAt: user.disabledAt,
        disabledReason: user.disabledReason,
        createdAt: user.createdAt,
        recentActions: recentActions.map((action) => ({
          id: action.id.toString(),
          action: action.action,
          resourceType: action.resourceType,
          createdAt: action.createdAt,
        })),
        loginHistory,
      };
    }),

  // T061: Disable user account
  disable: adminProtectedProcedure
    .input(disableInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
          organization: { select: { name: true } },
          role: true,
          isDisabled: true,
        },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if already disabled
      if (existingUser.isDisabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already disabled",
        });
      }

      // Disable the user
      const disabledUser = await prisma.user.update({
        where: { id: input.id },
        data: {
          isDisabled: true,
          disabledAt: new Date(),
          disabledReason: input.reason,
          disabledBy: ctx.session.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
          organization: { select: { name: true } },
          role: true,
          lastLoginAt: true,
          isDisabled: true,
          disabledAt: true,
          disabledReason: true,
          createdAt: true,
        },
      });

      // Log audit action
      await ctx.logAuditAction({
        action: "user.disable",
        targetType: "user",
        targetId: input.id,
        organizationId: existingUser.organizationId,
        details: {
          reason: input.reason,
          userName: existingUser.name,
          userEmail: existingUser.email,
        },
      });

      return {
        id: disabledUser.id,
        name: disabledUser.name ?? "",
        email: disabledUser.email,
        organizationId: disabledUser.organizationId,
        organizationName: disabledUser.organization.name,
        role: disabledUser.role,
        lastLoginAt: disabledUser.lastLoginAt,
        isDisabled: disabledUser.isDisabled,
        disabledAt: disabledUser.disabledAt,
        disabledReason: disabledUser.disabledReason,
        createdAt: disabledUser.createdAt,
      };
    }),

  // T062: Enable previously disabled user
  enable: adminProtectedProcedure
    .input(enableInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
          organization: { select: { name: true } },
          role: true,
          isDisabled: true,
          disabledReason: true,
        },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if not disabled
      if (!existingUser.isDisabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is not disabled",
        });
      }

      // Enable the user
      const enabledUser = await prisma.user.update({
        where: { id: input.id },
        data: {
          isDisabled: false,
          disabledAt: null,
          disabledReason: null,
          disabledBy: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
          organization: { select: { name: true } },
          role: true,
          lastLoginAt: true,
          isDisabled: true,
          disabledAt: true,
          disabledReason: true,
          createdAt: true,
        },
      });

      // Log audit action
      await ctx.logAuditAction({
        action: "user.enable",
        targetType: "user",
        targetId: input.id,
        organizationId: existingUser.organizationId,
        details: {
          previousDisabledReason: existingUser.disabledReason,
          userName: existingUser.name,
          userEmail: existingUser.email,
        },
      });

      return {
        id: enabledUser.id,
        name: enabledUser.name ?? "",
        email: enabledUser.email,
        organizationId: enabledUser.organizationId,
        organizationName: enabledUser.organization.name,
        role: enabledUser.role,
        lastLoginAt: enabledUser.lastLoginAt,
        isDisabled: enabledUser.isDisabled,
        disabledAt: enabledUser.disabledAt,
        disabledReason: enabledUser.disabledReason,
        createdAt: enabledUser.createdAt,
      };
    }),

  // T063: Trigger password reset email
  resetPassword: adminProtectedProcedure
    .input(resetPasswordInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Generate reset token
      const token = generateResetToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store the token
      await prisma.verificationToken.create({
        data: {
          identifier: user.email,
          token,
          expires,
        },
      });

      // Send password reset email
      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name ?? "User",
          token,
        });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send password reset email",
        });
      }

      // Log audit action
      await ctx.logAuditAction({
        action: "user.reset_password",
        targetType: "user",
        targetId: input.id,
        organizationId: user.organizationId,
        details: {
          email: user.email,
        },
      });

      return { success: true };
    }),

  // T064: Change user's role (super_admin only)
  changeRole: superAdminOnlyProcedure
    .input(changeRoleInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
          organization: { select: { name: true } },
          role: true,
          lastLoginAt: true,
          isDisabled: true,
          disabledAt: true,
          disabledReason: true,
          createdAt: true,
        },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if role is actually changing
      if (existingUser.role === input.role) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has this role",
        });
      }

      // Update the role
      const updatedUser = await prisma.user.update({
        where: { id: input.id },
        data: {
          role: input.role as UserRole,
        },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
          organization: { select: { name: true } },
          role: true,
          lastLoginAt: true,
          isDisabled: true,
          disabledAt: true,
          disabledReason: true,
          createdAt: true,
        },
      });

      // Log audit action
      await ctx.logAuditAction({
        action: "user.change_role",
        targetType: "user",
        targetId: input.id,
        organizationId: existingUser.organizationId,
        details: {
          previousRole: existingUser.role,
          newRole: input.role,
          userName: existingUser.name,
          userEmail: existingUser.email,
        },
      });

      return {
        id: updatedUser.id,
        name: updatedUser.name ?? "",
        email: updatedUser.email,
        organizationId: updatedUser.organizationId,
        organizationName: updatedUser.organization.name,
        role: updatedUser.role,
        lastLoginAt: updatedUser.lastLoginAt,
        isDisabled: updatedUser.isDisabled,
        disabledAt: updatedUser.disabledAt,
        disabledReason: updatedUser.disabledReason,
        createdAt: updatedUser.createdAt,
      };
    }),
});

export type UsersRouter = typeof usersRouter;
