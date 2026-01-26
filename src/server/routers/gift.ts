// Gift router - T040
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc/init";
import { getPortfolioFilter } from "../trpc/context";

const listSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  constituentId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minAmount: z.number().optional(),
  giftType: z.string().optional(),
  sortBy: z.enum(["giftDate", "amount"]).default("giftDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const getSchema = z.object({
  id: z.string().uuid(),
});

const getByConstituentSchema = z.object({
  constituentId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(20),
});

export const giftRouter = router({
  // T040: List gifts with filtering
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const portfolioFilter = getPortfolioFilter(ctx);

    // Build constituent filter based on portfolio access
    const constituentWhere = portfolioFilter
      ? { constituent: portfolioFilter }
      : {};

    const where = {
      organizationId: ctx.session.user.organizationId,
      ...constituentWhere,
      ...(input.constituentId && { constituentId: input.constituentId }),
      ...(input.startDate && { giftDate: { gte: input.startDate } }),
      ...(input.endDate && { giftDate: { lte: input.endDate } }),
      ...(input.minAmount && { amount: { gte: input.minAmount } }),
      ...(input.giftType && { giftType: input.giftType }),
    };

    const orderBy = {
      [input.sortBy]: input.sortOrder,
    };

    const gifts = await ctx.prisma.gift.findMany({
      where,
      orderBy,
      take: input.limit + 1,
      ...(input.cursor && {
        cursor: { id: input.cursor },
        skip: 1,
      }),
      include: {
        constituent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    let nextCursor: string | undefined;
    if (gifts.length > input.limit) {
      const nextItem = gifts.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items: gifts,
      nextCursor,
    };
  }),

  // T040: Get single gift
  get: protectedProcedure.input(getSchema).query(async ({ ctx, input }) => {
    const gift = await ctx.prisma.gift.findFirst({
      where: {
        id: input.id,
        organizationId: ctx.session.user.organizationId,
      },
      include: {
        constituent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            assignedOfficerId: true,
          },
        },
      },
    });

    if (!gift) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Gift not found",
      });
    }

    // Check portfolio access
    const portfolioFilter = getPortfolioFilter(ctx);
    if (
      portfolioFilter?.assignedOfficerId &&
      gift.constituent.assignedOfficerId !== portfolioFilter.assignedOfficerId
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this gift",
      });
    }

    return gift;
  }),

  // T040: Get gifts by constituent
  getByConstituent: protectedProcedure
    .input(getByConstituentSchema)
    .query(async ({ ctx, input }) => {
      // Verify access to constituent
      const portfolioFilter = getPortfolioFilter(ctx);
      const constituent = await ctx.prisma.constituent.findFirst({
        where: {
          id: input.constituentId,
          ...portfolioFilter,
        },
      });

      if (!constituent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Constituent not found",
        });
      }

      const gifts = await ctx.prisma.gift.findMany({
        where: {
          constituentId: input.constituentId,
        },
        orderBy: { giftDate: "desc" },
        take: input.limit,
      });

      // Calculate summary stats
      const stats = await ctx.prisma.gift.aggregate({
        where: { constituentId: input.constituentId },
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
        _max: { giftDate: true, amount: true },
        _min: { giftDate: true },
      });

      return {
        gifts,
        stats: {
          totalAmount: stats._sum.amount || 0,
          count: stats._count,
          averageAmount: stats._avg.amount || 0,
          largestGift: stats._max.amount || 0,
          lastGiftDate: stats._max.giftDate,
          firstGiftDate: stats._min.giftDate,
        },
      };
    }),

  // Get gift summary stats for organization
  summary: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        organizationId: ctx.session.user.organizationId,
        ...(input.startDate && { giftDate: { gte: input.startDate } }),
        ...(input.endDate && { giftDate: { lte: input.endDate } }),
      };

      const stats = await ctx.prisma.gift.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      });

      const byType = await ctx.prisma.gift.groupBy({
        by: ["giftType"],
        where,
        _sum: { amount: true },
        _count: true,
      });

      return {
        totalAmount: stats._sum.amount || 0,
        count: stats._count,
        averageAmount: stats._avg.amount || 0,
        byType,
      };
    }),
});
