// User router - T059
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  adminProcedure,
  managerProcedure,
} from "../trpc/init";

const updateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "manager", "gift_officer", "viewer"]).optional(),
});

const deleteUserSchema = z.object({
  id: z.string().uuid(),
});

export const userRouter = router({
  // List all users in organization
  list: managerProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      where: { organizationId: ctx.session.user.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            assignedConstituents: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return users;
  }),

  // Get single user
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          preferences: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              assignedConstituents: true,
              briefs: true,
              uploads: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  // Update user
  update: adminProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx, input }) => {
      // Cannot demote yourself
      if (input.id === ctx.session.user.id && input.role && input.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      // Check user exists in organization
      const existingUser = await ctx.prisma.user.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const user = await ctx.prisma.user.update({
        where: { id: input.id },
        data: {
          name: input.name,
          role: input.role,
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: input.role ? "user.role_change" : "user.update",
          resourceType: "user",
          resourceId: input.id,
          details: input,
        },
      });

      return user;
    }),

  // Delete user
  delete: adminProcedure
    .input(deleteUserSchema)
    .mutation(async ({ ctx, input }) => {
      // Cannot delete yourself
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account",
        });
      }

      // Check user exists in organization
      const existingUser = await ctx.prisma.user.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await ctx.prisma.user.delete({
        where: { id: input.id },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "user.delete",
          resourceType: "user",
          resourceId: input.id,
        },
      });

      return { success: true };
    }),

  // List gift officers (for assignment dropdowns)
  listOfficers: protectedProcedure.query(async ({ ctx }) => {
    const officers = await ctx.prisma.user.findMany({
      where: {
        organizationId: ctx.session.user.organizationId,
        role: { in: ["admin", "manager", "gift_officer"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return officers;
  }),
});
