// T012: RLS tenant middleware for Prisma
import prisma from "./client";

/**
 * Creates a Prisma client extension that enforces tenant isolation
 * by setting the current organization context for RLS policies
 */
export function getTenantPrisma(organizationId: string) {
  return prisma.$extends({
    query: {
      $allOperations({ args, query }) {
        // Set the organization context for RLS before each query
        return prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`;
          return query(args);
        });
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof getTenantPrisma>;

/**
 * Utility to filter queries by organization ID
 * Use this as a fallback when RLS is not available
 */
export function withOrgFilter<T extends { organizationId?: string }>(
  organizationId: string,
  where?: T
): T & { organizationId: string } {
  return {
    ...where,
    organizationId,
  } as T & { organizationId: string };
}

/**
 * Middleware to inject organizationId into create operations
 */
export function withOrgCreate<T extends object>(
  organizationId: string,
  data: T
): T & { organizationId: string } {
  return {
    ...data,
    organizationId,
  };
}
