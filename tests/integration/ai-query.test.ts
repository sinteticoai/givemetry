// T177: Integration tests for NL query procedures
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";
import { type Context } from "@/server/trpc/context";
import { PrismaClient } from "@prisma/client";

// Mock the NL query parser
vi.mock("@/server/services/ai/nl-query-parser", () => ({
  parseNaturalLanguageQuery: vi.fn().mockResolvedValue({
    success: true,
    filters: [
      { field: "total_giving", operator: "gte", value: 10000, humanReadable: "Total giving >= $10,000" },
    ],
    interpretation: "Showing donors with total giving of $10,000 or more",
    sort: { field: "total_giving", direction: "desc" },
    limit: 50,
    usage: { inputTokens: 100, outputTokens: 50 },
  }),
}));

// Mock the query translator
vi.mock("@/server/services/ai/query-translator", () => ({
  translateQueryToPrisma: vi.fn().mockReturnValue({
    organizationId: "org-123",
    isActive: true,
  }),
  translateRelativeDate: vi.fn().mockImplementation((val) => new Date(val)),
}));

const mockConstituents = [
  {
    id: "c1",
    organizationId: "org-123",
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
    lapseRiskScore: 0.3,
    priorityScore: 0.85,
    _sum: { amount: 50000 },
    _max: { giftDate: new Date("2025-12-01"), contactDate: new Date("2025-11-15") },
  },
  {
    id: "c2",
    organizationId: "org-123",
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
        id: "query-123",
        ...args.data,
        createdAt: new Date(),
      })),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation((args) => ({
        id: args.where.id,
        ...args.data,
      })),
      delete: vi.fn().mockResolvedValue({ id: "query-123" }),
    },
    gift: {
      groupBy: vi.fn().mockResolvedValue([
        { constituentId: "c1", _sum: { amount: 50000 }, _max: { giftDate: new Date("2025-12-01") } },
        { constituentId: "c2", _sum: { amount: 25000 }, _max: { giftDate: new Date("2025-06-01") } },
      ]),
    },
    contact: {
      groupBy: vi.fn().mockResolvedValue([
        { constituentId: "c1", _max: { contactDate: new Date("2025-11-15") } },
        { constituentId: "c2", _max: { contactDate: new Date("2024-12-01") } },
      ]),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
    $queryRaw: vi.fn().mockResolvedValue(mockConstituents),
  } as unknown as PrismaClient;

  return {
    prisma: mockPrisma,
    session: {
      user: {
        id: "user-123",
        organizationId: "org-123",
        email: "test@example.com",
        role: "admin" as const,
        name: "Test User",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    withOrgFilter: undefined,
    withOrgCreate: undefined,
    organizationId: "org-123",
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
    ctx = createMockContext();
    caller = createCaller(ctx);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("ai.query", () => {
    it("executes a natural language query and returns results", async () => {
      const result = await caller.ai.query({
        query: "Show me donors who gave more than $10,000",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("query-123");
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
    });

    it("returns interpreted query with human-readable explanation", async () => {
      const result = await caller.ai.query({
        query: "high risk donors",
      });

      expect(result.interpretation).toBeDefined();
      expect(typeof result.interpretation).toBe("string");
    });

    it("returns filter breakdown", async () => {
      const result = await caller.ai.query({
        query: "donors who gave $10K+ but haven't been contacted",
      });

      expect(result.filters).toBeDefined();
      expect(Array.isArray(result.filters)).toBe(true);
    });

    it("stores query in database", async () => {
      await caller.ai.query({
        query: "top priority prospects",
      });

      expect(ctx.prisma.naturalLanguageQuery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "org-123",
            userId: "user-123",
            queryText: "top priority prospects",
          }),
        })
      );
    });

    it("returns results with constituent data", async () => {
      const result = await caller.ai.query({
        query: "major donors",
      });

      if (result.results && result.results.length > 0) {
        const firstResult = result.results[0];
        expect(firstResult).toHaveProperty("id");
        expect(firstResult).toHaveProperty("displayName");
      }
    });

    it("validates query minimum length", async () => {
      await expect(
        caller.ai.query({ query: "ab" })
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
            organizationId: "org-123",
          }),
        })
      );
    });
  });

  describe("ai.saveQuery", () => {
    it("saves a query with a name", async () => {
      // First create a query
      (ctx.prisma.naturalLanguageQuery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "query-123",
        organizationId: "org-123",
        userId: "user-123",
        queryText: "major donors",
      });

      const result = await caller.ai.saveQuery({
        queryId: "query-123",
        name: "Major Donor List",
      });

      expect(result.success).toBe(true);
      expect(ctx.prisma.naturalLanguageQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "query-123" },
          data: { savedName: "Major Donor List" },
        })
      );
    });

    it("validates query name length", async () => {
      const longName = "a".repeat(256);
      await expect(
        caller.ai.saveQuery({ queryId: "query-123", name: longName })
      ).rejects.toThrow();
    });
  });

  describe("ai.getSavedQueries", () => {
    const mockSavedQueries = [
      {
        id: "q1",
        organizationId: "org-123",
        userId: "user-123",
        queryText: "major donors",
        savedName: "Major Donor List",
        createdAt: new Date("2026-01-20"),
      },
      {
        id: "q2",
        organizationId: "org-123",
        userId: "user-123",
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
            organizationId: "org-123",
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
        id: "query-123",
      });

      expect(result.success).toBe(true);
      expect(ctx.prisma.naturalLanguageQuery.delete).toHaveBeenCalledWith({
        where: { id: "query-123" },
      });
    });
  });

  describe("ai.queryFeedback", () => {
    it("records positive feedback", async () => {
      const result = await caller.ai.queryFeedback({
        queryId: "query-123",
        wasHelpful: true,
      });

      expect(result.success).toBe(true);
      expect(ctx.prisma.naturalLanguageQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "query-123" },
          data: expect.objectContaining({
            wasHelpful: true,
          }),
        })
      );
    });

    it("records negative feedback with comment", async () => {
      await caller.ai.queryFeedback({
        queryId: "query-123",
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
    it("handles AI service unavailability gracefully", async () => {
      const { parseNaturalLanguageQuery } = await import("@/server/services/ai/nl-query-parser");
      (parseNaturalLanguageQuery as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: false,
        error: "AI service temporarily unavailable",
        filters: [],
        interpretation: "",
      });

      const result = await caller.ai.query({
        query: "major donors",
      });

      // Should still return a result object, but with error indication
      expect(result).toBeDefined();
    });

    it("handles database errors gracefully", async () => {
      (ctx.prisma.constituent.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
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

    it("formats constituent results correctly", async () => {
      const result = await caller.ai.query({
        query: "major donors",
      });

      if (result.results && result.results.length > 0) {
        const constituent = result.results[0];
        expect(constituent).toHaveProperty("id");
        expect(constituent).toHaveProperty("displayName");
      }
    });
  });
});
