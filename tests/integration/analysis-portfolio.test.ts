// T236: Integration tests for portfolio metrics procedures
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";
import { type Context } from "@/server/trpc/context";
import { PrismaClient } from "@prisma/client";

// Mock Prisma client
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    constituent: {
      count: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    gift: {
      aggregate: vi.fn(),
    },
    contact: {
      count: vi.fn(),
    },
  },
}));

// Helper to generate mock constituents for portfolio assignments
const generateMockConstituents = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `const-${i}`,
    estimatedCapacity: 100000,
    priorityScore: 0.7,
    lapseRiskScore: 0.3,
  }));

const createMockContext = (overrides: Partial<Context> = {}): Context => {
  const mockPrisma = {
    user: {
      findMany: vi.fn().mockResolvedValue([
        { id: "o1", name: "Officer 1", assignedConstituents: generateMockConstituents(50) },
        { id: "o2", name: "Officer 2", assignedConstituents: generateMockConstituents(45) },
      ]),
    },
    constituent: {
      count: vi.fn().mockResolvedValue(120),
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({
        _sum: { estimatedCapacity: 5000000 },
        _avg: { priorityScore: 0.6, lapseRiskScore: 0.4 },
      }),
    },
    gift: {
      aggregate: vi.fn().mockResolvedValue({
        _sum: { amount: 1000000 },
      }),
    },
    contact: {
      count: vi.fn().mockResolvedValue(200),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
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
    withOrgFilter: <T extends { organizationId?: string }>(where?: T) =>
      ({ ...where, organizationId: "22222222-2222-4222-a222-222222222222" }) as T & { organizationId: string },
    withOrgCreate: <T extends object>(data: T) =>
      ({ ...data, organizationId: "22222222-2222-4222-a222-222222222222" }) as T & { organizationId: string },
    organizationId: "22222222-2222-4222-a222-222222222222",
    ...overrides,
  };
};

describe("Portfolio Metrics Integration Tests", () => {
  const createCaller = createCallerFactory(appRouter);
  let ctx: Context;
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-26T12:00:00Z"));
    ctx = createMockContext();
    caller = createCaller(ctx);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("getPortfolioMetrics", () => {
    it("returns portfolio metrics with officer data", async () => {
      const result = await caller.analysis.getPortfolioMetrics();

      expect(result).toHaveProperty("officers");
      expect(result).toHaveProperty("totalConstituents");
      expect(result).toHaveProperty("unassigned");
      expect(result).toHaveProperty("imbalances");
      expect(result).toHaveProperty("stats");
    });

    it("returns officer list with constituent counts", async () => {
      const result = await caller.analysis.getPortfolioMetrics();

      expect(Array.isArray(result.officers)).toBe(true);
      result.officers.forEach((officer: { id: string; name: string | null; constituentCount: number }) => {
        expect(officer).toHaveProperty("id");
        expect(officer).toHaveProperty("name");
        expect(officer).toHaveProperty("constituentCount");
        expect(typeof officer.constituentCount).toBe("number");
      });
    });

    it("calculates unassigned constituents correctly", async () => {
      // Mock: 120 total, 95 assigned (50 + 45)
      (ctx.prisma.constituent.count as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(120) // total
        .mockResolvedValueOnce(25); // unassigned

      const result = await caller.analysis.getPortfolioMetrics();

      expect(result.totalConstituents).toBe(120);
      expect(result.unassigned).toBeGreaterThanOrEqual(0);
    });

    it("returns stats with portfolio balance metrics", async () => {
      const result = await caller.analysis.getPortfolioMetrics();

      expect(result.stats).toHaveProperty("averagePortfolioSize");
      expect(result.stats).toHaveProperty("minPortfolioSize");
      expect(result.stats).toHaveProperty("maxPortfolioSize");
      expect(result.stats).toHaveProperty("isBalanced");
      expect(typeof result.stats.averagePortfolioSize).toBe("number");
      expect(typeof result.stats.isBalanced).toBe("boolean");
    });

    it("detects imbalances when portfolios vary significantly", async () => {
      // Mock imbalanced portfolios
      (ctx.prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "o1", name: "Heavy Officer", assignedConstituents: generateMockConstituents(150) },
        { id: "o2", name: "Light Officer", assignedConstituents: generateMockConstituents(20) },
        { id: "o3", name: "Medium Officer", assignedConstituents: generateMockConstituents(50) },
      ]);

      const result = await caller.analysis.getPortfolioMetrics();

      // Should detect imbalance
      expect(result.stats.isBalanced).toBe(false);
      expect(result.imbalances.length).toBeGreaterThan(0);
    });

    it("returns no imbalances for balanced portfolios", async () => {
      // Mock balanced portfolios
      (ctx.prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "o1", name: "Officer 1", assignedConstituents: generateMockConstituents(48) },
        { id: "o2", name: "Officer 2", assignedConstituents: generateMockConstituents(52) },
        { id: "o3", name: "Officer 3", assignedConstituents: generateMockConstituents(50) },
      ]);

      const result = await caller.analysis.getPortfolioMetrics();

      expect(result.stats.isBalanced).toBe(true);
    });

    it("handles empty organization", async () => {
      (ctx.prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (ctx.prisma.constituent.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await caller.analysis.getPortfolioMetrics();

      expect(result.officers).toHaveLength(0);
      expect(result.totalConstituents).toBe(0);
      expect(result.unassigned).toBe(0);
    });

    it("requires authentication", async () => {
      const unauthenticatedCaller = createCaller({
        ...ctx,
        session: null,
      } as unknown as Context);

      await expect(unauthenticatedCaller.analysis.getPortfolioMetrics()).rejects.toThrow();
    });

    it("handles single officer", async () => {
      (ctx.prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "o1", name: "Solo Officer", assignedConstituents: generateMockConstituents(100) },
      ]);
      (ctx.prisma.constituent.count as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(0); // unassigned

      const result = await caller.analysis.getPortfolioMetrics();

      expect(result.officers).toHaveLength(1);
      expect(result.stats.isBalanced).toBe(true); // Single officer is always "balanced"
    });
  });

  describe("Portfolio Metrics Edge Cases", () => {
    it("handles null officer names", async () => {
      (ctx.prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "o1", name: null, assignedConstituents: generateMockConstituents(50) },
        { id: "o2", name: "Named Officer", assignedConstituents: generateMockConstituents(45) },
      ]);

      const result = await caller.analysis.getPortfolioMetrics();

      expect(result.officers[0]?.name).toBeNull();
      expect(result.officers[1]?.name).toBe("Named Officer");
    });

    it("calculates correct average portfolio size", async () => {
      (ctx.prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "o1", name: "Officer 1", assignedConstituents: generateMockConstituents(30) },
        { id: "o2", name: "Officer 2", assignedConstituents: generateMockConstituents(40) },
        { id: "o3", name: "Officer 3", assignedConstituents: generateMockConstituents(50) },
      ]);

      const result = await caller.analysis.getPortfolioMetrics();

      // Average should be (30 + 40 + 50) / 3 = 40
      expect(result.stats.averagePortfolioSize).toBeCloseTo(40, 0);
    });

    it("calculates min and max portfolio sizes", async () => {
      (ctx.prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "o1", name: "Officer 1", assignedConstituents: generateMockConstituents(25) },
        { id: "o2", name: "Officer 2", assignedConstituents: generateMockConstituents(75) },
        { id: "o3", name: "Officer 3", assignedConstituents: generateMockConstituents(50) },
      ]);

      const result = await caller.analysis.getPortfolioMetrics();

      expect(result.stats.minPortfolioSize).toBe(25);
      expect(result.stats.maxPortfolioSize).toBe(75);
    });

    it("includes suggestions for rebalancing when imbalanced", async () => {
      (ctx.prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "o1", name: "Overloaded Officer", assignedConstituents: generateMockConstituents(200) },
        { id: "o2", name: "Underloaded Officer", assignedConstituents: generateMockConstituents(20) },
      ]);

      const result = await caller.analysis.getPortfolioMetrics();

      expect(result).toHaveProperty("suggestions");
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe("Access Control", () => {
    it("allows admin to view portfolio metrics", async () => {
      ctx = createMockContext({
        session: {
          user: {
            id: "ad1ad1ad-1ad1-4ad1-aad1-ad1ad1ad1ad1",
            organizationId: "22222222-2222-4222-a222-222222222222",
            email: "admin@example.com",
            role: "admin",
            name: "Admin User",
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      caller = createCaller(ctx);

      const result = await caller.analysis.getPortfolioMetrics();
      expect(result).toBeDefined();
    });

    it("allows manager to view portfolio metrics", async () => {
      ctx = createMockContext({
        session: {
          user: {
            id: "0a0a0a0a-0a0a-40a0-a0a0-0a0a0a0a0a0a",
            organizationId: "22222222-2222-4222-a222-222222222222",
            email: "manager@example.com",
            role: "manager",
            name: "Manager User",
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      caller = createCaller(ctx);

      const result = await caller.analysis.getPortfolioMetrics();
      expect(result).toBeDefined();
    });

    it("allows gift officer to view portfolio metrics", async () => {
      ctx = createMockContext({
        session: {
          user: {
            id: "0b0b0b0b-0b0b-40b0-a0b0-0b0b0b0b0b0b",
            organizationId: "22222222-2222-4222-a222-222222222222",
            email: "mgo@example.com",
            role: "gift_officer",
            name: "Gift Officer",
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      caller = createCaller(ctx);

      const result = await caller.analysis.getPortfolioMetrics();
      expect(result).toBeDefined();
    });
  });
});
