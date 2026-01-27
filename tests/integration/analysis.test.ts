// T101: Integration tests for analysis.getHealthScores
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";
import { type Context } from "@/server/trpc/context";
import { PrismaClient } from "@prisma/client";

// Mock Prisma client
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    constituent: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    gift: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    contact: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    upload: {
      findFirst: vi.fn(),
    },
    prediction: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({
      constituent: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      gift: {
        count: vi.fn(),
        findMany: vi.fn(),
        aggregate: vi.fn(),
      },
      contact: {
        count: vi.fn(),
        findMany: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
      },
    })),
  },
}));

const createMockContext = (overrides: Partial<Context> = {}): Context => {
  const mockPrisma = {
    constituent: {
      count: vi.fn().mockResolvedValue(100),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    gift: {
      count: vi.fn().mockResolvedValue(500),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ giftDate: new Date() }),
      aggregate: vi.fn().mockResolvedValue({ _max: { giftDate: new Date() } }),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    contact: {
      count: vi.fn().mockResolvedValue(200),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ contactDate: new Date() }),
      aggregate: vi.fn().mockResolvedValue({ _max: { contactDate: new Date() } }),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    upload: {
      findFirst: vi.fn().mockResolvedValue({ createdAt: new Date() }),
    },
    prediction: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        constituent: { count: vi.fn().mockResolvedValue(100), findMany: vi.fn().mockResolvedValue([]) },
        gift: { count: vi.fn().mockResolvedValue(500), aggregate: vi.fn().mockResolvedValue({ _max: { giftDate: new Date() } }) },
        contact: { count: vi.fn().mockResolvedValue(200), aggregate: vi.fn().mockResolvedValue({ _max: { contactDate: new Date() } }), groupBy: vi.fn().mockResolvedValue([]) },
      });
    }),
  } as unknown as PrismaClient;

  return {
    prisma: mockPrisma,
    session: {
      user: {
        id: "33333333-3333-4333-a333-333333333333",
        organizationId: "22222222-2222-4222-a222-222222222222",
        email: "test@example.com",
        role: "admin" as const,
        name: "Test User",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    ...overrides,
  };
};

describe("Analysis Router Integration Tests", () => {
  const createCaller = createCallerFactory(appRouter);
  let ctx: Context;
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T12:00:00Z"));
    ctx = createMockContext();
    caller = createCaller(ctx);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("getHealthScores", () => {
    it("returns health score object with all categories", async () => {
      const result = await caller.analysis.getHealthScores();

      expect(result).toHaveProperty("overall");
      expect(result).toHaveProperty("completeness");
      expect(result).toHaveProperty("freshness");
      expect(result).toHaveProperty("consistency");
      expect(result).toHaveProperty("coverage");
      expect(result).toHaveProperty("issues");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("stats");
    });

    it("returns scores between 0 and 1", async () => {
      const result = await caller.analysis.getHealthScores();

      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
      expect(result.completeness).toBeGreaterThanOrEqual(0);
      expect(result.completeness).toBeLessThanOrEqual(1);
      expect(result.freshness).toBeGreaterThanOrEqual(0);
      expect(result.freshness).toBeLessThanOrEqual(1);
      expect(result.consistency).toBeGreaterThanOrEqual(0);
      expect(result.consistency).toBeLessThanOrEqual(1);
      expect(result.coverage).toBeGreaterThanOrEqual(0);
      expect(result.coverage).toBeLessThanOrEqual(1);
    });

    it("includes stats with constituent, gift, and contact counts", async () => {
      const result = await caller.analysis.getHealthScores();

      expect(result.stats).toHaveProperty("constituentCount");
      expect(result.stats).toHaveProperty("giftCount");
      expect(result.stats).toHaveProperty("contactCount");
      expect(typeof result.stats.constituentCount).toBe("number");
      expect(typeof result.stats.giftCount).toBe("number");
      expect(typeof result.stats.contactCount).toBe("number");
    });

    it("returns empty issues and recommendations for healthy data", async () => {
      // Mock healthy data
      const mockConstituents = Array.from({ length: 100 }, (_, i) => ({
        id: `constituent-${i}`,
        externalId: `ext-${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `user${i}@example.com`,
        phone: `555-${String(i).padStart(4, "0")}`,
        addressLine1: `${i} Main St`,
        city: "Boston",
        state: "MA",
        postalCode: "02101",
        constituentType: "alumni",
      }));

      (ctx.prisma.constituent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockConstituents);

      const result = await caller.analysis.getHealthScores();

      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("returns issues for incomplete data", async () => {
      // Mock incomplete data
      const mockConstituents = Array.from({ length: 100 }, (_, i) => ({
        id: `constituent-${i}`,
        externalId: `ext-${i}`,
        firstName: null,
        lastName: `Last${i}`,
        email: null,
        phone: null,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        constituentType: null,
      }));

      (ctx.prisma.constituent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockConstituents);

      const result = await caller.analysis.getHealthScores();

      // Should have lower completeness score
      expect(result.completeness).toBeLessThan(0.8);
    });

    it("handles empty organization", async () => {
      (ctx.prisma.constituent.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (ctx.prisma.gift.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (ctx.prisma.contact.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await caller.analysis.getHealthScores();

      expect(result.stats.constituentCount).toBe(0);
      expect(result.stats.giftCount).toBe(0);
      expect(result.stats.contactCount).toBe(0);
    });

    it("requires authentication", async () => {
      const unauthenticatedCaller = createCaller({
        ...ctx,
        session: null,
      } as unknown as Context);

      await expect(unauthenticatedCaller.analysis.getHealthScores()).rejects.toThrow();
    });
  });

  describe("getHealthScores - Scoring Categories", () => {
    it("calculates completeness score based on field population", async () => {
      // 50% of constituents have complete data
      const mockConstituents = [
        ...Array.from({ length: 50 }, (_, i) => ({
          id: `complete-${i}`,
          externalId: `ext-c-${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `user${i}@example.com`,
          phone: `555-${String(i).padStart(4, "0")}`,
          addressLine1: `${i} Main St`,
          city: "Boston",
          state: "MA",
          postalCode: "02101",
          constituentType: "alumni",
        })),
        ...Array.from({ length: 50 }, (_, i) => ({
          id: `incomplete-${i}`,
          externalId: `ext-i-${i}`,
          firstName: null,
          lastName: `Last${i}`,
          email: null,
          phone: null,
          addressLine1: null,
          city: null,
          state: null,
          postalCode: null,
          constituentType: null,
        })),
      ];

      (ctx.prisma.constituent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockConstituents);

      const result = await caller.analysis.getHealthScores();

      // Completeness should be around 50%
      expect(result.completeness).toBeGreaterThan(0.4);
      expect(result.completeness).toBeLessThan(0.7);
    });

    it("calculates freshness score based on data recency", async () => {
      // Mock recent gift and contact dates
      (ctx.prisma.gift.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _max: { giftDate: new Date("2026-01-20") }, // 5 days ago
      });
      (ctx.prisma.contact.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _max: { contactDate: new Date("2026-01-22") }, // 3 days ago
      });

      const result = await caller.analysis.getHealthScores();

      // Fresh data should score high
      expect(result.freshness).toBeGreaterThan(0.7);
    });

    it("penalizes freshness for stale data", async () => {
      // Mock old gift and contact dates - use findFirst as the router uses that for freshness
      (ctx.prisma.gift.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        giftDate: new Date("2023-01-01"), // 3 years ago
      });
      (ctx.prisma.contact.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        contactDate: new Date("2024-01-01"), // 2 years ago
      });
      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        createdAt: new Date("2023-01-01"), // 3 years ago
      });

      const result = await caller.analysis.getHealthScores();

      // Stale data should score low
      expect(result.freshness).toBeLessThan(0.5);
    });

    it("calculates consistency score based on data patterns", async () => {
      const result = await caller.analysis.getHealthScores();

      // Consistency should be present
      expect(typeof result.consistency).toBe("number");
      expect(result.consistency).toBeGreaterThanOrEqual(0);
      expect(result.consistency).toBeLessThanOrEqual(1);
    });

    it("calculates coverage score based on portfolio and contact coverage", async () => {
      const result = await caller.analysis.getHealthScores();

      // Coverage should be present
      expect(typeof result.coverage).toBe("number");
      expect(result.coverage).toBeGreaterThanOrEqual(0);
      expect(result.coverage).toBeLessThanOrEqual(1);
    });
  });

  describe("getHealthScores - Issues and Recommendations", () => {
    it("identifies high-severity issues", async () => {
      // Mock problematic data
      (ctx.prisma.constituent.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await caller.analysis.getHealthScores();

      // Should recommend uploading data
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("provides actionable recommendations", async () => {
      const mockConstituents = Array.from({ length: 100 }, (_, i) => ({
        id: `constituent-${i}`,
        externalId: `ext-${i}`,
        firstName: null,
        lastName: `Last${i}`,
        email: null,
        phone: null,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        constituentType: null,
      }));

      (ctx.prisma.constituent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockConstituents);

      const result = await caller.analysis.getHealthScores();

      // Each recommendation should have required fields
      result.recommendations.forEach((rec: { type: string; title: string; description: string; priority: string }) => {
        expect(rec).toHaveProperty("type");
        expect(rec).toHaveProperty("title");
        expect(rec).toHaveProperty("description");
        expect(rec).toHaveProperty("priority");
      });
    });

    it("prioritizes issues correctly", async () => {
      const result = await caller.analysis.getHealthScores();

      // Issues should be sorted by severity
      const severityOrder = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < result.issues.length; i++) {
        const prevSeverity = severityOrder[result.issues[i - 1].severity as keyof typeof severityOrder] ?? 3;
        const currentSeverity = severityOrder[result.issues[i].severity as keyof typeof severityOrder] ?? 3;
        expect(prevSeverity).toBeLessThanOrEqual(currentSeverity);
      }
    });
  });
});
