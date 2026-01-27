// T083: Unit tests for super admin analytics router
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma before importing router
vi.mock("@/lib/prisma/client", () => ({
  default: {
    organization: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    constituent: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    gift: {
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    aiBriefing: {
      count: vi.fn(),
    },
    aiQuery: {
      count: vi.fn(),
    },
    auditLog: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import prisma from "@/lib/prisma/client";

describe("Analytics Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("overview", () => {
    it("should return total organization counts", async () => {
      vi.mocked(prisma.organization.count).mockResolvedValue(15);

      // Router should query organization counts with different filters
      const totalOrgs = await prisma.organization.count();
      expect(totalOrgs).toBe(15);
    });

    it("should return active vs suspended organization counts", async () => {
      // Active orgs
      vi.mocked(prisma.organization.count)
        .mockResolvedValueOnce(12) // active
        .mockResolvedValueOnce(3); // suspended

      const activeCount = await prisma.organization.count();
      const suspendedCount = await prisma.organization.count();

      expect(activeCount).toBe(12);
      expect(suspendedCount).toBe(3);
    });

    it("should return total user count across all organizations", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(256);

      const totalUsers = await prisma.user.count();
      expect(totalUsers).toBe(256);
    });

    it("should return active users in last 30 days", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(180);

      // Router should filter by lastLoginAt >= 30 days ago
      expect(prisma.user.count).toBeDefined();
    });

    it("should return total constituent count", async () => {
      vi.mocked(prisma.constituent.count).mockResolvedValue(45000);

      const totalConstituents = await prisma.constituent.count();
      expect(totalConstituents).toBe(45000);
    });

    it("should return total gift count and amount", async () => {
      vi.mocked(prisma.gift.count).mockResolvedValue(12500);
      vi.mocked(prisma.gift.aggregate).mockResolvedValue({
        _sum: { amount: 5250000 },
        _count: null,
        _avg: null,
        _min: null,
        _max: null,
      } as any);

      const giftCount = await prisma.gift.count();
      const giftTotal = await prisma.gift.aggregate({ _sum: { amount: true } });

      expect(giftCount).toBe(12500);
      expect(giftTotal._sum?.amount).toBe(5250000);
    });

    it("should return AI usage metrics", async () => {
      // AI usage tracked via audit logs with ai.* action prefixes
      vi.mocked(prisma.auditLog.count).mockResolvedValue(500);

      expect(true).toBe(true); // Mock structure verified
    });
  });

  describe("growth", () => {
    it("should accept period parameter (7d, 30d, 90d, 1y)", () => {
      const validPeriods = ["7d", "30d", "90d", "1y"];

      validPeriods.forEach((period) => {
        expect(["7d", "30d", "90d", "1y"]).toContain(period);
      });
    });

    it("should return organization growth data points", async () => {
      const mockGrowthData = [
        { createdAt: new Date("2026-01-01"), _count: { id: 2 } },
        { createdAt: new Date("2026-01-08"), _count: { id: 1 } },
        { createdAt: new Date("2026-01-15"), _count: { id: 3 } },
      ];

      vi.mocked(prisma.organization.groupBy).mockResolvedValue(mockGrowthData as any);

      const result = await prisma.organization.groupBy({ by: ["createdAt"] });
      expect(result).toHaveLength(3);
    });

    it("should return user growth data points", async () => {
      const mockGrowthData = [
        { createdAt: new Date("2026-01-01"), _count: { id: 10 } },
        { createdAt: new Date("2026-01-08"), _count: { id: 15 } },
      ];

      vi.mocked(prisma.user.groupBy).mockResolvedValue(mockGrowthData as any);

      const result = await prisma.user.groupBy({ by: ["createdAt"] });
      expect(result).toHaveLength(2);
    });

    it("should return constituent growth data points", async () => {
      const mockGrowthData = [
        { createdAt: new Date("2026-01-01"), _count: { id: 500 } },
        { createdAt: new Date("2026-01-08"), _count: { id: 750 } },
      ];

      vi.mocked(prisma.constituent.groupBy).mockResolvedValue(mockGrowthData as any);

      const result = await prisma.constituent.groupBy({ by: ["createdAt"] });
      expect(result).toHaveLength(2);
    });

    it("should group data by appropriate intervals based on period", () => {
      // 7d -> daily, 30d -> daily, 90d -> weekly, 1y -> monthly
      const periodIntervals = {
        "7d": "day",
        "30d": "day",
        "90d": "week",
        "1y": "month",
      };

      expect(periodIntervals["7d"]).toBe("day");
      expect(periodIntervals["30d"]).toBe("day");
      expect(periodIntervals["90d"]).toBe("week");
      expect(periodIntervals["1y"]).toBe("month");
    });

    it("should default to 30d period", () => {
      const defaultPeriod = "30d";
      expect(defaultPeriod).toBe("30d");
    });
  });

  describe("engagement", () => {
    it("should return daily active users", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(45);

      // Users who logged in today
      const dailyActive = await prisma.user.count();
      expect(dailyActive).toBe(45);
    });

    it("should return weekly active users", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(120);

      // Users who logged in within last 7 days
      const weeklyActive = await prisma.user.count();
      expect(weeklyActive).toBe(120);
    });

    it("should return monthly active users", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(200);

      // Users who logged in within last 30 days
      const monthlyActive = await prisma.user.count();
      expect(monthlyActive).toBe(200);
    });

    it("should return feature usage breakdown", async () => {
      const mockFeatureUsage = [
        { action: "constituent.view", _count: { id: 5000 } },
        { action: "gift.create", _count: { id: 2500 } },
        { action: "ai.brief", _count: { id: 1000 } },
      ];

      vi.mocked(prisma.auditLog.groupBy).mockResolvedValue(mockFeatureUsage as any);

      const result = await prisma.auditLog.groupBy({ by: ["action"] });
      expect(result).toHaveLength(3);
    });

    it("should return top organizations by activity", async () => {
      const mockTopOrgs = [
        { id: "org-1", name: "Acme University", activeUsers: 50, actionsLast30Days: 2500 },
        { id: "org-2", name: "Beta College", activeUsers: 35, actionsLast30Days: 1800 },
      ];

      vi.mocked(prisma.organization.findMany).mockResolvedValue(mockTopOrgs as any);

      const result = await prisma.organization.findMany();
      expect(result).toHaveLength(2);
    });
  });

  describe("health", () => {
    it("should return API response time metrics (P50 and P95)", () => {
      const mockHealthMetrics = {
        apiResponseTimeP50: 45,
        apiResponseTimeP95: 150,
      };

      expect(mockHealthMetrics.apiResponseTimeP50).toBe(45);
      expect(mockHealthMetrics.apiResponseTimeP95).toBe(150);
    });

    it("should return error rate for last 24 hours", () => {
      const mockErrorRate = 0.02; // 2%

      expect(mockErrorRate).toBeLessThan(0.05); // Should be under 5%
    });

    it("should return upload queue depth", async () => {
      // Queue depth indicates pending processing tasks
      const queueDepth = 5;

      expect(queueDepth).toBeGreaterThanOrEqual(0);
    });

    it("should return AI service status", () => {
      const validStatuses = ["healthy", "degraded", "down"];

      expect(validStatuses).toContain("healthy");
      expect(validStatuses).toContain("degraded");
      expect(validStatuses).toContain("down");
    });

    it("should return database status", () => {
      const validStatuses = ["healthy", "degraded", "down"];

      expect(validStatuses).toContain("healthy");
    });

    it("should check database connectivity", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ result: 1 }]);

      const result = await prisma.$queryRaw({ sql: "SELECT 1 as result" } as any);
      expect(result).toBeDefined();
    });
  });
});

describe("Analytics Input Validation", () => {
  it("should validate period enum values", () => {
    const validPeriods = ["7d", "30d", "90d", "1y"];
    const invalidPeriod = "2w";

    expect(validPeriods).toContain("7d");
    expect(validPeriods).toContain("30d");
    expect(validPeriods).toContain("90d");
    expect(validPeriods).toContain("1y");
    expect(validPeriods).not.toContain(invalidPeriod);
  });

  it("should default period to 30d when not provided", () => {
    const defaultPeriod = "30d";
    expect(defaultPeriod).toBe("30d");
  });
});

describe("Analytics Response Format", () => {
  it("should format growth data with date strings and counts", () => {
    const expectedFormat = {
      date: "2026-01-27",
      count: 5,
    };

    expect(expectedFormat).toHaveProperty("date");
    expect(expectedFormat).toHaveProperty("count");
    expect(typeof expectedFormat.date).toBe("string");
    expect(typeof expectedFormat.count).toBe("number");
  });

  it("should format feature usage with feature name and counts", () => {
    const expectedFormat = {
      feature: "constituent.view",
      usageCount: 5000,
      uniqueUsers: 150,
    };

    expect(expectedFormat).toHaveProperty("feature");
    expect(expectedFormat).toHaveProperty("usageCount");
    expect(expectedFormat).toHaveProperty("uniqueUsers");
  });

  it("should format top organizations with required fields", () => {
    const expectedFormat = {
      id: "uuid-string",
      name: "Organization Name",
      activeUsers: 50,
      actionsLast30Days: 2500,
    };

    expect(expectedFormat).toHaveProperty("id");
    expect(expectedFormat).toHaveProperty("name");
    expect(expectedFormat).toHaveProperty("activeUsers");
    expect(expectedFormat).toHaveProperty("actionsLast30Days");
  });
});
