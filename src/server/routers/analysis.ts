// Analysis router - placeholder for Phase 5-7
import { z } from "zod";
import { router, protectedProcedure, managerProcedure } from "../trpc/init";
import { getPortfolioFilter } from "../trpc/context";

export const analysisRouter = router({
  // Get health scores for organization
  getHealthScores: protectedProcedure.query(async ({ ctx }) => {
    // Placeholder - will be implemented in Phase 5 (US2)
    const organizationId = ctx.session.user.organizationId;

    // Get basic stats for now
    const [constituentCount, giftCount, contactCount] = await Promise.all([
      ctx.prisma.constituent.count({
        where: { organizationId, isActive: true },
      }),
      ctx.prisma.gift.count({ where: { organizationId } }),
      ctx.prisma.contact.count({ where: { organizationId } }),
    ]);

    return {
      overall: 0.75, // Placeholder
      completeness: 0.8,
      freshness: 0.7,
      consistency: 0.75,
      coverage: 0.75,
      issues: [],
      recommendations: [],
      stats: {
        constituentCount,
        giftCount,
        contactCount,
      },
    };
  }),

  // Get lapse risk list
  getLapseRiskList: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
        minRisk: z.number().min(0).max(1).default(0.4),
        assignedOfficerId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const portfolioFilter = getPortfolioFilter(ctx);

      const constituents = await ctx.prisma.constituent.findMany({
        where: {
          ...portfolioFilter,
          isActive: true,
          lapseRiskScore: { gte: input.minRisk },
          ...(input.assignedOfficerId && {
            assignedOfficerId: input.assignedOfficerId,
          }),
        },
        orderBy: { lapseRiskScore: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          lapseRiskScore: true,
          lapseRiskFactors: true,
          assignedOfficer: {
            select: { id: true, name: true },
          },
          _count: {
            select: { gifts: true, contacts: true },
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

  // Mark lapse risk as addressed
  markLapseAddressed: protectedProcedure
    .input(
      z.object({
        constituentId: z.string().uuid(),
        action: z.enum(["retained", "dismissed", "contacted"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create an alert record to track this
      await ctx.prisma.alert.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          constituentId: input.constituentId,
          alertType: "lapse_risk",
          severity: "medium",
          title: `Lapse risk ${input.action}`,
          description: input.notes,
          status: "acted_on",
          actedOnAt: new Date(),
          actedOnBy: ctx.session.user.name || ctx.session.user.email,
        },
      });

      return { success: true };
    }),

  // Get priority list
  getPriorityList: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
        minPriority: z.number().min(0).max(1).default(0.5),
        assignedOfficerId: z.string().uuid().optional(),
        excludeRecentlyContacted: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const portfolioFilter = getPortfolioFilter(ctx);

      // Calculate date for "recently contacted" filter (30 days)
      const recentlyContactedDate = new Date();
      recentlyContactedDate.setDate(recentlyContactedDate.getDate() - 30);

      const constituents = await ctx.prisma.constituent.findMany({
        where: {
          ...portfolioFilter,
          isActive: true,
          priorityScore: { gte: input.minPriority },
          ...(input.assignedOfficerId && {
            assignedOfficerId: input.assignedOfficerId,
          }),
          ...(input.excludeRecentlyContacted && {
            NOT: {
              contacts: {
                some: {
                  contactDate: { gte: recentlyContactedDate },
                },
              },
            },
          }),
        },
        orderBy: { priorityScore: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          priorityScore: true,
          priorityFactors: true,
          estimatedCapacity: true,
          lapseRiskScore: true,
          assignedOfficer: {
            select: { id: true, name: true },
          },
          contacts: {
            orderBy: { contactDate: "desc" },
            take: 1,
            select: { contactDate: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (constituents.length > input.limit) {
        const nextItem = constituents.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: constituents.map((c) => ({
          ...c,
          lastContactDate: c.contacts[0]?.contactDate || null,
        })),
        nextCursor,
      };
    }),

  // Provide priority feedback
  providePriorityFeedback: protectedProcedure
    .input(
      z.object({
        constituentId: z.string().uuid(),
        feedback: z.enum(["useful", "not_useful", "already_contacted"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Store feedback in prediction record
      await ctx.prisma.prediction.updateMany({
        where: {
          constituentId: input.constituentId,
          predictionType: "priority",
          isCurrent: true,
        },
        data: {
          factors: {
            feedback: input.feedback,
            feedbackAt: new Date().toISOString(),
            feedbackBy: ctx.session.user.id,
          },
        },
      });

      return { success: true };
    }),

  // Refresh priorities (trigger recalculation)
  refreshPriorities: managerProcedure.mutation(async ({ ctx }) => {
    // Placeholder - will trigger background job in Phase 6
    await ctx.prisma.auditLog.create({
      data: {
        organizationId: ctx.session.user.organizationId,
        userId: ctx.session.user.id,
        action: "analysis.refresh",
        resourceType: "priority",
      },
    });

    return { success: true, message: "Priority refresh queued" };
  }),

  // Get portfolio metrics (Phase 13 - US11)
  getPortfolioMetrics: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.user.organizationId;

    // Get officer metrics
    const officerMetrics = await ctx.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ["admin", "manager", "gift_officer"] },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: { assignedConstituents: true },
        },
      },
    });

    // Get total constituents
    const totalConstituents = await ctx.prisma.constituent.count({
      where: { organizationId, isActive: true },
    });

    const unassigned = await ctx.prisma.constituent.count({
      where: { organizationId, isActive: true, assignedOfficerId: null },
    });

    return {
      officers: officerMetrics.map((o) => ({
        id: o.id,
        name: o.name,
        constituentCount: o._count.assignedConstituents,
      })),
      totalConstituents,
      unassigned,
      imbalances: [], // Placeholder
      suggestions: [], // Placeholder
    };
  }),
});
