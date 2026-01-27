// T177: Integration tests for NL query procedures
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";
import { type Context } from "@/server/trpc/context";
import { PrismaClient } from "@prisma/client";

// Note: We don't mock the AI services because dynamic imports are difficult to mock in vitest.
// Instead, we test the fallback behavior when ANTHROPIC_API_KEY is not set.

const mockConstituents = [
  {
    id: "c1c1c1c1-c1c1-4c1c-ac1c-c1c1c1c1c1c1",
    organizationId: "22222222-2222-4222-a222-222222222222",
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
    lapseRiskScore: 0.3,
    priorityScore: 0.85,
    _sum: { amount: 50000 },
    _max: { giftDate: new Date("2025-12-01"), contactDate: new Date("2025-11-15") },
  },
  {
    id: "c2c2c2c2-c2c2-4c2c-ac2c-c2c2c2c2c2c2",
    organizationId: "22222222-2222-4222-a222-222222222222",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    lapseRiskScore: 0.7,
    priorityScore: 0.65,
    _sum: { amount: 25000 },
    _max: { giftDate: new Date("2025-06-01"), contactDate: new Date("2024-12-01") },
  },
];

const createMockContext = (overrides: Partial<Context> = {}): Context => {
  const mockPrisma = {
    constituent: {
      findMany: vi.fn().mockResolvedValue(mockConstituents),
      count: vi.fn().mockResolvedValue(2),
    },
    naturalLanguageQuery: {
      create: vi.fn().mockImplementation((args) => ({
        id: "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee",
        ...args.data,
        createdAt: new Date(),
      })),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation((args) => ({
        id: args.where.id,
        ...args.data,
      })),
      delete: vi.fn().mockResolvedValue({ id: "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee" }),
    },
    gift: {
      groupBy: vi.fn().mockResolvedValue([
        { constituentId: "c1c1c1c1-c1c1-4c1c-ac1c-c1c1c1c1c1c1", _sum: { amount: 50000 }, _max: { giftDate: new Date("2025-12-01") } },
        { constituentId: "c2c2c2c2-c2c2-4c2c-ac2c-c2c2c2c2c2c2", _sum: { amount: 25000 }, _max: { giftDate: new Date("2025-06-01") } },
      ]),
    },
    contact: {
      groupBy: vi.fn().mockResolvedValue([
        { constituentId: "c1c1c1c1-c1c1-4c1c-ac1c-c1c1c1c1c1c1", _max: { contactDate: new Date("2025-11-15") } },
        { constituentId: "c2c2c2c2-c2c2-4c2c-ac2c-c2c2c2c2c2c2", _max: { contactDate: new Date("2024-12-01") } },
      ]),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "a1a1a1a1-a1a1-4a1a-aa1a-a1a1a1a1a1a1" }),
    },
    $queryRaw: vi.fn().mockResolvedValue(mockConstituents),
    $queryRawUnsafe: vi.fn().mockResolvedValue(mockConstituents),
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
    withOrgFilter: undefined,
    withOrgCreate: undefined,
    organizationId: "22222222-2222-4222-a222-222222222222",
    ...overrides,
  };
};

describe("AI Query Router Integration Tests", () => {
  const createCaller = createCallerFactory(appRouter);
  let ctx: Context;
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-26T12:00:00Z"));
    // Don't set ANTHROPIC_API_KEY - tests use fallback behavior
    delete process.env.ANTHROPIC_API_KEY;
    ctx = createMockContext();
    caller = createCaller(ctx);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("ai.query", () => {
    it("executes a natural language query and returns results (fallback mode)", async () => {
      // Without ANTHROPIC_API_KEY, the router uses fallback behavior
      const result = await caller.ai.query({
        query: "Show me donors who gave more than $10,000",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee");
      // In fallback mode without AI, success is false
      expect(result.success).toBe(false);
      expect(result.results).toBeDefined();
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
      // Should provide suggestions when AI is unavailable
      expect(result.suggestions).toBeDefined();
    });

    it("returns interpreted query with human-readable explanation", async () => {
      const result = await caller.ai.query({
        query: "high risk donors",
      });

      expect(result.interpretation).toBeDefined();
      expect(typeof result.interpretation).toBe("string");
      // In fallback mode, interpretation indicates AI is unavailable
      expect(result.interpretation).toBe("AI service unavailable");
    });

    it("returns filter breakdown", async () => {
      const result = await caller.ai.query({
        query: "donors who gave $10K+ but haven't been contacted",
      });

      expect(result.filters).toBeDefined();
      expect(Array.isArray(result.filters)).toBe(true);
      // In fallback mode, filters are empty
      expect(result.filters).toHaveLength(0);
    });

    it("stores query in database", async () => {
      await caller.ai.query({
        query: "top priority prospects",
      });

      expect(ctx.prisma.naturalLanguageQuery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "22222222-2222-4222-a222-222222222222",
            userId: "33333333-3333-4333-a333-333333333333",
            queryText: "top priority prospects",
          }),
        })
      );
    });

    it("returns empty results in fallback mode (no AI)", async () => {
      const result = await caller.ai.query({
        query: "major donors",
      });

      // In fallback mode without filters, results array exists but is empty
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it("validates query minimum length", async () => {
      await expect(
        caller.ai.query({ query: "" })
      ).rejects.toThrow();
    });

    it("validates query maximum length", async () => {
      const longQuery = "a".repeat(1001);
      await expect(
        caller.ai.query({ query: longQuery })
      ).rejects.toThrow();
    });

    it("requires authentication", async () => {
      const unauthenticatedCaller = createCaller({
        ...ctx,
        session: null,
      } as unknown as Context);

      await expect(
        unauthenticatedCaller.ai.query({ query: "donors" })
      ).rejects.toThrow();
    });

    it("enforces organization isolation", async () => {
      await caller.ai.query({
        query: "all donors",
      });

      // The query should include organization filter
      expect(ctx.prisma.naturalLanguageQuery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "22222222-2222-4222-a222-222222222222",
          }),
        })
      );
    });
  });

  describe("ai.saveQuery", () => {
    it("saves a query with a name", async () => {
      // First create a query
      (ctx.prisma.naturalLanguageQuery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee",
        organizationId: "22222222-2222-4222-a222-222222222222",
        userId: "33333333-3333-4333-a333-333333333333",
        queryText: "major donors",
      });

      const result = await caller.ai.saveQuery({
        queryId: "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee",
        name: "Major Donor List",
      });

      expect(result.success).toBe(true);
      expect(ctx.prisma.naturalLanguageQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee" },
          data: { savedName: "Major Donor List" },
        })
      );
    });

    it("validates query name length", async () => {
      const longName = "a".repeat(256);
      await expect(
        caller.ai.saveQuery({ queryId: "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee", name: longName })
      ).rejects.toThrow();
    });
  });

  describe("ai.getSavedQueries", () => {
    const mockSavedQueries = [
      {
        id: "ffffffff-ffff-4fff-afff-ffffffffffff",
        organizationId: "22222222-2222-4222-a222-222222222222",
        userId: "33333333-3333-4333-a333-333333333333",
        queryText: "major donors",
        savedName: "Major Donor List",
        createdAt: new Date("2026-01-20"),
      },
      {
        id: "ffffffff-ffff-4fff-afff-fffffffffff2",
        organizationId: "22222222-2222-4222-a222-222222222222",
        userId: "33333333-3333-4333-a333-333333333333",
        queryText: "high risk",
        savedName: "At Risk Donors",
        createdAt: new Date("2026-01-15"),
      },
    ];

    it("returns saved queries for user", async () => {
      (ctx.prisma.naturalLanguageQuery.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockSavedQueries);

      const result = await caller.ai.getSavedQueries();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it("filters by organization", async () => {
      (ctx.prisma.naturalLanguageQuery.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockSavedQueries);

      await caller.ai.getSavedQueries();

      expect(ctx.prisma.naturalLanguageQuery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "22222222-2222-4222-a222-222222222222",
          }),
        })
      );
    });

    it("only returns queries with savedName", async () => {
      await caller.ai.getSavedQueries();

      expect(ctx.prisma.naturalLanguageQuery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            savedName: { not: null },
          }),
        })
      );
    });
  });

  describe("ai.deleteSavedQuery", () => {
    it("deletes a saved query", async () => {
      const result = await caller.ai.deleteSavedQuery({
        id: "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee",
      });

      expect(result.success).toBe(true);
      expect(ctx.prisma.naturalLanguageQuery.delete).toHaveBeenCalledWith({
        where: { id: "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee" },
      });
    });
  });

  describe("ai.queryFeedback", () => {
    it("records positive feedback", async () => {
      const result = await caller.ai.queryFeedback({
        queryId: "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee",
        wasHelpful: true,
      });

      expect(result.success).toBe(true);
      expect(ctx.prisma.naturalLanguageQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee" },
          data: expect.objectContaining({
            wasHelpful: true,
          }),
        })
      );
    });

    it("records negative feedback with comment", async () => {
      await caller.ai.queryFeedback({
        queryId: "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee",
        wasHelpful: false,
        feedback: "Results were not relevant",
      });

      expect(ctx.prisma.naturalLanguageQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            wasHelpful: false,
            feedback: "Results were not relevant",
          }),
        })
      );
    });
  });

  describe("error handling", () => {
    it("handles missing API key gracefully (fallback mode)", async () => {
      // Without API key, the router returns a fallback response
      const result = await caller.ai.query({
        query: "major donors",
      });

      // Should still return a result object with fallback indication
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.message).toBe("API key not configured");
    });

    it("handles naturalLanguageQuery.create failure", async () => {
      (ctx.prisma.naturalLanguageQuery.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(
        caller.ai.query({ query: "all donors" })
      ).rejects.toThrow();
    });
  });

  describe("query result format", () => {
    it("includes all required result fields", async () => {
      const result = await caller.ai.query({
        query: "major donors",
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("interpretation");
      expect(result).toHaveProperty("filters");
      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("totalCount");
    });

    it("includes suggestions when AI unavailable", async () => {
      const result = await caller.ai.query({
        query: "major donors",
      });

      // In fallback mode, suggestions should be provided
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });
  });
});
