// T073-T077: Super Admin Impersonation Router
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminRouter, adminProtectedProcedure, superAdminOnlyProcedure } from "./auth";
import prisma from "@/lib/prisma/client";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";

// Constants
const IMPERSONATION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const IMPERSONATION_COOKIE_NAME = "impersonation-context";

// Input schemas
const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

const dateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

// T073: Start impersonation input schema
const startInputSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(1, "Reason is required").max(1000),
});

// T076: List impersonation history input schema
const listInputSchema = paginationSchema.extend({
  superAdminId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  dateRange: dateRangeSchema.optional(),
});

/**
 * T077: Impersonation context stored in cookie
 */
interface ImpersonationContext {
  sessionId: string;
  userId: string;
  organizationId: string;
  expiresAt: string; // ISO date string
  targetUserName?: string;
  targetUserEmail?: string;
  organizationName?: string;
}

/**
 * T077: Set impersonation cookie
 */
async function setImpersonationCookie(context: ImpersonationContext) {
  const cookieStore = await cookies();
  const value = JSON.stringify(context);

  cookieStore.set(IMPERSONATION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: IMPERSONATION_TIMEOUT_MS / 1000, // seconds
    path: "/",
  });
}

/**
 * T077: Get impersonation context from cookie
 */
export async function getImpersonationContext(): Promise<ImpersonationContext | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);

  if (!cookie?.value) {
    return null;
  }

  try {
    const context = JSON.parse(cookie.value) as ImpersonationContext;

    // Check if expired
    if (new Date(context.expiresAt) < new Date()) {
      await clearImpersonationCookie();
      return null;
    }

    return context;
  } catch {
    return null;
  }
}

/**
 * T077: Clear impersonation cookie
 */
export async function clearImpersonationCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE_NAME);
}

/**
 * Check if an impersonation session is expired
 */
function isSessionExpired(startedAt: Date): boolean {
  const expiresAt = new Date(startedAt.getTime() + IMPERSONATION_TIMEOUT_MS);
  return new Date() > expiresAt;
}

/**
 * Calculate expiry time for a session
 */
function calculateExpiresAt(startedAt: Date): Date {
  return new Date(startedAt.getTime() + IMPERSONATION_TIMEOUT_MS);
}

export const impersonationRouter = adminRouter({
  // T073: Start impersonation session (super_admin only)
  start: superAdminOnlyProcedure
    .input(startInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if already impersonating
      const existingSession = await prisma.impersonationSession.findFirst({
        where: {
          superAdminId: ctx.session.id,
          endedAt: null,
        },
      });

      if (existingSession) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already impersonating another user. End the current session first.",
        });
      }

      // Get target user with organization
      const targetUser = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
          isDisabled: true,
          organization: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if user is disabled
      if (targetUser.isDisabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot impersonate a disabled user",
        });
      }

      // Check organization status
      if (targetUser.organization.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot impersonate user in ${targetUser.organization.status} organization`,
        });
      }

      // Create impersonation session
      const session = await prisma.impersonationSession.create({
        data: {
          superAdminId: ctx.session.id,
          userId: targetUser.id,
          organizationId: targetUser.organizationId,
          reason: input.reason,
        },
      });

      // Set impersonation cookie with user details for the banner
      const expiresAt = calculateExpiresAt(session.startedAt);
      await setImpersonationCookie({
        sessionId: session.id,
        userId: targetUser.id,
        organizationId: targetUser.organizationId,
        expiresAt: expiresAt.toISOString(),
        targetUserName: targetUser.name ?? "",
        targetUserEmail: targetUser.email,
        organizationName: targetUser.organization.name,
      });

      // Log audit action
      await ctx.logAuditAction({
        action: "impersonation.start",
        targetType: "user",
        targetId: targetUser.id,
        organizationId: targetUser.organizationId,
        details: {
          reason: input.reason,
          userName: targetUser.name,
          userEmail: targetUser.email,
          organizationName: targetUser.organization.name,
        },
      });

      return {
        sessionId: session.id,
        targetUser: {
          id: targetUser.id,
          name: targetUser.name ?? "",
          email: targetUser.email,
          organizationName: targetUser.organization.name,
        },
        expiresAt,
      };
    }),

  // T074: End impersonation session
  end: adminProtectedProcedure.mutation(async ({ ctx }) => {
    // Find active session for this admin
    const activeSession = await prisma.impersonationSession.findFirst({
      where: {
        superAdminId: ctx.session.id,
        endedAt: null,
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        startedAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!activeSession) {
      // Clear cookie just in case it's stale
      await clearImpersonationCookie();
      return { success: false };
    }

    // Calculate session duration
    const durationMs = Date.now() - activeSession.startedAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    // End the session
    await prisma.impersonationSession.update({
      where: { id: activeSession.id },
      data: {
        endedAt: new Date(),
        endReason: "manual",
      },
    });

    // Clear impersonation cookie
    await clearImpersonationCookie();

    // Log audit action
    await ctx.logAuditAction({
      action: "impersonation.end",
      targetType: "user",
      targetId: activeSession.userId,
      organizationId: activeSession.organizationId,
      details: {
        endReason: "manual",
        sessionDurationMinutes: durationMinutes,
        userName: activeSession.user.name,
        userEmail: activeSession.user.email,
      },
    });

    return { success: true };
  }),

  // T075: Get current impersonation status
  current: adminProtectedProcedure.query(async ({ ctx }) => {
    // Find active session for this admin
    const activeSession = await prisma.impersonationSession.findFirst({
      where: {
        superAdminId: ctx.session.id,
        endedAt: null,
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        reason: true,
        startedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!activeSession) {
      return {
        isImpersonating: false,
        session: null,
      };
    }

    // Check if session has expired
    if (isSessionExpired(activeSession.startedAt)) {
      // Auto-end expired session
      const durationMs = Date.now() - activeSession.startedAt.getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      await prisma.impersonationSession.update({
        where: { id: activeSession.id },
        data: {
          endedAt: new Date(),
          endReason: "timeout",
        },
      });

      await clearImpersonationCookie();

      // Log timeout
      await ctx.logAuditAction({
        action: "impersonation.timeout",
        targetType: "user",
        targetId: activeSession.userId,
        organizationId: activeSession.organizationId,
        details: {
          sessionId: activeSession.id,
          sessionDurationMinutes: durationMinutes,
        },
      });

      return {
        isImpersonating: false,
        session: null,
      };
    }

    const expiresAt = calculateExpiresAt(activeSession.startedAt);

    return {
      isImpersonating: true,
      session: {
        id: activeSession.id,
        targetUserId: activeSession.user.id,
        targetUserName: activeSession.user.name ?? "",
        targetUserEmail: activeSession.user.email,
        organizationName: activeSession.organization.name,
        startedAt: activeSession.startedAt,
        expiresAt,
      },
    };
  }),

  // T076: List impersonation history
  list: adminProtectedProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const { cursor, limit, superAdminId, userId, organizationId, dateRange } = input;

      // Build where clause
      const where: Prisma.ImpersonationSessionWhereInput = {};

      if (superAdminId) {
        where.superAdminId = superAdminId;
      }

      if (userId) {
        where.userId = userId;
      }

      if (organizationId) {
        where.organizationId = organizationId;
      }

      if (dateRange?.from || dateRange?.to) {
        where.startedAt = {};
        if (dateRange.from) {
          where.startedAt.gte = dateRange.from;
        }
        if (dateRange.to) {
          where.startedAt.lte = dateRange.to;
        }
      }

      // Query sessions
      const sessions = await prisma.impersonationSession.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          superAdminId: true,
          superAdmin: {
            select: { name: true },
          },
          userId: true,
          user: {
            select: { name: true, email: true },
          },
          organizationId: true,
          organization: {
            select: { name: true },
          },
          reason: true,
          startedAt: true,
          endedAt: true,
          endReason: true,
        },
      });

      // Check if there's a next page
      let nextCursor: string | undefined;
      if (sessions.length > limit) {
        const nextItem = sessions.pop();
        nextCursor = nextItem?.id;
      }

      // Transform results
      const items = sessions.map((session) => ({
        id: session.id,
        superAdminName: session.superAdmin.name,
        targetUserName: session.user.name ?? "",
        targetUserEmail: session.user.email,
        organizationName: session.organization.name,
        reason: session.reason,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        endReason: session.endReason,
      }));

      return {
        items,
        nextCursor,
      };
    }),
});

export type ImpersonationRouter = typeof impersonationRouter;
