// Constituent router - T038, T039
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, managerProcedure } from "../trpc/init";
import { getPortfolioFilter } from "../trpc/context";

const listSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  search: z.string().optional(),
  assignedOfficerId: z.string().uuid().optional(),
  portfolioTier: z.string().optional(),
  sortBy: z.enum(["name", "priorityScore", "lapseRiskScore", "updatedAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

const getSchema = z.object({
  id: z.string().uuid(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  assignedOfficerId: z.string().uuid().nullable().optional(),
  portfolioTier: z.string().nullable().optional(),
  notes: z.string().optional(),
});

const bulkAssignSchema = z.object({
  constituentIds: z.array(z.string().uuid()),
  assignedOfficerId: z.string().uuid().nullable(),
});

export const constituentRouter = router({
  // T038: List constituents with filtering
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const portfolioFilter = getPortfolioFilter(ctx);

    const where = {
      ...portfolioFilter,
      isActive: true,
      ...(input.search && {
        OR: [
          { firstName: { contains: input.search, mode: "insensitive" as const } },
          { lastName: { contains: input.search, mode: "insensitive" as const } },
          { email: { contains: input.search, mode: "insensitive" as const } },
          { externalId: { contains: input.search, mode: "insensitive" as const } },
        ],
      }),
      ...(input.assignedOfficerId && { assignedOfficerId: input.assignedOfficerId }),
      ...(input.portfolioTier && { portfolioTier: input.portfolioTier }),
    };

    const orderBy = {
      [input.sortBy]: input.sortOrder,
    };

    const constituents = await ctx.prisma.constituent.findMany({
      where,
      orderBy,
      take: input.limit + 1,
      ...(input.cursor && {
        cursor: { id: input.cursor },
        skip: 1,
      }),
      select: {
        id: true,
        externalId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        constituentType: true,
        classYear: true,
        assignedOfficerId: true,
        portfolioTier: true,
        lapseRiskScore: true,
        priorityScore: true,
        dataQualityScore: true,
        estimatedCapacity: true,
        updatedAt: true,
        assignedOfficer: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            gifts: true,
            contacts: true,
          },
        },
      },
    });

    let nextCursor: string | undefined;
    if (constituents.length > input.limit) {
      const nextItem = constituents.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items: constituents,
      nextCursor,
    };
  }),

  // T038: Get single constituent with full details
  get: protectedProcedure.input(getSchema).query(async ({ ctx, input }) => {
    const portfolioFilter = getPortfolioFilter(ctx);

    const constituent = await ctx.prisma.constituent.findFirst({
      where: {
        id: input.id,
        ...portfolioFilter,
      },
      include: {
        assignedOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        gifts: {
          orderBy: { giftDate: "desc" },
          take: 10,
        },
        contacts: {
          orderBy: { contactDate: "desc" },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        predictions: {
          where: { isCurrent: true },
        },
        alerts: {
          where: { status: "active" },
          orderBy: { createdAt: "desc" },
        },
        briefs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!constituent) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Constituent not found",
      });
    }

    // Calculate aggregate stats
    const stats = await ctx.prisma.gift.aggregate({
      where: { constituentId: input.id },
      _sum: { amount: true },
      _count: true,
      _max: { giftDate: true },
    });

    return {
      ...constituent,
      stats: {
        totalGiving: stats._sum.amount || 0,
        giftCount: stats._count,
        lastGiftDate: stats._max.giftDate,
      },
    };
  }),

  // T039: Update constituent
  update: protectedProcedure
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => {
      const portfolioFilter = getPortfolioFilter(ctx);

      // Check constituent exists and user has access
      const existing = await ctx.prisma.constituent.findFirst({
        where: {
          id: input.id,
          ...portfolioFilter,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Constituent not found",
        });
      }

      const constituent = await ctx.prisma.constituent.update({
        where: { id: input.id },
        data: {
          assignedOfficerId: input.assignedOfficerId,
          portfolioTier: input.portfolioTier,
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "constituent.update",
          resourceType: "constituent",
          resourceId: input.id,
          details: input,
        },
      });

      return constituent;
    }),

  // T039: Bulk assign constituents to officer
  bulkAssign: managerProcedure
    .input(bulkAssignSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.constituent.updateMany({
        where: {
          id: { in: input.constituentIds },
          organizationId: ctx.session.user.organizationId,
        },
        data: {
          assignedOfficerId: input.assignedOfficerId,
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "constituent.bulk_assign",
          resourceType: "constituent",
          details: {
            count: result.count,
            assignedOfficerId: input.assignedOfficerId,
          },
        },
      });

      return { count: result.count };
    }),

  // Get summary stats for portfolio
  stats: protectedProcedure.query(async ({ ctx }) => {
    const portfolioFilter = getPortfolioFilter(ctx);

    const [total, highRisk, topPriority] = await Promise.all([
      ctx.prisma.constituent.count({
        where: { ...portfolioFilter, isActive: true },
      }),
      ctx.prisma.constituent.count({
        where: {
          ...portfolioFilter,
          isActive: true,
          lapseRiskScore: { gte: 0.7 },
        },
      }),
      ctx.prisma.constituent.count({
        where: {
          ...portfolioFilter,
          isActive: true,
          priorityScore: { gte: 0.7 },
        },
      }),
    ]);

    return { total, highRisk, topPriority };
  }),
});
