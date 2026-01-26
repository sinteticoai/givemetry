// T016: tRPC context with tenant Prisma client
import { type inferAsyncReturnType } from "@trpc/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma/client";
import { withOrgFilter, withOrgCreate } from "@/lib/prisma/tenant";
import type { UserRole } from "@prisma/client";
import type { ExtendedSession } from "@/lib/auth/config";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  role: UserRole;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

export async function createContext() {
  const session = (await auth()) as ExtendedSession | null;

  // Create tenant-scoped helpers
  const orgId = session?.user?.organizationId;

  return {
    session,
    prisma,
    // Tenant-scoped query helpers
    withOrgFilter: orgId
      ? <T extends { organizationId?: string }>(where?: T) =>
          withOrgFilter(orgId, where)
      : undefined,
    withOrgCreate: orgId
      ? <T extends object>(data: T) => withOrgCreate(orgId, data)
      : undefined,
    organizationId: orgId,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;

// T065: Portfolio-based access filtering helper
export function getPortfolioFilter(ctx: Context) {
  if (!ctx.session?.user) return null;

  const { role, id: userId, organizationId } = ctx.session.user;

  // Admins and managers see all data
  if (role === "admin" || role === "manager") {
    return { organizationId };
  }

  // Gift officers only see their assigned constituents
  if (role === "gift_officer") {
    return {
      organizationId,
      assignedOfficerId: userId,
    };
  }

  // Viewers see all but read-only (handled by role checks)
  return { organizationId };
}
