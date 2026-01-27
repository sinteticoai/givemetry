/**
 * Super Admin tRPC context
 *
 * Separate context for super admin routes with:
 * - Super admin session validation
 * - Audit logging helpers
 * - Cross-tenant data access
 */

import { type inferAsyncReturnType } from "@trpc/server";
import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import type { SuperAdminRole } from "@prisma/client";

export interface SuperAdminSession {
  id: string;
  email: string;
  name: string;
  role: SuperAdminRole;
}

export interface AuditLogData {
  action: string;
  targetType: string;
  targetId?: string;
  organizationId?: string;
  details?: Record<string, unknown>;
}

/**
 * Create super admin tRPC context
 */
export async function createAdminContext() {
  // Get super admin session from cookie
  const cookieStore = await cookies();
  const headerStore = await headers();

  // Get the session token from the admin auth cookie
  const sessionToken = cookieStore.get("admin-auth.session-token")?.value;

  let session: SuperAdminSession | null = null;

  if (sessionToken) {
    try {
      // Decode the JWT token using the admin auth secret
      const token = await getToken({
        req: {
          cookies: {
            get: (name: string) => cookieStore.get(name),
          },
          headers: headerStore,
        } as Parameters<typeof getToken>[0]["req"],
        secret: process.env.ADMIN_AUTH_SECRET,
        cookieName: "admin-auth.session-token",
      });

      if (token && token.id && token.role) {
        session = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
          role: token.role as SuperAdminRole,
        };
      }
    } catch (error) {
      console.error("Failed to decode admin session:", error);
    }
  }

  // Extract request metadata for audit logging
  const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0] || headerStore.get("x-real-ip") || null;
  const userAgent = headerStore.get("user-agent") || null;

  return {
    session,
    prisma,
    ipAddress,
    userAgent,

    /**
     * Check if current user has super_admin role
     */
    isSuperAdmin: () => session?.role === "super_admin",

    /**
     * Check if current user has support role
     */
    isSupport: () => session?.role === "support",

    /**
     * Log a super admin action to the audit trail
     */
    logAuditAction: async (data: AuditLogData) => {
      if (!session) {
        throw new Error("Cannot log audit action without session");
      }

      return prisma.superAdminAuditLog.create({
        data: {
          superAdminId: session.id,
          action: data.action,
          targetType: data.targetType,
          targetId: data.targetId,
          organizationId: data.organizationId,
          details: data.details ? (data.details as Prisma.InputJsonValue) : Prisma.DbNull,
          ipAddress,
          userAgent,
        },
      });
    },
  };
}

export type AdminContext = inferAsyncReturnType<typeof createAdminContext>;

/**
 * Helper to require super_admin role
 */
export function requireSuperAdmin(ctx: AdminContext) {
  if (!ctx.session) {
    throw new Error("Unauthorized: No super admin session");
  }
  if (!ctx.isSuperAdmin()) {
    throw new Error("Forbidden: Requires super_admin role");
  }
  return ctx.session;
}

/**
 * Helper to require any admin role
 */
export function requireAdmin(ctx: AdminContext) {
  if (!ctx.session) {
    throw new Error("Unauthorized: No super admin session");
  }
  return ctx.session;
}
