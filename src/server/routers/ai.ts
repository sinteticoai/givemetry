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

  // T183: Natural language query - full implementation
  query: protectedProcedure
    .input(querySchema)
    .mutation(async ({ ctx, input }) => {
      const apiKey = process.env.ANTHROPIC_API_KEY;

      // Import NL query services
      const { parseNaturalLanguageQuery } = await import("../services/ai/nl-query-parser");
      const { translateQueryToPrisma, buildAggregationQuery } = await import("../services/ai/query-translator");
      const { getPortfolioFilter } = await import("../trpc/context");

      // Parse the natural language query using Claude
      let parsedQuery;
      if (apiKey) {
        parsedQuery = await parseNaturalLanguageQuery({
          apiKey,
          query: input.query,
          timeout: 10000, // 10 second timeout
        });
      } else {
        // Fallback: return empty results when API key not available
        parsedQuery = {
          success: false,
          filters: [],
          limit: 50,
          interpretation: "AI service unavailable",
          error: "API key not configured",
        };
      }

      // Get portfolio filter for gift officers
      const portfolioFilter = getPortfolioFilter(ctx);

      let results: Array<{
        id: string;
        displayName: string;
        email: string | null;
        totalGiving: number;
        lastGiftDate: Date | null;
        lastContactDate: Date | null;
        priorityScore: number | null;
        lapseRiskLevel: "high" | "medium" | "low" | null;
      }> = [];
      let totalCount = 0;

      if (parsedQuery.success && parsedQuery.filters.length > 0) {
        // Check if we need aggregation-based query
        const hasAggregationFilters = parsedQuery.filters.some(
          (f) => ["total_giving", "last_gift_date", "last_contact_date"].includes(f.field)
        );

        if (hasAggregationFilters) {
          // Build and execute raw SQL query for aggregation filters
          const aggregationFilters = parsedQuery.filters
            .filter((f) => ["total_giving", "last_gift_date", "last_contact_date"].includes(f.field))
            .map((f) => ({ field: f.field, operator: f.operator, value: f.value }));

          const { sql, params } = buildAggregationQuery(
            aggregationFilters,
            ctx.session.user.organizationId,
            parsedQuery.limit || 50,
            parsedQuery.sort
          );

          // Execute raw query
          type RawResult = {
            id: string;
            firstName: string | null;
            lastName: string | null;
            email: string | null;
            lapseRiskScore: number | null;
            priorityScore: number | null;
            total_giving: number;
            last_gift_date: Date | null;
            last_contact_date: Date | null;
          };

          const rawResults = await ctx.prisma.$queryRawUnsafe<RawResult[]>(sql, ...params);

          // Apply additional non-aggregation filters in memory
          const nonAggregationFilters = parsedQuery.filters.filter(
            (f) => !["total_giving", "last_gift_date", "last_contact_date"].includes(f.field)
          );

          let filteredResults = rawResults;
          if (nonAggregationFilters.length > 0) {
            // Translate for reference but filter in memory for non-aggregation criteria
            translateQueryToPrisma(nonAggregationFilters, ctx.session.user.organizationId);
            // Filter in memory based on additional criteria
            filteredResults = rawResults.filter((r) => {
              // Check each additional filter
              for (const filter of nonAggregationFilters) {
                switch (filter.field) {
                  case "lapse_risk":
                    if (r.lapseRiskScore === null) return false;
                    const riskScore = Number(r.lapseRiskScore);
                    if (filter.operator === "gt" && riskScore <= Number(filter.value)) return false;
                    if (filter.operator === "gte" && riskScore < Number(filter.value)) return false;
                    if (filter.operator === "lt" && riskScore >= Number(filter.value)) return false;
                    break;
                  case "priority_score":
                    if (r.priorityScore === null) return false;
                    const pScore = Number(r.priorityScore);
                    if (filter.operator === "gt" && pScore <= Number(filter.value)) return false;
                    if (filter.operator === "gte" && pScore < Number(filter.value)) return false;
                    break;
                }
              }
              return true;
            });
          }

          results = filteredResults.map((r) => {
            const lapseRisk = r.lapseRiskScore ? Number(r.lapseRiskScore) : null;
            return {
              id: r.id,
              displayName: [r.firstName, r.lastName].filter(Boolean).join(" ") || "Unknown",
              email: r.email,
              totalGiving: Number(r.total_giving) || 0,
              lastGiftDate: r.last_gift_date,
              lastContactDate: r.last_contact_date,
              priorityScore: r.priorityScore ? Number(r.priorityScore) : null,
              lapseRiskLevel: lapseRisk !== null
                ? lapseRisk > 0.7 ? "high" : lapseRisk > 0.4 ? "medium" : "low"
                : null,
            };
          });
          totalCount = results.length;
        } else {
          // Use Prisma query for simple filters
          const prismaWhere = translateQueryToPrisma(parsedQuery.filters, ctx.session.user.organizationId);

          // Apply portfolio filter for gift officers
          const whereClause = {
            ...prismaWhere,
            ...portfolioFilter,
          };

          // Fetch constituents
          const constituents = await ctx.prisma.constituent.findMany({
            where: whereClause,
            orderBy: parsedQuery.sort
              ? {
                  [parsedQuery.sort.field === "lapse_risk" ? "lapseRiskScore" :
                   parsedQuery.sort.field === "priority_score" ? "priorityScore" :
                   parsedQuery.sort.field === "capacity" ? "estimatedCapacity" : "priorityScore"]:
                    parsedQuery.sort.direction,
                }
              : { priorityScore: "desc" },
            take: parsedQuery.limit || 50,
            include: {
              gifts: {
                orderBy: { giftDate: "desc" },
                take: 1,
              },
              contacts: {
                orderBy: { contactDate: "desc" },
                take: 1,
              },
            },
          });

          // Calculate totals for each constituent
          const giftTotals = await ctx.prisma.gift.groupBy({
            by: ["constituentId"],
            where: {
              organizationId: ctx.session.user.organizationId,
              constituentId: { in: constituents.map((c) => c.id) },
            },
            _sum: { amount: true },
          });

          const giftTotalMap = new Map(giftTotals.map((g) => [g.constituentId, Number(g._sum.amount) || 0]));

          results = constituents.map((c) => {
            const lapseRisk = c.lapseRiskScore ? Number(c.lapseRiskScore) : null;
            return {
              id: c.id,
              displayName: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown",
              email: c.email,
              totalGiving: giftTotalMap.get(c.id) || 0,
              lastGiftDate: c.gifts[0]?.giftDate || null,
              lastContactDate: c.contacts[0]?.contactDate || null,
              priorityScore: c.priorityScore ? Number(c.priorityScore) : null,
              lapseRiskLevel: lapseRisk !== null
                ? lapseRisk > 0.7 ? "high" : lapseRisk > 0.4 ? "medium" : "low"
                : null,
            };
          });

          totalCount = await ctx.prisma.constituent.count({ where: whereClause });
        }
      } else if (parsedQuery.success) {
        // Empty filters - return all constituents with portfolio filter
        const whereClause = {
          organizationId: ctx.session.user.organizationId,
          isActive: true,
          ...portfolioFilter,
        };

        const constituents = await ctx.prisma.constituent.findMany({
          where: whereClause,
          orderBy: { priorityScore: "desc" },
          take: parsedQuery.limit || 50,
          include: {
            gifts: {
              orderBy: { giftDate: "desc" },
              take: 1,
            },
            contacts: {
              orderBy: { contactDate: "desc" },
              take: 1,
            },
          },
        });

        const giftTotals = await ctx.prisma.gift.groupBy({
          by: ["constituentId"],
          where: {
            organizationId: ctx.session.user.organizationId,
            constituentId: { in: constituents.map((c) => c.id) },
          },
          _sum: { amount: true },
        });

        const giftTotalMap = new Map(giftTotals.map((g) => [g.constituentId, Number(g._sum.amount) || 0]));

        results = constituents.map((c) => {
          const lapseRisk = c.lapseRiskScore ? Number(c.lapseRiskScore) : null;
          return {
            id: c.id,
            displayName: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown",
            email: c.email,
            totalGiving: giftTotalMap.get(c.id) || 0,
            lastGiftDate: c.gifts[0]?.giftDate || null,
            lastContactDate: c.contacts[0]?.contactDate || null,
            priorityScore: c.priorityScore ? Number(c.priorityScore) : null,
            lapseRiskLevel: lapseRisk !== null
              ? lapseRisk > 0.7 ? "high" : lapseRisk > 0.4 ? "medium" : "low"
              : null,
          };
        });

        totalCount = await ctx.prisma.constituent.count({ where: whereClause });
      }

      // Store the query
      const queryRecord = await ctx.prisma.naturalLanguageQuery.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          queryText: input.query,
          interpretedQuery: JSON.parse(JSON.stringify({
            raw: input.query,
            parsed: parsedQuery,
            filters: parsedQuery.filters,
          })),
          resultCount: totalCount,
          resultIds: results.map((r) => r.id),
        },
      });

      return {
        id: queryRecord.id,
        success: parsedQuery.success,
        interpretation: parsedQuery.interpretation || "Searching constituents...",
        filters: parsedQuery.filters.map((f) => ({
          field: f.field,
          operator: f.operator,
          value: f.value,
          humanReadable: f.humanReadable,
        })),
        results,
        totalCount,
        message: parsedQuery.error,
        suggestions: !parsedQuery.success ? [
          "Try: 'donors who gave over $10,000'",
          "Try: 'high risk alumni'",
          "Try: 'top priority prospects'",
        ] : undefined,
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

  // T197: Get recommendation (Phase 10 - US8)
  getRecommendation: protectedProcedure
    .input(z.object({ constituentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const portfolioFilter = getPortfolioFilter(ctx);

      // Get constituent with related data
      const constituent = await ctx.prisma.constituent.findFirst({
        where: {
          id: input.constituentId,
          ...portfolioFilter,
        },
        include: {
          gifts: {
            orderBy: { giftDate: "desc" },
            take: 50,
          },
          contacts: {
            orderBy: { contactDate: "desc" },
            take: 30,
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

      // Import recommendation engine
      const { generateRecommendation, buildConstituentContext } = await import("../services/ai/recommendation-engine");

      // Build context from constituent data
      const context = buildConstituentContext({
        constituent: {
          id: constituent.id,
          firstName: constituent.firstName,
          lastName: constituent.lastName,
          constituentType: constituent.constituentType,
          priorityScore: constituent.priorityScore ? Number(constituent.priorityScore) : null,
          lapseRiskScore: constituent.lapseRiskScore ? Number(constituent.lapseRiskScore) : null,
          estimatedCapacity: constituent.estimatedCapacity ? Number(constituent.estimatedCapacity) : null,
        },
        gifts: constituent.gifts.map((g) => ({
          amount: Number(g.amount),
          giftDate: g.giftDate,
        })),
        contacts: constituent.contacts.map((c) => ({
          contactDate: c.contactDate,
          contactType: c.contactType,
        })),
        predictions: constituent.predictions.map((p) => ({
          predictionType: p.predictionType,
          score: Number(p.score),
          confidence: p.confidence ? Number(p.confidence) : null,
        })),
        fiscalYearEnd: new Date(new Date().getFullYear(), 5, 30), // June 30 default FY end
        activeCampaigns: [], // Could be loaded from org settings
        referenceDate: new Date(),
      });

      // Generate recommendation
      const recommendation = generateRecommendation(context);

      return {
        constituentId: input.constituentId,
        constituentName: [constituent.firstName, constituent.lastName].filter(Boolean).join(" "),
        action: recommendation.actionLabel,
        actionType: recommendation.actionType,
        actionDescription: recommendation.actionDescription,
        reasoning: recommendation.reasoning,
        confidence: recommendation.confidence,
        urgencyLevel: recommendation.urgencyLevel,
        nextSteps: recommendation.nextSteps,
        alternatives: recommendation.alternatives,
        context: {
          primaryFactor: recommendation.context.primaryFactor,
          supportingFactors: recommendation.context.supportingFactors,
        },
      };
    }),

  // T198: Mark action complete
  markActionComplete: protectedProcedure
    .input(
      z.object({
        constituentId: z.string().uuid(),
        actionType: z.string(),
        notes: z.string().optional(),
        outcome: z.enum(["completed", "scheduled", "deferred", "not_applicable"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const portfolioFilter = getPortfolioFilter(ctx);

      // Verify constituent exists and user has access
      const constituent = await ctx.prisma.constituent.findFirst({
        where: {
          id: input.constituentId,
          ...portfolioFilter,
        },
        select: { id: true, firstName: true, lastName: true },
      });

      if (!constituent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Constituent not found",
        });
      }

      // Log the action completion
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "recommendation.complete",
          resourceType: "constituent",
          resourceId: input.constituentId,
          details: {
            actionType: input.actionType,
            outcome: input.outcome || "completed",
            notes: input.notes,
            completedAt: new Date().toISOString(),
          },
        },
      });

      // Optionally create a contact record for the completed action
      if (input.outcome === "completed" || input.outcome === "scheduled") {
        await ctx.prisma.contact.create({
          data: {
            organizationId: ctx.session.user.organizationId,
            constituentId: input.constituentId,
            userId: ctx.session.user.id,
            contactType: mapActionToContactType(input.actionType),
            contactDate: new Date(),
            subject: `Action: ${input.actionType.replace(/_/g, " ")}`,
            notes: input.notes || null,
            outcome: input.outcome === "completed" ? "positive" : "neutral",
          },
        });
      }

      return {
        success: true,
        message: `Action marked as ${input.outcome || "completed"}`,
      };
    }),
});

// Helper to map action types to contact types
function mapActionToContactType(actionType: string): string {
  const mapping: Record<string, string> = {
    schedule_meeting: "meeting",
    stewardship_call: "call",
    thank_you_visit: "meeting",
    re_engagement_call: "call",
    send_impact_report: "letter",
    campaign_solicitation: "meeting",
    event_invitation: "event",
    campus_visit: "meeting",
    initial_outreach: "call",
    proposal_presentation: "meeting",
    pledge_reminder: "call",
    birthday_outreach: "letter",
  };
  return mapping[actionType] || "other";
}
