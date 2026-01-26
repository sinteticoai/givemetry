// T164-T166: AI router with generateBrief, getBrief, listBriefs, updateBrief, flagBriefError
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc/init";
import { getPortfolioFilter } from "../trpc/context";
import { generateBrief, getFallbackBrief, getBriefCache, generateDataVersion } from "../services/ai";

const generateBriefSchema = z.object({
  constituentId: z.string().uuid(),
  useFallback: z.boolean().optional().default(false),
});

const briefContentSchema = z.object({
  summary: z.object({
    text: z.string(),
    citations: z.array(z.object({
      text: z.string(),
      source: z.enum(["profile", "gift", "contact", "prediction"]),
      sourceId: z.string(),
      date: z.string().optional(),
    })).optional().default([]),
  }).optional(),
  givingHistory: z.object({
    text: z.string(),
    totalLifetime: z.number(),
    citations: z.array(z.any()).optional().default([]),
  }).optional(),
  relationshipHighlights: z.object({
    text: z.string(),
    citations: z.array(z.any()).optional().default([]),
  }).optional(),
  conversationStarters: z.object({
    items: z.array(z.string()),
    citations: z.array(z.any()).optional().default([]),
  }).optional(),
  recommendedAsk: z.object({
    amount: z.number().nullable(),
    purpose: z.string(),
    rationale: z.string(),
    citations: z.array(z.any()).optional().default([]),
  }).optional(),
});

const updateBriefSchema = z.object({
  id: z.string().uuid(),
  content: briefContentSchema,
});

const flagBriefErrorSchema = z.object({
  briefId: z.string().uuid(),
  errorType: z.enum(["factual_error", "missing_information", "outdated", "formatting", "other"]),
  description: z.string().min(1).max(1000),
  section: z.enum(["summary", "givingHistory", "relationshipHighlights", "conversationStarters", "recommendedAsk"]).optional(),
});

const querySchema = z.object({
  query: z.string().min(1).max(1000),
});

const savequerySchema = z.object({
  queryId: z.string().uuid(),
  name: z.string().min(1).max(255),
});

export const aiRouter = router({
  // T164: Generate donor brief
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

      // Check if we have a valid cached brief
      const cache = getBriefCache();
      const dataVersion = generateDataVersion({
        constituent: {
          id: constituent.id,
          updatedAt: constituent.updatedAt,
        },
        gifts: constituent.gifts.map((g) => ({
          id: g.id,
          updatedAt: g.updatedAt,
        })),
        contacts: constituent.contacts.map((c) => ({
          id: c.id,
          updatedAt: c.updatedAt,
        })),
      });

      const cached = cache.get(ctx.session.user.organizationId, constituent.id);
      if (cached && cached.dataVersion === dataVersion) {
        // Return cached brief
        const brief = await ctx.prisma.brief.create({
          data: {
            organizationId: ctx.session.user.organizationId,
            constituentId: input.constituentId,
            userId: ctx.session.user.id,
            content: JSON.parse(JSON.stringify(cached.content)),
            citations: [],
            modelUsed: "cached",
          },
        });

        await ctx.prisma.auditLog.create({
          data: {
            organizationId: ctx.session.user.organizationId,
            userId: ctx.session.user.id,
            action: "brief.generate",
            resourceType: "brief",
            resourceId: brief.id,
            details: { source: "cache" },
          },
        });

        return brief;
      }

      // Get API key from environment
      const apiKey = process.env.ANTHROPIC_API_KEY;

      // Calculate summary data for fallback
      const lifetimeGiving = constituent.gifts.reduce(
        (sum, g) => sum + Number(g.amount),
        0
      );
      const lastGiftDate = constituent.gifts[0]?.giftDate || null;

      let briefResult;

      if (!apiKey || input.useFallback) {
        // Use fallback brief
        const fallbackContent = getFallbackBrief({
          constituent: {
            firstName: constituent.firstName,
            lastName: constituent.lastName,
            constituentType: constituent.constituentType,
          },
          totalGifts: constituent.gifts.length,
          lifetimeGiving,
          contactCount: constituent.contacts.length,
          lastGiftDate,
        });

        briefResult = {
          content: fallbackContent,
          citations: [],
          promptTokens: null,
          completionTokens: null,
          modelUsed: "fallback",
        };
      } else {
        // Generate real brief using Claude
        try {
          const result = await generateBrief({
            apiKey,
            constituent: {
              id: constituent.id,
              organizationId: constituent.organizationId,
              externalId: constituent.externalId,
              firstName: constituent.firstName,
              lastName: constituent.lastName,
              prefix: constituent.prefix,
              email: constituent.email,
              phone: constituent.phone,
              constituentType: constituent.constituentType,
              classYear: constituent.classYear,
              schoolCollege: constituent.schoolCollege,
              estimatedCapacity: constituent.estimatedCapacity,
              portfolioTier: constituent.portfolioTier,
            },
            gifts: constituent.gifts.map((g) => ({
              id: g.id,
              amount: g.amount,
              giftDate: g.giftDate,
              fundName: g.fundName,
              giftType: g.giftType,
              campaign: g.campaign,
            })),
            contacts: constituent.contacts.map((c) => ({
              id: c.id,
              contactType: c.contactType,
              contactDate: c.contactDate,
              subject: c.subject,
              notes: c.notes,
              outcome: c.outcome,
            })),
            predictions: constituent.predictions.map((p) => ({
              id: p.id,
              predictionType: p.predictionType,
              score: p.score,
              factors: p.factors,
            })),
          });

          briefResult = {
            content: result.content,
            citations: result.citations,
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            modelUsed: result.modelUsed,
          };

          // Cache the result
          cache.set({
            constituentId: constituent.id,
            organizationId: ctx.session.user.organizationId,
            content: result.content,
            generatedAt: new Date(),
            dataVersion,
          });
        } catch (error) {
          console.error("Brief generation failed, using fallback:", error);

          // Fall back to template brief
          const fallbackContent = getFallbackBrief({
            constituent: {
              firstName: constituent.firstName,
              lastName: constituent.lastName,
              constituentType: constituent.constituentType,
            },
            totalGifts: constituent.gifts.length,
            lifetimeGiving,
            contactCount: constituent.contacts.length,
            lastGiftDate,
          });

          briefResult = {
            content: fallbackContent,
            citations: [],
            promptTokens: null,
            completionTokens: null,
            modelUsed: "fallback-error",
          };
        }
      }

      // Save brief to database
      const brief = await ctx.prisma.brief.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          constituentId: input.constituentId,
          userId: ctx.session.user.id,
          content: JSON.parse(JSON.stringify(briefResult.content)),
          citations: JSON.parse(JSON.stringify(briefResult.citations)),
          promptTokens: briefResult.promptTokens,
          completionTokens: briefResult.completionTokens,
          modelUsed: briefResult.modelUsed,
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
          details: {
            model: briefResult.modelUsed,
            tokens: (briefResult.promptTokens || 0) + (briefResult.completionTokens || 0),
          },
        },
      });

      return brief;
    }),

  // T165: Get brief by ID
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

  // T165: List briefs
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

  // T166: Update brief
  updateBrief: protectedProcedure
    .input(updateBriefSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify brief exists and belongs to organization
      const existing = await ctx.prisma.brief.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brief not found",
        });
      }

      const updated = await ctx.prisma.brief.update({
        where: { id: input.id },
        data: {
          content: input.content,
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "brief.update",
          resourceType: "brief",
          resourceId: input.id,
        },
      });

      return updated;
    }),

  // T166: Flag brief error
  flagBriefError: protectedProcedure
    .input(flagBriefErrorSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify brief exists
      const brief = await ctx.prisma.brief.findFirst({
        where: {
          id: input.briefId,
          organizationId: ctx.session.user.organizationId,
        },
      });

      if (!brief) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brief not found",
        });
      }

      // Log the error flag
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "brief.flag_error",
          resourceType: "brief",
          resourceId: input.briefId,
          details: {
            errorType: input.errorType,
            description: input.description,
            section: input.section,
          },
        },
      });

      return { success: true };
    }),

  // Natural language query (Phase 9 - US6 placeholder)
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
