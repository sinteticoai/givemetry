// Audit log router - admin only
import { z } from "zod";
import { router, adminProcedure } from "../trpc/init";

const listAuditLogsSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  resourceType: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const auditRouter = router({
  // List audit logs with pagination and filters
  list: adminProcedure
    .input(listAuditLogsSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, action, userId, resourceType, startDate, endDate } = input;

      const where = {
        organizationId: ctx.session.user.organizationId,
        ...(action && { action: { contains: action } }),
        ...(userId && { userId }),
        ...(resourceType && { resourceType }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      };

      const logs = await ctx.prisma.auditLog.findMany({
        where,
        take: limit + 1,
        ...(cursor && {
          skip: 1,
          cursor: { id: BigInt(cursor) },
        }),
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (logs.length > limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem?.id.toString();
      }

      // Convert BigInt to string for JSON serialization
      const serializedLogs = logs.map((log) => ({
        ...log,
        id: log.id.toString(),
      }));

      return {
        items: serializedLogs,
        nextCursor,
      };
    }),

  // Get audit log stats for dashboard
  stats: adminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalLogs, recentLogs, actionCounts] = await Promise.all([
      ctx.prisma.auditLog.count({
        where: { organizationId: ctx.session.user.organizationId },
      }),
      ctx.prisma.auditLog.count({
        where: {
          organizationId: ctx.session.user.organizationId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      ctx.prisma.auditLog.groupBy({
        by: ["action"],
        where: {
          organizationId: ctx.session.user.organizationId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: true,
        orderBy: { _count: { action: "desc" } },
        take: 10,
      }),
    ]);

    return {
      totalLogs,
      recentLogs,
      topActions: actionCounts.map((a) => ({
        action: a.action,
        count: a._count,
      })),
    };
  }),

  // Get unique action types for filtering
  actionTypes: adminProcedure.query(async ({ ctx }) => {
    const actions = await ctx.prisma.auditLog.findMany({
      where: { organizationId: ctx.session.user.organizationId },
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    });

    return actions.map((a) => a.action);
  }),
});
