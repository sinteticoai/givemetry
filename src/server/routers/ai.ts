// AI router - placeholder for Phase 8-9
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc/init";
import { getPortfolioFilter } from "../trpc/context";

const generateBriefSchema = z.object({
  constituentId: z.string().uuid(),
});

const querySchema = z.object({
  query: z.string().min(1).max(1000),
});

const savequerySchema = z.object({
  queryId: z.string().uuid(),
  name: z.string().min(1).max(255),
});

export const aiRouter = router({
  // Generate donor brief
  generateBrief: protectedProcedure
    .input(generateBriefSchema)
    .mutation(async ({ ctx, input }) => {
      const portfolioFilter = getPortfolioFilter(ctx);

      // Verify access to constituent
      const constituent = await ctx.prisma.constituent.findFirst({
        where: {
          id: input.constituentId,
          ...portfolioFilter,
        },
        include: {
          gifts: {
            orderBy: { giftDate: "desc" },
            take: 20,
          },
          contacts: {
            orderBy: { contactDate: "desc" },
            take: 20,
          },
          predictions: {
            where: { isCurrent: true },
          },
        },
      });

      if (!constituent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Constituent not found",
        });
      }

      // Placeholder - actual AI generation in Phase 8 (US5)
      const brief = await ctx.prisma.brief.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          constituentId: input.constituentId,
          userId: ctx.session.user.id,
          content: {
            summary: {
              text: `${constituent.firstName} ${constituent.lastName} is a valued constituent.`,
              citations: [],
            },
            givingHistory: {
              text: `Has made ${constituent.gifts.length} gifts.`,
              totalLifetime: constituent.gifts.reduce(
                (sum, g) => sum + Number(g.amount),
                0
              ),
              citations: [],
            },
            relationshipHighlights: {
              text: `${constituent.contacts.length} contact records on file.`,
              citations: [],
            },
            conversationStarters: {
              items: ["Discuss recent giving impact", "Thank for continued support"],
              citations: [],
            },
            recommendedAsk: {
              amount: null,
              purpose: "General support",
              rationale: "Based on giving history",
              citations: [],
            },
          },
          citations: [],
          modelUsed: "placeholder",
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "brief.generate",
          resourceType: "brief",
          resourceId: brief.id,
        },
      });

      return brief;
    }),

  // Get brief
  getBrief: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const brief = await ctx.prisma.brief.findFirst({
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
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!brief) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brief not found",
        });
      }

      return brief;
    }),

  // List briefs
  listBriefs: protectedProcedure
    .input(
      z.object({
        constituentId: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const briefs = await ctx.prisma.brief.findMany({
        where: {
          organizationId: ctx.session.user.organizationId,
          ...(input.constituentId && { constituentId: input.constituentId }),
        },
        orderBy: { createdAt: "desc" },
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
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (briefs.length > input.limit) {
        const nextItem = briefs.pop();
        nextCursor = nextItem?.id;
      }

      return { items: briefs, nextCursor };
    }),

  // Natural language query
  query: protectedProcedure
    .input(querySchema)
    .mutation(async ({ ctx, input }) => {
      // Placeholder - actual NL processing in Phase 9 (US6)
      const queryRecord = await ctx.prisma.naturalLanguageQuery.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          queryText: input.query,
          interpretedQuery: {
            raw: input.query,
            parsed: null,
            filters: [],
          },
          resultCount: 0,
          resultIds: [],
        },
      });

      return {
        id: queryRecord.id,
        query: input.query,
        interpretedAs: "Searching constituents...",
        results: [],
        resultCount: 0,
      };
    }),

  // Save query
  saveQuery: protectedProcedure
    .input(savequerySchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.naturalLanguageQuery.update({
        where: { id: input.queryId },
        data: { savedName: input.name },
      });

      return { success: true };
    }),

  // Get saved queries
  getSavedQueries: protectedProcedure.query(async ({ ctx }) => {
    const queries = await ctx.prisma.naturalLanguageQuery.findMany({
      where: {
        organizationId: ctx.session.user.organizationId,
        savedName: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return queries;
  }),

  // Delete saved query
  deleteSavedQuery: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.naturalLanguageQuery.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Query feedback
  queryFeedback: protectedProcedure
    .input(
      z.object({
        queryId: z.string().uuid(),
        wasHelpful: z.boolean(),
        feedback: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.naturalLanguageQuery.update({
        where: { id: input.queryId },
        data: {
          wasHelpful: input.wasHelpful,
          feedback: input.feedback,
        },
      });

      return { success: true };
    }),

  // Get recommendation (Phase 10 - US8)
  getRecommendation: protectedProcedure
    .input(z.object({ constituentId: z.string().uuid() }))
    .query(async ({ input }) => {
      // Placeholder - will be implemented in Phase 10
      return {
        constituentId: input.constituentId,
        action: "Schedule a meeting",
        reasoning: "Based on giving history and engagement patterns",
        confidence: 0.75,
      };
    }),

  // Mark action complete
  markActionComplete: protectedProcedure
    .input(
      z.object({
        constituentId: z.string().uuid(),
        actionType: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Log the action
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "recommendation.complete",
          resourceType: "constituent",
          resourceId: input.constituentId,
          details: input,
        },
      });

      return { success: true };
    }),
});
