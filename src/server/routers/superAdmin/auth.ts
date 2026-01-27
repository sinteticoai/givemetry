// T028, T029: Super Admin Auth Router
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { AdminContext } from "@/server/trpc/admin-context";
import prisma from "@/lib/prisma/client";

// Constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Initialize tRPC for admin context
const t = initTRPC.context<AdminContext>().create({
  transformer: superjson,
});

export const adminRouter = t.router;
export const adminPublicProcedure = t.procedure;

// Protected procedure requiring admin session
export const adminProtectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in as a super admin",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// Super admin only procedure
export const superAdminOnlyProcedure = adminProtectedProcedure.use(({ ctx, next }) => {
  if (!ctx.isSuperAdmin()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This action requires super_admin role",
    });
  }
  return next({ ctx });
});

// Input schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Helper functions exported for testing
export async function checkAccountLockout(admin: { lockedUntil: Date | null }) {
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    const minutesRemaining = Math.ceil(
      (admin.lockedUntil.getTime() - Date.now()) / 60000
    );
    return { isLocked: true, minutesRemaining };
  }
  return { isLocked: false, minutesRemaining: 0 };
}

export async function validateSuperAdminCredentials(
  email: string,
  password: string
) {
  const admin = await prisma.superAdmin.findUnique({
    where: { email },
  });

  if (!admin || !admin.isActive) {
    return null;
  }

  // Check lockout
  const lockoutStatus = await checkAccountLockout(admin);
  if (lockoutStatus.isLocked) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Account temporarily locked. Try again in ${lockoutStatus.minutesRemaining} minutes.`,
    });
  }

  // Validate password
  const isValidPassword = await bcrypt.compare(password, admin.passwordHash);

  if (!isValidPassword) {
    // Increment failed attempts
    const attempts = admin.failedLoginAttempts + 1;
    const updates: {
      failedLoginAttempts: number;
      lockedUntil?: Date;
    } = { failedLoginAttempts: attempts };

    // Lock account after MAX_FAILED_ATTEMPTS
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);

      // Log lockout event
      await prisma.superAdminAuditLog.create({
        data: {
          superAdminId: admin.id,
          action: "super_admin.locked",
          targetType: "super_admin",
          targetId: admin.id,
          details: { attempts, lockoutMinutes: LOCKOUT_DURATION_MS / 60000 },
        },
      });
    }

    await prisma.superAdmin.update({
      where: { id: admin.id },
      data: updates,
    });

    // Log failed login
    await prisma.superAdminAuditLog.create({
      data: {
        superAdminId: admin.id,
        action: "super_admin.login_failed",
        targetType: "super_admin",
        targetId: admin.id,
        details: { attempts },
      },
    });

    return null;
  }

  // Reset failed attempts on successful login
  await prisma.superAdmin.update({
    where: { id: admin.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  // Log successful login
  await prisma.superAdminAuditLog.create({
    data: {
      superAdminId: admin.id,
      action: "super_admin.login",
      targetType: "super_admin",
      targetId: admin.id,
    },
  });

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };
}

// Auth router
export const authRouter = adminRouter({
  // Validate credentials - used by NextAuth authorize callback
  validateCredentials: adminPublicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const result = await validateSuperAdminCredentials(
        input.email,
        input.password
      );

      if (!result) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      return result;
    }),

  // Get current session
  me: adminProtectedProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  // Logout - log the action
  logout: adminProtectedProcedure.mutation(async ({ ctx }) => {
    await ctx.logAuditAction({
      action: "super_admin.logout",
      targetType: "super_admin",
      targetId: ctx.session.id,
    });

    return { success: true };
  }),

  // Check if account is locked
  checkLockout: adminPublicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const admin = await prisma.superAdmin.findUnique({
        where: { email: input.email },
        select: { lockedUntil: true },
      });

      if (!admin) {
        // Don't reveal if account exists
        return { isLocked: false, minutesRemaining: 0 };
      }

      return checkAccountLockout(admin);
    }),
});

export type AuthRouter = typeof authRouter;
