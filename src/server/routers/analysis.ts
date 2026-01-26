// T108: Analysis router with health scores and analytics
// T144-T146: Priority list, feedback, and refresh procedures
import { z } from "zod";
import { router, protectedProcedure } from "../trpc/init";
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
  calculatePortfolioMetrics,
  detectImbalances,
  generateImbalanceAlerts,
  generateRebalanceSuggestions,
  type HealthIssue,
  type OfficerPortfolio,
} from "../services/analysis";
import {
  calculatePriorityScore,
  type PriorityScoreInput,
} from "../services/analysis/priority-scorer";
import { formatCapacity as formatCap } from "../services/analysis/priority-factors/capacity";

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

  // T144: Get priority list with comprehensive scoring data
  getPriorityList: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().uuid().optional(),
        minPriority: z.number().min(0).max(1).default(0.5),
        assignedOfficerId: z.string().uuid().optional(),
        excludeRecentContact: z.boolean().default(true),
        recentContactDays: z.number().int().default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      const portfolioFilter = getPortfolioFilter(ctx);

      // Calculate date for "recently contacted" filter
      const recentContactCutoff = new Date();
      recentContactCutoff.setDate(recentContactCutoff.getDate() - input.recentContactDays);

      const constituents = await ctx.prisma.constituent.findMany({
        where: {
          ...portfolioFilter,
          isActive: true,
          priorityScore: { gte: input.minPriority },
          ...(input.assignedOfficerId && {
            assignedOfficerId: input.assignedOfficerId,
          }),
          ...(input.excludeRecentContact && {
            NOT: {
              contacts: {
                some: {
                  contactDate: { gte: recentContactCutoff },
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
          phone: true,
          constituentType: true,
          classYear: true,
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
          gifts: {
            orderBy: { giftDate: "desc" },
            take: 1,
            select: { giftDate: true, amount: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (constituents.length > input.limit) {
        const nextItem = constituents.pop();
        nextCursor = nextItem?.id;
      }

      // Get portfolio summary
      const [totalProspects, totalCapacityResult] = await Promise.all([
        ctx.prisma.constituent.count({
          where: { ...portfolioFilter, isActive: true, priorityScore: { gte: 0.4 } },
        }),
        ctx.prisma.constituent.aggregate({
          where: { ...portfolioFilter, isActive: true },
          _sum: { estimatedCapacity: true },
          _avg: { priorityScore: true },
        }),
      ]);

      // Helper to get capacity label
      const getCapacityLabel = (capacity: number | null): string => {
        if (capacity === null) return "Unknown";
        if (capacity >= 1000000) return "$1M+";
        if (capacity >= 500000) return "$500K-$1M";
        if (capacity >= 250000) return "$250K-$500K";
        if (capacity >= 100000) return "$100K-$250K";
        if (capacity >= 50000) return "$50K-$100K";
        if (capacity >= 25000) return "$25K-$50K";
        if (capacity >= 10000) return "$10K-$25K";
        return "<$10K";
      };

      // Generate activity summary
      const getRecentActivitySummary = (
        lastGiftDate: Date | null,
        lastContactDate: Date | null
      ): string => {
        const parts: string[] = [];
        const now = new Date();

        if (lastGiftDate) {
          const daysSinceGift = Math.floor(
            (now.getTime() - lastGiftDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceGift < 30) {
            parts.push(`Gift ${daysSinceGift} days ago`);
          } else if (daysSinceGift < 365) {
            parts.push(`Gift ${Math.round(daysSinceGift / 30)} months ago`);
          }
        }

        if (lastContactDate) {
          const daysSinceContact = Math.floor(
            (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceContact < 30) {
            parts.push(`Contact ${daysSinceContact} days ago`);
          } else if (daysSinceContact < 365) {
            parts.push(`Contact ${Math.round(daysSinceContact / 30)} months ago`);
          }
        }

        return parts.length > 0 ? parts.join(", ") : "No recent activity";
      };

      // Generate recommended action from factors
      const getRecommendedAction = (
        score: number,
        _factors: Array<{ name: string; value: string; impact: string }>,
        lastContactDate: Date | null
      ): { action: string; reason: string } | null => {
        if (score < 0.5) return null;

        const hasRecentContact = lastContactDate &&
          (new Date().getTime() - lastContactDate.getTime()) < 30 * 24 * 60 * 60 * 1000;

        if (score >= 0.8 && !hasRecentContact) {
          return {
            action: "Schedule personal meeting",
            reason: "High priority prospect - optimal timing for engagement",
          };
        }

        if (score >= 0.6 && !hasRecentContact) {
          return {
            action: "Review for outreach",
            reason: "Good priority score - consider for next outreach cycle",
          };
        }

        return null;
      };

      return {
        items: constituents.map((c, index) => ({
          rank: index + 1,
          constituent: {
            id: c.id,
            displayName: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown",
            email: c.email,
            phone: c.phone,
            constituentType: c.constituentType,
            classYear: c.classYear,
          },
          priorityScore: Number(c.priorityScore) || 0,
          confidence: 0.7, // TODO: Calculate from data quality
          factors: (c.priorityFactors as Array<{ name: string; value: string; impact: string }>) || [],
          capacityIndicator: {
            estimate: c.estimatedCapacity ? Number(c.estimatedCapacity) : null,
            label: getCapacityLabel(c.estimatedCapacity ? Number(c.estimatedCapacity) : null),
          },
          engagement: {
            lastContactDate: c.contacts[0]?.contactDate?.toISOString() || null,
            lastGiftDate: c.gifts[0]?.giftDate?.toISOString() || null,
            recentActivitySummary: getRecentActivitySummary(
              c.gifts[0]?.giftDate || null,
              c.contacts[0]?.contactDate || null
            ),
          },
          timing: {
            indicator: "Standard timing",
            score: 0.5, // TODO: Calculate from org fiscal year
          },
          recommendedAction: getRecommendedAction(
            Number(c.priorityScore) || 0,
            (c.priorityFactors as Array<{ name: string; value: string; impact: string }>) || [],
            c.contacts[0]?.contactDate || null
          ),
        })),
        nextCursor: nextCursor || null,
        totalCount: totalProspects,
        generatedAt: new Date().toISOString(),
        portfolioSummary: {
          totalProspects,
          totalCapacity: Number(totalCapacityResult._sum.estimatedCapacity) || 0,
          avgPriorityScore: Number(totalCapacityResult._avg.priorityScore) || 0,
        },
      };
    }),

  // T145: Provide priority feedback for model improvement
  providePriorityFeedback: protectedProcedure
    .input(
      z.object({
        constituentId: z.string().uuid(),
        feedback: z.enum(["not_now", "already_in_conversation", "not_interested", "wrong_timing"]),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId;

      // Verify constituent exists and user has access
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
          priorityScore: true,
        },
      });

      if (!constituent) {
        throw new Error("Constituent not found");
      }

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
            feedbackNotes: input.notes,
            feedbackAt: new Date().toISOString(),
            feedbackBy: ctx.session.user.id,
          },
        },
      });

      // If no current prediction exists, create one with feedback
      const existingPrediction = await ctx.prisma.prediction.findFirst({
        where: {
          constituentId: input.constituentId,
          predictionType: "priority",
          isCurrent: true,
        },
      });

      if (!existingPrediction) {
        await ctx.prisma.prediction.create({
          data: {
            organizationId,
            constituentId: input.constituentId,
            predictionType: "priority",
            score: Number(constituent.priorityScore) || 0,
            confidence: 0.7,
            isCurrent: true,
            factors: {
              feedback: input.feedback,
              feedbackNotes: input.notes,
              feedbackAt: new Date().toISOString(),
              feedbackBy: ctx.session.user.id,
            },
          },
        });
      }

      // Create audit log for feedback
      await ctx.prisma.auditLog.create({
        data: {
          organizationId,
          userId: ctx.session.user.id,
          action: "priority.feedback",
          resourceType: "constituent",
          resourceId: input.constituentId,
          details: {
            feedback: input.feedback,
            notes: input.notes,
            priorityScore: Number(constituent.priorityScore),
          },
        },
      });

      return {
        success: true,
        message: `Feedback recorded: ${input.feedback.replace(/_/g, " ")}`,
      };
    }),

  // T146: Refresh priorities - recalculate for user's portfolio
  refreshPriorities: protectedProcedure.mutation(async ({ ctx }) => {
    const portfolioFilter = getPortfolioFilter(ctx);
    const organizationId = ctx.session.user.organizationId;

    // Get constituents in portfolio with their data for recalculation
    const constituents = await ctx.prisma.constituent.findMany({
      where: {
        ...portfolioFilter,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        constituentType: true,
        classYear: true,
        estimatedCapacity: true,
        lapseRiskScore: true,
        priorityScore: true,
        priorityFactors: true,
        gifts: {
          orderBy: { giftDate: "desc" },
          take: 10,
          select: { giftDate: true, amount: true },
        },
        contacts: {
          orderBy: { contactDate: "desc" },
          take: 10,
          select: { contactDate: true, contactType: true },
        },
      },
    });

    // Get organization fiscal year end (default to June 30)
    const fiscalYearEnd = new Date();
    fiscalYearEnd.setMonth(5); // June
    fiscalYearEnd.setDate(30);
    if (fiscalYearEnd < new Date()) {
      fiscalYearEnd.setFullYear(fiscalYearEnd.getFullYear() + 1);
    }

    const referenceDate = new Date();
    let updatedCount = 0;

    // Recalculate priority for each constituent
    for (const constituent of constituents) {
      const input: PriorityScoreInput = {
        capacity: {
          estimatedCapacity: constituent.estimatedCapacity
            ? Number(constituent.estimatedCapacity)
            : null,
        },
        lapseRisk: {
          score: constituent.lapseRiskScore
            ? Number(constituent.lapseRiskScore)
            : null,
        },
        timing: {
          fiscalYearEnd,
          campaigns: [], // TODO: Get active campaigns
        },
        engagement: {
          gifts: constituent.gifts.map((g) => ({
            date: g.giftDate,
            amount: Number(g.amount),
          })),
          contacts: constituent.contacts.map((c) => ({
            date: c.contactDate,
            type: c.contactType || "unknown",
          })),
        },
        referenceDate,
      };

      const result = calculatePriorityScore(input);

      // Convert factors to JSON-safe format
      const factorsJson = result.factors.map(f => ({
        name: f.name,
        value: f.value,
        impact: f.impact,
        weight: f.weight,
        rawScore: f.rawScore,
      }));

      // Update constituent with new priority score and factors
      await ctx.prisma.constituent.update({
        where: { id: constituent.id },
        data: {
          priorityScore: result.score,
          priorityFactors: factorsJson,
        },
      });

      // Mark existing predictions as not current
      await ctx.prisma.prediction.updateMany({
        where: {
          constituentId: constituent.id,
          predictionType: "priority",
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });

      // Create new prediction record
      await ctx.prisma.prediction.create({
        data: {
          organizationId,
          constituentId: constituent.id,
          predictionType: "priority",
          score: result.score,
          confidence: result.confidence,
          factors: factorsJson,
          isCurrent: true,
        },
      });

      updatedCount++;
    }

    // Create audit log
    await ctx.prisma.auditLog.create({
      data: {
        organizationId,
        userId: ctx.session.user.id,
        action: "analysis.refresh",
        resourceType: "priority",
        details: {
          constituentsUpdated: updatedCount,
          refreshedAt: referenceDate.toISOString(),
        },
      },
    });

    // Return the updated priority list
    const refreshedConstituents = await ctx.prisma.constituent.findMany({
      where: {
        ...portfolioFilter,
        isActive: true,
        priorityScore: { gte: 0.4 },
      },
      orderBy: { priorityScore: "desc" },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        constituentType: true,
        classYear: true,
        priorityScore: true,
        priorityFactors: true,
        estimatedCapacity: true,
        contacts: {
          orderBy: { contactDate: "desc" },
          take: 1,
          select: { contactDate: true },
        },
        gifts: {
          orderBy: { giftDate: "desc" },
          take: 1,
          select: { giftDate: true },
        },
      },
    });

    // Get summary
    const [totalProspects, summaryStats] = await Promise.all([
      ctx.prisma.constituent.count({
        where: { ...portfolioFilter, isActive: true, priorityScore: { gte: 0.4 } },
      }),
      ctx.prisma.constituent.aggregate({
        where: { ...portfolioFilter, isActive: true },
        _sum: { estimatedCapacity: true },
        _avg: { priorityScore: true },
      }),
    ]);

    return {
      items: refreshedConstituents.map((c, index) => ({
        rank: index + 1,
        constituent: {
          id: c.id,
          displayName: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown",
          email: c.email,
          phone: c.phone,
          constituentType: c.constituentType,
          classYear: c.classYear,
        },
        priorityScore: Number(c.priorityScore) || 0,
        confidence: 0.7,
        factors: (c.priorityFactors as Array<{ name: string; value: string; impact: string }>) || [],
        capacityIndicator: {
          estimate: c.estimatedCapacity ? Number(c.estimatedCapacity) : null,
          label: c.estimatedCapacity
            ? formatCap(Number(c.estimatedCapacity))
            : "Unknown",
        },
        engagement: {
          lastContactDate: c.contacts[0]?.contactDate?.toISOString() || null,
          lastGiftDate: c.gifts[0]?.giftDate?.toISOString() || null,
          recentActivitySummary: "Refreshed",
        },
        timing: {
          indicator: "Standard timing",
          score: 0.5,
        },
        recommendedAction: null,
      })),
      nextCursor: null,
      totalCount: totalProspects,
      generatedAt: referenceDate.toISOString(),
      portfolioSummary: {
        totalProspects,
        totalCapacity: Number(summaryStats._sum.estimatedCapacity) || 0,
        avgPriorityScore: Number(summaryStats._avg.priorityScore) || 0,
      },
    };
  }),

  // Get portfolio metrics (Phase 13 - US11)
  getPortfolioMetrics: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.user.organizationId;

    // Get officers with their assigned constituents
    const officers = await ctx.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ["admin", "manager", "gift_officer"] },
      },
      select: {
        id: true,
        name: true,
        assignedConstituents: {
          where: { isActive: true },
          select: {
            id: true,
            estimatedCapacity: true,
            priorityScore: true,
            lapseRiskScore: true,
          },
        },
      },
    });

    // Get unassigned constituents
    const unassignedConstituents = await ctx.prisma.constituent.findMany({
      where: { organizationId, isActive: true, assignedOfficerId: null },
      select: {
        id: true,
        estimatedCapacity: true,
        priorityScore: true,
        lapseRiskScore: true,
      },
    });

    // Get total constituents
    const totalConstituents = await ctx.prisma.constituent.count({
      where: { organizationId, isActive: true },
    });

    // Build officer portfolios for metrics calculation
    const officerPortfolios: OfficerPortfolio[] = officers.map((o) => ({
      officerId: o.id,
      officerName: o.name,
      constituents: o.assignedConstituents.map((c) => ({
        id: c.id,
        estimatedCapacity: c.estimatedCapacity ? Number(c.estimatedCapacity) : null,
        priorityScore: c.priorityScore ? Number(c.priorityScore) : null,
        lapseRiskScore: c.lapseRiskScore ? Number(c.lapseRiskScore) : null,
      })),
    }));

    // Calculate comprehensive metrics
    const metrics = calculatePortfolioMetrics({
      officers: officerPortfolios,
      unassignedConstituents: unassignedConstituents.map((c) => ({
        id: c.id,
        estimatedCapacity: c.estimatedCapacity ? Number(c.estimatedCapacity) : null,
        priorityScore: c.priorityScore ? Number(c.priorityScore) : null,
        lapseRiskScore: c.lapseRiskScore ? Number(c.lapseRiskScore) : null,
      })),
      organizationId,
    });

    // Detect imbalances
    const imbalanceResult = detectImbalances({
      officers: metrics.officerMetrics.map((o) => ({
        officerId: o.officerId,
        officerName: o.officerName,
        constituentCount: o.constituentCount,
        totalCapacity: o.totalCapacity,
        avgPriorityScore: o.averagePriorityScore,
      })),
    });

    // Generate alerts for imbalanced portfolios
    const imbalanceAlerts = generateImbalanceAlerts(
      metrics.officerMetrics.map((o) => ({
        officerId: o.officerId,
        officerName: o.officerName,
        constituentCount: o.constituentCount,
        totalCapacity: o.totalCapacity,
        avgPriorityScore: o.averagePriorityScore,
      }))
    );

    // Generate rebalancing suggestions if there are imbalances
    let suggestions: Array<{
      constituentId: string;
      constituentName: string;
      fromOfficerId: string;
      fromOfficerName: string | null;
      toOfficerId: string;
      toOfficerName: string | null;
      reason: string;
    }> = [];

    if (imbalanceResult.hasImbalances) {
      // Get sample constituents for suggestion generation
      const constituentsForRebalance = await ctx.prisma.constituent.findMany({
        where: {
          organizationId,
          isActive: true,
          assignedOfficerId: { not: null },
        },
        take: 500,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          estimatedCapacity: true,
          priorityScore: true,
          lapseRiskScore: true,
          assignedOfficerId: true,
          assignedOfficer: { select: { name: true } },
        },
      });

      const rebalancePreview = generateRebalanceSuggestions({
        officers: metrics.officerMetrics,
        constituents: constituentsForRebalance.map((c) => ({
          id: c.id,
          displayName: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown",
          estimatedCapacity: c.estimatedCapacity ? Number(c.estimatedCapacity) : null,
          priorityScore: c.priorityScore ? Number(c.priorityScore) : null,
          lapseRiskScore: c.lapseRiskScore ? Number(c.lapseRiskScore) : null,
          currentOfficerId: c.assignedOfficerId!,
          currentOfficerName: c.assignedOfficer?.name || null,
        })),
        alerts: imbalanceAlerts,
        maxTransfersPerOfficer: 5,
      });

      suggestions = rebalancePreview.suggestions.map((s) => ({
        constituentId: s.constituentId,
        constituentName: s.constituentName,
        fromOfficerId: s.fromOfficerId,
        fromOfficerName: s.fromOfficerName,
        toOfficerId: s.toOfficerId,
        toOfficerName: s.toOfficerName,
        reason: s.reason,
      }));
    }

    // Use simpler balance analysis for backward compatibility
    const balance = analyzePortfolioBalance(
      officers.map((o) => ({
        id: o.id,
        name: o.name,
        constituentCount: o.assignedConstituents.length,
      }))
    );

    return {
      officers: metrics.officerMetrics.map((o) => ({
        id: o.officerId,
        name: o.officerName,
        constituentCount: o.constituentCount,
        totalCapacity: o.totalCapacity,
        averageCapacity: o.averageCapacity,
        highPriorityCount: o.highPriorityCount,
        highRiskCount: o.highRiskCount,
        workloadScore: o.workloadScore,
      })),
      totalConstituents,
      unassigned: metrics.unassignedConstituents,
      unassignedCapacity: metrics.unassignedCapacity,
      imbalances: balance.issues,
      imbalanceAlerts,
      imbalanceResult: {
        hasImbalances: imbalanceResult.hasImbalances,
        overallSeverity: imbalanceResult.overallSeverity,
        sizeImbalance: imbalanceResult.sizeImbalance,
        capacityImbalance: imbalanceResult.capacityImbalance,
      },
      suggestions,
      capacityDistribution: metrics.capacityDistribution,
      stats: {
        averagePortfolioSize: metrics.averagePortfolioSize,
        minPortfolioSize: metrics.distribution.minSize,
        maxPortfolioSize: metrics.distribution.maxSize,
        medianPortfolioSize: metrics.distribution.medianSize,
        standardDeviation: metrics.distribution.standardDeviation,
        coefficientOfVariation: metrics.distribution.coefficientOfVariation,
        isBalanced: metrics.isBalanced,
        totalCapacity: metrics.totalCapacity,
        assignedCapacity: metrics.assignedCapacity,
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
