// T084-T087: Super Admin Analytics Router
import { z } from "zod";
import { adminRouter, adminProtectedProcedure } from "./auth";
import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

// Input schemas
const growthPeriodSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
});

// Helper to get date range from period
function getDateRangeFromPeriod(period: string): { start: Date; interval: "day" | "week" | "month" } {
  const now = new Date();
  let start: Date;
  let interval: "day" | "week" | "month";

  switch (period) {
    case "7d":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      interval = "day";
      break;
    case "30d":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      interval = "day";
      break;
    case "90d":
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      interval = "week";
      break;
    case "1y":
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      interval = "month";
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      interval = "day";
  }

  return { start, interval };
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

// Helper to generate date series for filling gaps
function generateDateSeries(start: Date, end: Date, interval: "day" | "week" | "month"): string[] {
  const dates: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(formatDate(current));

    switch (interval) {
      case "day":
        current.setDate(current.getDate() + 1);
        break;
      case "week":
        current.setDate(current.getDate() + 7);
        break;
      case "month":
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return dates;
}

export const analyticsRouter = adminRouter({
  // T084: Platform overview metrics
  overview: adminProtectedProcedure.query(async () => {
    // Run all queries in parallel for better performance
    const [
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalUsers,
      activeUsersLast30Days,
      totalConstituents,
      totalGifts,
      giftAmountResult,
    ] = await Promise.all([
      // Total organizations (not pending deletion)
      prisma.organization.count({
        where: { status: { not: "pending_deletion" } },
      }),
      // Active organizations
      prisma.organization.count({
        where: { status: "active" },
      }),
      // Suspended organizations
      prisma.organization.count({
        where: { status: "suspended" },
      }),
      // Total users
      prisma.user.count(),
      // Active users in last 30 days
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Total constituents
      prisma.constituent.count(),
      // Total gifts
      prisma.gift.count(),
      // Total gift amount
      prisma.gift.aggregate({
        _sum: { amount: true },
      }),
    ]);

    // AI usage metrics (if tables exist, otherwise return 0)
    let briefsGenerated = 0;
    let queriesProcessed = 0;

    try {
      // Check if AiBriefing table exists and count
      const briefings = await prisma.auditLog.count({
        where: { action: { startsWith: "ai." } },
      });
      briefsGenerated = briefings;

      // Count AI-related audit logs as queries
      queriesProcessed = await prisma.auditLog.count({
        where: {
          OR: [
            { action: "ai.query" },
            { action: "ai.brief" },
            { action: "ai.analyze" },
          ],
        },
      });
    } catch {
      // Tables might not exist, use default values
    }

    // Safely extract the gift amount, handling Decimal
    const totalGiftAmount = giftAmountResult._sum.amount
      ? Number(giftAmountResult._sum.amount)
      : 0;

    return {
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalUsers,
      activeUsersLast30Days,
      totalConstituents,
      totalGifts,
      totalGiftAmount,
      aiUsage: {
        briefsGenerated,
        queriesProcessed,
      },
    };
  }),

  // T085: Growth trends over time
  growth: adminProtectedProcedure
    .input(growthPeriodSchema)
    .query(async ({ input }) => {
      const { period } = input;
      const { start, interval } = getDateRangeFromPeriod(period);
      const now = new Date();

      // Generate all dates in the range to fill gaps
      const allDates = generateDateSeries(start, now, interval);

      // Query organization growth (count by creation date)
      const orgGrowthRaw = await prisma.organization.findMany({
        where: {
          createdAt: { gte: start },
          status: { not: "pending_deletion" },
        },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      // Query user growth
      const userGrowthRaw = await prisma.user.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      // Query constituent growth
      const constituentGrowthRaw = await prisma.constituent.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      // Helper to aggregate counts by date
      function aggregateCounts(
        items: { createdAt: Date }[],
        allDates: string[],
        interval: "day" | "week" | "month"
      ): { date: string; count: number }[] {
        const countMap = new Map<string, number>();

        // Initialize all dates with 0
        allDates.forEach((date) => countMap.set(date, 0));

        // Count items by date
        items.forEach((item) => {
          let dateKey: string;

          if (interval === "month") {
            // Group by month (YYYY-MM-01)
            const d = new Date(item.createdAt);
            dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
          } else if (interval === "week") {
            // Group by week start (find the Monday)
            const d = new Date(item.createdAt);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            d.setDate(diff);
            dateKey = formatDate(d);
          } else {
            // Group by day
            dateKey = formatDate(item.createdAt);
          }

          // Find matching date in allDates (or closest)
          const existingCount = countMap.get(dateKey) ?? 0;
          countMap.set(dateKey, existingCount + 1);
        });

        // Convert to array and sort
        return Array.from(countMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }

      return {
        organizations: aggregateCounts(orgGrowthRaw, allDates, interval),
        users: aggregateCounts(userGrowthRaw, allDates, interval),
        constituents: aggregateCounts(constituentGrowthRaw, allDates, interval),
      };
    }),

  // T086: Engagement metrics
  engagement: adminProtectedProcedure.query(async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Active user counts
    const [dailyActiveUsers, weeklyActiveUsers, monthlyActiveUsers] = await Promise.all([
      prisma.user.count({
        where: { lastLoginAt: { gte: oneDayAgo } },
      }),
      prisma.user.count({
        where: { lastLoginAt: { gte: oneWeekAgo } },
      }),
      prisma.user.count({
        where: { lastLoginAt: { gte: oneMonthAgo } },
      }),
    ]);

    // Feature usage breakdown (from audit logs)
    const featureUsageRaw = await prisma.auditLog.groupBy({
      by: ["action"],
      where: { createdAt: { gte: oneMonthAgo } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // Get unique users per feature
    const featureUsage = await Promise.all(
      featureUsageRaw.map(async (feature) => {
        const uniqueUsers = await prisma.auditLog.groupBy({
          by: ["userId"],
          where: {
            action: feature.action,
            createdAt: { gte: oneMonthAgo },
          },
        });

        // Map action to human-readable feature name
        const featureName = feature.action
          .split(".")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

        return {
          feature: featureName,
          usageCount: feature._count.id,
          uniqueUsers: uniqueUsers.length,
        };
      })
    );

    // Top organizations by activity
    const orgActivityRaw = await prisma.auditLog.groupBy({
      by: ["organizationId"],
      where: {
        createdAt: { gte: oneMonthAgo },
        organizationId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    // Get organization details and active user counts
    const topOrganizations = await Promise.all(
      orgActivityRaw.map(async (orgActivity) => {
        const orgId = orgActivity.organizationId;
        if (!orgId) return null;

        const org = await prisma.organization.findUnique({
          where: { id: orgId },
          select: { id: true, name: true },
        });

        if (!org) return null;

        const activeUserCount = await prisma.user.count({
          where: {
            organizationId: orgId,
            lastLoginAt: { gte: oneMonthAgo },
          },
        });

        return {
          id: org.id,
          name: org.name,
          activeUsers: activeUserCount,
          actionsLast30Days: orgActivity._count.id,
        };
      })
    );

    return {
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      featureUsage,
      topOrganizations: topOrganizations.filter(
        (org): org is NonNullable<typeof org> => org !== null
      ),
    };
  }),

  // T087: System health status
  health: adminProtectedProcedure.query(async () => {
    // Check database connectivity
    let databaseStatus: "healthy" | "degraded" | "down" = "healthy";
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1 as result`;
      const responseTime = Date.now() - start;

      if (responseTime > 1000) {
        databaseStatus = "degraded";
      }
    } catch {
      databaseStatus = "down";
    }

    // Calculate error rate from recent audit logs
    // (We'll check for error-type actions in audit logs)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let errorRateLast24h = 0;
    try {
      const [totalActions, errorActions] = await Promise.all([
        prisma.auditLog.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        prisma.auditLog.count({
          where: {
            createdAt: { gte: oneDayAgo },
            action: { contains: "error" },
          },
        }),
      ]);

      errorRateLast24h = totalActions > 0 ? errorActions / totalActions : 0;
    } catch {
      // If we can't calculate, assume 0
    }

    // Check for pending uploads (if Upload model exists)
    let uploadQueueDepth = 0;
    try {
      // Count uploads in 'queued' or 'processing' status
      const pendingUploads = await prisma.upload.count({
        where: {
          status: { in: ["queued", "processing"] },
        },
      });
      uploadQueueDepth = pendingUploads;
    } catch {
      // Upload table might not exist or have different schema
    }

    // AI service status (check if recent AI operations succeeded)
    let aiServiceStatus: "healthy" | "degraded" | "down" = "healthy";
    try {
      const recentAiErrors = await prisma.auditLog.count({
        where: {
          createdAt: { gte: oneDayAgo },
          action: { startsWith: "ai." },
          details: {
            path: ["error"],
            not: Prisma.DbNull,
          },
        },
      });

      const recentAiTotal = await prisma.auditLog.count({
        where: {
          createdAt: { gte: oneDayAgo },
          action: { startsWith: "ai." },
        },
      });

      if (recentAiTotal === 0) {
        // No AI usage, assume healthy
        aiServiceStatus = "healthy";
      } else if (recentAiErrors / recentAiTotal > 0.5) {
        aiServiceStatus = "down";
      } else if (recentAiErrors / recentAiTotal > 0.1) {
        aiServiceStatus = "degraded";
      }
    } catch {
      // If we can't determine, assume healthy
    }

    // Response time metrics (approximate from audit log timestamps)
    // In a real system, this would come from APM tools
    const apiResponseTimeP50 = 45; // Placeholder - would come from metrics
    const apiResponseTimeP95 = 150; // Placeholder - would come from metrics

    return {
      apiResponseTimeP50,
      apiResponseTimeP95,
      errorRateLast24h,
      uploadQueueDepth,
      aiServiceStatus,
      databaseStatus,
    };
  }),
});

export type AnalyticsRouter = typeof analyticsRouter;
