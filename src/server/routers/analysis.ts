// T108: Analysis router with health scores and analytics
import { z } from "zod";
import { router, protectedProcedure, managerProcedure } from "../trpc/init";
import { getPortfolioFilter } from "../trpc/context";
import {
  calculateHealthScore,
  calculateBatchCompleteness,
  calculateFreshnessScore,
  analyzeDataAge,
  calculateBatchConsistency,
  calculateCoverageScore,
  analyzePortfolioBalance,
  generateRecommendations,
  type HealthIssue,
} from "../services/analysis";

export const analysisRouter = router({
  // T108: Get health scores for organization
  getHealthScores: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.user.organizationId;

    // Get basic stats
    const [
      constituentCount,
      giftCount,
      contactCount,
      assignedCount,
      constituentsWithGifts,
      constituentsWithContacts,
    ] = await Promise.all([
      ctx.prisma.constituent.count({
        where: { organizationId, isActive: true },
      }),
      ctx.prisma.gift.count({ where: { organizationId } }),
      ctx.prisma.contact.count({ where: { organizationId } }),
      ctx.prisma.constituent.count({
        where: { organizationId, isActive: true, assignedOfficerId: { not: null } },
      }),
      ctx.prisma.gift.groupBy({
        by: ["constituentId"],
        where: { organizationId },
      }).then((groups) => groups.length),
      ctx.prisma.contact.groupBy({
        by: ["constituentId"],
        where: { organizationId },
      }).then((groups) => groups.length),
    ]);

    // Get sample of constituents for completeness/consistency analysis
    const constituents = await ctx.prisma.constituent.findMany({
      where: { organizationId, isActive: true },
      take: 500, // Sample size for performance
      select: {
        externalId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        addressLine1: true,
        city: true,
        state: true,
        postalCode: true,
        constituentType: true,
      },
    });

    // Get freshness data
    const [lastGift, lastContact, lastUpload] = await Promise.all([
      ctx.prisma.gift.findFirst({
        where: { organizationId },
        orderBy: { giftDate: "desc" },
        select: { giftDate: true },
      }),
      ctx.prisma.contact.findFirst({
        where: { organizationId },
        orderBy: { contactDate: "desc" },
        select: { contactDate: true },
      }),
      ctx.prisma.upload.findFirst({
        where: { organizationId, status: "completed" },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      }),
    ]);

    // Calculate completeness score
    const completenessStats = calculateBatchCompleteness(
      constituents.map((c) => ({
        ...c,
        lastName: c.lastName || "",
      }))
    );

    // Calculate freshness score
    const freshnessResult = calculateFreshnessScore({
      lastGiftDate: lastGift?.giftDate || null,
      lastContactDate: lastContact?.contactDate || null,
      lastUploadDate: lastUpload?.completedAt || null,
    });

    // Get freshness issues
    const dataAge = analyzeDataAge({
      lastGiftDate: lastGift?.giftDate || null,
      lastContactDate: lastContact?.contactDate || null,
      lastUploadDate: lastUpload?.completedAt || null,
    });

    // Calculate consistency score
    const consistencyStats = calculateBatchConsistency(
      constituents.map((c) => ({
        ...c,
        lastName: c.lastName || "",
      }))
    );

    // Calculate coverage score
    const coverageResult = calculateCoverageScore({
      totalConstituents: constituentCount,
      assignedConstituents: assignedCount,
      constituentsWithContacts,
      constituentsWithGifts,
    });

    // Get portfolio balance for coverage issues
    const officers = await ctx.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ["admin", "manager", "gift_officer"] },
      },
      select: {
        id: true,
        name: true,
        _count: { select: { assignedConstituents: true } },
      },
    });

    const portfolioBalance = analyzePortfolioBalance(
      officers.map((o) => ({
        id: o.id,
        name: o.name,
        constituentCount: o._count.assignedConstituents,
      }))
    );

    // Calculate overall health score
    const healthScore = calculateHealthScore({
      completeness: completenessStats.averageScore,
      freshness: freshnessResult.overall,
      consistency: consistencyStats.averageScore,
      coverage: coverageResult.score,
    });

    // Collect all issues
    const issues: HealthIssue[] = [];

    // Completeness issues
    if (completenessStats.issuesSummary.missing_required) {
      issues.push({
        type: "missing_required",
        severity: "high",
        message: `${completenessStats.issuesSummary.missing_required} constituents missing required fields`,
        count: completenessStats.issuesSummary.missing_required,
      });
    }
    if (completenessStats.issuesSummary.missing_contact) {
      issues.push({
        type: "missing_contact",
        severity: "medium",
        message: `${completenessStats.issuesSummary.missing_contact} constituents without contact info`,
        count: completenessStats.issuesSummary.missing_contact,
      });
    }

    // Freshness issues
    for (const issue of dataAge.issues) {
      issues.push({
        type: issue.type,
        severity: issue.severity,
        message: issue.message,
      });
    }

    // Consistency issues
    if (consistencyStats.totalIssues > 0) {
      for (const [type, count] of Object.entries(consistencyStats.issuesByType)) {
        issues.push({
          type,
          severity: "low",
          message: `${count} records with ${type.replace(/_/g, " ")}`,
          count,
        });
      }
    }

    // Coverage issues
    for (const issue of coverageResult.issues) {
      issues.push({
        type: issue.type,
        severity: issue.severity,
        message: issue.message,
        count: issue.count,
        percentage: issue.percentage,
      });
    }

    // Portfolio balance issues
    for (const issue of portfolioBalance.issues) {
      issues.push({
        type: issue.type,
        severity: issue.severity,
        message: issue.message,
        count: issue.count,
      });
    }

    // Sort issues by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Generate recommendations
    const recommendations = generateRecommendations(issues, {
      totalConstituents: constituentCount,
      overallScore: healthScore.overall,
      completenessScore: healthScore.completeness,
      freshnessScore: healthScore.freshness,
      consistencyScore: healthScore.consistency,
      coverageScore: healthScore.coverage,
    });

    return {
      overall: healthScore.overall,
      completeness: healthScore.completeness,
      freshness: healthScore.freshness,
      consistency: healthScore.consistency,
      coverage: healthScore.coverage,
      issues,
      recommendations,
      stats: {
        constituentCount,
        giftCount,
        contactCount,
        assignedCount,
        unassignedCount: constituentCount - assignedCount,
        constituentsWithGifts,
        constituentsWithContacts,
      },
      freshnessDetails: {
        daysSinceLastGift: dataAge.daysSinceLastGift,
        daysSinceLastContact: dataAge.daysSinceLastContact,
        daysSinceLastUpload: dataAge.daysSinceLastUpload,
      },
    };
  }),

  // T126: Get lapse risk list with comprehensive data
  getLapseRiskList: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
        minRisk: z.number().min(0).max(1).default(0.4),
        riskLevel: z.enum(["high", "medium", "low"]).optional(),
        assignedOfficerId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const portfolioFilter = getPortfolioFilter(ctx);
      const organizationId = ctx.session.user.organizationId;

      // Map risk level to score ranges
      let minScore = input.minRisk;
      let maxScore = 1.0;
      if (input.riskLevel === "high") {
        minScore = 0.7;
      } else if (input.riskLevel === "medium") {
        minScore = 0.4;
        maxScore = 0.7;
      } else if (input.riskLevel === "low") {
        minScore = 0;
        maxScore = 0.4;
      }

      const constituents = await ctx.prisma.constituent.findMany({
        where: {
          ...portfolioFilter,
          isActive: true,
          lapseRiskScore: { gte: minScore, lt: maxScore },
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
          gifts: {
            orderBy: { giftDate: "desc" },
            take: 1,
            select: {
              amount: true,
              giftDate: true,
            },
          },
          contacts: {
            orderBy: { contactDate: "desc" },
            take: 1,
            select: {
              contactDate: true,
            },
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

      // Get summary counts
      const [highCount, mediumCount, lowCount, totalAtRiskValue] = await Promise.all([
        ctx.prisma.constituent.count({
          where: { ...portfolioFilter, isActive: true, lapseRiskScore: { gte: 0.7 } },
        }),
        ctx.prisma.constituent.count({
          where: { ...portfolioFilter, isActive: true, lapseRiskScore: { gte: 0.4, lt: 0.7 } },
        }),
        ctx.prisma.constituent.count({
          where: { ...portfolioFilter, isActive: true, lapseRiskScore: { gt: 0, lt: 0.4 } },
        }),
        ctx.prisma.gift.aggregate({
          where: {
            organizationId,
            constituent: {
              ...portfolioFilter,
              isActive: true,
              lapseRiskScore: { gte: 0.4 },
            },
          },
          _sum: { amount: true },
        }),
      ]);

      // Helper to get risk level from score
      const getRiskLevel = (score: number | null): "high" | "medium" | "low" => {
        if (!score || score < 0.4) return "low";
        if (score < 0.7) return "medium";
        return "high";
      };

      // Helper to get predicted lapse window
      const getLapseWindow = (score: number | null): string => {
        if (!score) return "Unknown";
        if (score >= 0.85) return "1-3 months";
        if (score >= 0.7) return "3-6 months";
        if (score >= 0.5) return "6-12 months";
        if (score >= 0.4) return "12-18 months";
        return "18+ months";
      };

      return {
        items: constituents.map((c) => ({
          constituent: {
            id: c.id,
            displayName: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown",
            email: c.email,
            assignedOfficerId: c.assignedOfficer?.id || null,
            assignedOfficerName: c.assignedOfficer?.name || null,
          },
          riskScore: Number(c.lapseRiskScore) || 0,
          riskLevel: getRiskLevel(Number(c.lapseRiskScore)),
          confidence: 0.7, // TODO: Calculate from data quality
          predictedLapseWindow: getLapseWindow(Number(c.lapseRiskScore)),
          factors: (c.lapseRiskFactors as Array<{ name: string; value: string; impact: string }>) || [],
          givingSummary: {
            totalLifetime: 0, // Could aggregate if needed
            lastGiftDate: c.gifts[0]?.giftDate?.toISOString() || null,
            lastGiftAmount: c.gifts[0]?.amount ? Number(c.gifts[0].amount) : null,
            avgAnnualGiving: 0, // Could calculate if needed
          },
          lastContactDate: c.contacts[0]?.contactDate?.toISOString() || null,
          status: null, // TODO: Track from alerts
        })),
        nextCursor,
        totalCount: highCount + mediumCount + lowCount,
        summary: {
          highRiskCount: highCount,
          mediumRiskCount: mediumCount,
          lowRiskCount: lowCount,
          totalAtRiskValue: Number(totalAtRiskValue._sum.amount) || 0,
        },
      };
    }),

  // T127: Mark lapse risk as addressed with proper tracking
  markLapseAddressed: protectedProcedure
    .input(
      z.object({
        constituentId: z.string().uuid(),
        action: z.enum(["addressed", "retained", "dismissed"]),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId;

      // Get the constituent to verify access
      const constituent = await ctx.prisma.constituent.findFirst({
        where: {
          id: input.constituentId,
          organizationId,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          lapseRiskScore: true,
        },
      });

      if (!constituent) {
        throw new Error("Constituent not found");
      }

      // Determine alert status based on action
      const alertStatus = input.action === "dismissed" ? "dismissed" : "acted_on";

      // Create an alert record to track this action
      await ctx.prisma.alert.create({
        data: {
          organizationId,
          constituentId: input.constituentId,
          alertType: "lapse_risk",
          severity: Number(constituent.lapseRiskScore) >= 0.7 ? "high" : "medium",
          title: `Lapse risk ${input.action}: ${[constituent.firstName, constituent.lastName].filter(Boolean).join(" ")}`,
          description: input.notes || `User marked lapse risk as ${input.action}`,
          status: alertStatus,
          actedOnAt: new Date(),
          actedOnBy: ctx.session.user.name || ctx.session.user.email,
        },
      });

      // Create audit log entry
      await ctx.prisma.auditLog.create({
        data: {
          organizationId,
          userId: ctx.session.user.id,
          action: "lapse_risk.addressed",
          resourceType: "constituent",
          resourceId: input.constituentId,
          details: {
            action: input.action,
            notes: input.notes,
            riskScore: Number(constituent.lapseRiskScore),
          },
        },
      });

      return {
        success: true,
        message: `Lapse risk marked as ${input.action}`,
      };
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

    // Analyze portfolio balance
    const balance = analyzePortfolioBalance(
      officerMetrics.map((o) => ({
        id: o.id,
        name: o.name,
        constituentCount: o._count.assignedConstituents,
      }))
    );

    return {
      officers: officerMetrics.map((o) => ({
        id: o.id,
        name: o.name,
        constituentCount: o._count.assignedConstituents,
      })),
      totalConstituents,
      unassigned,
      imbalances: balance.issues,
      suggestions: [],
      stats: {
        averagePortfolioSize: balance.averagePortfolioSize,
        minPortfolioSize: balance.minPortfolioSize,
        maxPortfolioSize: balance.maxPortfolioSize,
        isBalanced: balance.isBalanced,
      },
    };
  }),

  // Get health score history for trend chart
  getHealthHistory: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(30),
      })
    )
    .query(async ({ input }) => {
      // For now, return placeholder data
      // In a real implementation, we'd store historical scores in a separate table
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Generate mock trend data
      const data: Array<{
        date: string;
        overall: number;
        completeness: number;
        freshness: number;
        consistency: number;
        coverage: number;
      }> = [];

      // For now, return empty array - will be populated when we have real history
      return {
        data,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    }),
});
