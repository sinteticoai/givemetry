// T155: Integration tests for brief generation
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";
import { type Context } from "@/server/trpc/context";
import { PrismaClient } from "@prisma/client";

// Mock the Claude API
vi.mock("@/lib/ai/claude", () => ({
  generateBriefContent: vi.fn().mockResolvedValue({
    brief: {
      summary: {
        text: "Test constituent is a valued donor.",
        citations: [{ text: "valued donor", source: "profile", sourceId: "constituent-123" }],
      },
      givingHistory: {
        text: "Has made 5 gifts totaling $50,000.",
        totalLifetime: 50000,
        citations: [{ text: "5 gifts", source: "gift", sourceId: "gift-1" }],
      },
      relationshipHighlights: {
        text: "Strong engagement history.",
        citations: [],
      },
      conversationStarters: {
        items: ["Thank for recent gift", "Discuss upcoming campaign"],
        citations: [],
      },
      recommendedAsk: {
        amount: 10000,
        purpose: "Annual Fund",
        rationale: "Based on giving history",
        citations: [],
      },
    },
    usage: {
      inputTokens: 500,
      outputTokens: 300,
    },
    modelUsed: "claude-sonnet-4-20250514",
  }),
  CLAUDE_MODELS: {
    SONNET: "claude-sonnet-4-20250514",
    HAIKU: "claude-3-5-haiku-20241022",
  },
}));

const mockConstituent = {
  id: "constituent-123",
  organizationId: "org-123",
  externalId: "ext-123",
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  constituentType: "alumni",
  classYear: 1995,
  gifts: [
    { id: "gift-1", amount: 10000, giftDate: new Date("2025-12-01"), fundName: "Annual Fund" },
    { id: "gift-2", amount: 5000, giftDate: new Date("2024-12-01"), fundName: "Scholarship" },
  ],
  contacts: [
    { id: "contact-1", contactType: "meeting", contactDate: new Date("2025-11-15"), notes: "Discussed giving" },
  ],
  predictions: [
    { id: "pred-1", predictionType: "priority", score: 0.85, isCurrent: true },
  ],
};

const createMockContext = (overrides: Partial<Context> = {}): Context => {
  const mockPrisma = {
    constituent: {
      findFirst: vi.fn().mockResolvedValue(mockConstituent),
      findUnique: vi.fn().mockResolvedValue(mockConstituent),
    },
    brief: {
      create: vi.fn().mockImplementation((args) => ({
        id: "brief-123",
        ...args.data,
        createdAt: new Date(),
      })),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockImplementation((args) => ({
        id: args.where.id,
        ...args.data,
      })),
      delete: vi.fn().mockResolvedValue({ id: "brief-123" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
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
    ...overrides,
  };
};

describe("AI Brief Router Integration Tests", () => {
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

  describe("generateBrief", () => {
    it("generates a brief for a constituent", async () => {
      const result = await caller.ai.generateBrief({
        constituentId: "constituent-123",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("brief-123");
      expect(result.constituentId).toBe("constituent-123");
      expect(result.content).toBeDefined();
    });

    it("includes constituent data in brief generation", async () => {
      const result = await caller.ai.generateBrief({
        constituentId: "constituent-123",
      });

      expect(ctx.prisma.constituent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "constituent-123",
          }),
          include: expect.objectContaining({
            gifts: expect.any(Object),
            contacts: expect.any(Object),
            predictions: expect.any(Object),
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it("throws NOT_FOUND for non-existent constituent", async () => {
      (ctx.prisma.constituent.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.ai.generateBrief({ constituentId: "nonexistent" })
      ).rejects.toThrow("Constituent not found");
    });

    it("enforces portfolio-based access for gift officers", async () => {
      const giftOfficerCtx = createMockContext({
        session: {
          user: {
            id: "officer-456",
            organizationId: "org-123",
            email: "officer@example.com",
            role: "gift_officer" as const,
            name: "Gift Officer",
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      (giftOfficerCtx.prisma.constituent.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const giftOfficerCaller = createCaller(giftOfficerCtx);

      await expect(
        giftOfficerCaller.ai.generateBrief({ constituentId: "constituent-123" })
      ).rejects.toThrow("Constituent not found");

      // Verify the query included portfolio filter
      expect(giftOfficerCtx.prisma.constituent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedOfficerId: "officer-456",
          }),
        })
      );
    });

    it("creates an audit log entry", async () => {
      await caller.ai.generateBrief({
        constituentId: "constituent-123",
      });

      expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "brief.generate",
            resourceType: "brief",
            userId: "user-123",
            organizationId: "org-123",
          }),
        })
      );
    });

    it("stores token usage in brief record", async () => {
      await caller.ai.generateBrief({
        constituentId: "constituent-123",
      });

      expect(ctx.prisma.brief.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            promptTokens: 500,
            completionTokens: 300,
            modelUsed: "claude-sonnet-4-20250514",
          }),
        })
      );
    });

    it("requires authentication", async () => {
      const unauthenticatedCaller = createCaller({
        ...ctx,
        session: null,
      } as unknown as Context);

      await expect(
        unauthenticatedCaller.ai.generateBrief({ constituentId: "constituent-123" })
      ).rejects.toThrow();
    });
  });

  describe("getBrief", () => {
    const mockBrief = {
      id: "brief-123",
      organizationId: "org-123",
      constituentId: "constituent-123",
      userId: "user-123",
      content: {
        summary: { text: "Test brief", citations: [] },
        givingHistory: { text: "", totalLifetime: 0, citations: [] },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      },
      citations: [],
      createdAt: new Date("2026-01-25"),
      constituent: {
        id: "constituent-123",
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
      },
      user: {
        id: "user-123",
        name: "Test User",
      },
    };

    it("retrieves a brief by ID", async () => {
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockBrief);

      const result = await caller.ai.getBrief({ id: "brief-123" });

      expect(result).toBeDefined();
      expect(result.id).toBe("brief-123");
      expect(result.constituent).toBeDefined();
      expect(result.constituent.firstName).toBe("John");
    });

    it("throws NOT_FOUND for non-existent brief", async () => {
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.ai.getBrief({ id: "nonexistent" })
      ).rejects.toThrow("Brief not found");
    });

    it("only returns briefs from same organization", async () => {
      await caller.ai.getBrief({ id: "brief-123" });

      expect(ctx.prisma.brief.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-123",
          }),
        })
      );
    });
  });

  describe("listBriefs", () => {
    const mockBriefs = [
      {
        id: "brief-1",
        constituentId: "c1",
        createdAt: new Date("2026-01-25"),
        constituent: { id: "c1", firstName: "John", lastName: "Smith" },
      },
      {
        id: "brief-2",
        constituentId: "c2",
        createdAt: new Date("2026-01-24"),
        constituent: { id: "c2", firstName: "Jane", lastName: "Doe" },
      },
    ];

    it("lists briefs for organization", async () => {
      (ctx.prisma.brief.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockBriefs);

      const result = await caller.ai.listBriefs({ limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe("brief-1");
    });

    it("filters by constituent ID", async () => {
      (ctx.prisma.brief.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockBriefs[0]]);

      await caller.ai.listBriefs({
        constituentId: "c1",
        limit: 20,
      });

      expect(ctx.prisma.brief.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            constituentId: "c1",
          }),
        })
      );
    });

    it("supports pagination with cursor", async () => {
      const moreResults = [...mockBriefs, { id: "brief-3", constituentId: "c3", createdAt: new Date() }];
      (ctx.prisma.brief.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(moreResults);

      const result = await caller.ai.listBriefs({ limit: 2 });

      expect(result.nextCursor).toBe("brief-3");
    });

    it("returns undefined nextCursor when no more results", async () => {
      (ctx.prisma.brief.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockBriefs);

      const result = await caller.ai.listBriefs({ limit: 20 });

      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe("updateBrief", () => {
    const existingBrief = {
      id: "brief-123",
      organizationId: "org-123",
      constituentId: "constituent-123",
      userId: "user-123",
      content: { summary: { text: "Original", citations: [] } },
    };

    it("updates brief content", async () => {
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existingBrief);

      const updatedContent = {
        summary: { text: "Updated summary", citations: [] },
        givingHistory: { text: "Updated", totalLifetime: 0, citations: [] },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = await caller.ai.updateBrief({
        id: "brief-123",
        content: updatedContent,
      });

      expect(ctx.prisma.brief.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "brief-123" },
          data: expect.objectContaining({
            content: updatedContent,
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it("throws NOT_FOUND for non-existent brief", async () => {
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.ai.updateBrief({
          id: "nonexistent",
          content: { summary: { text: "", citations: [] } },
        })
      ).rejects.toThrow("Brief not found");
    });

    it("creates audit log for update", async () => {
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existingBrief);

      await caller.ai.updateBrief({
        id: "brief-123",
        content: { summary: { text: "Updated", citations: [] } },
      });

      expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "brief.update",
          }),
        })
      );
    });
  });

  describe("flagBriefError", () => {
    const existingBrief = {
      id: "brief-123",
      organizationId: "org-123",
      constituentId: "constituent-123",
    };

    it("records error flag on brief", async () => {
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existingBrief);

      const result = await caller.ai.flagBriefError({
        briefId: "brief-123",
        errorType: "factual_error",
        description: "The gift amount is incorrect",
        section: "givingHistory",
      });

      expect(result.success).toBe(true);
      expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "brief.flag_error",
            details: expect.objectContaining({
              errorType: "factual_error",
              description: "The gift amount is incorrect",
            }),
          }),
        })
      );
    });

    it("throws NOT_FOUND for non-existent brief", async () => {
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.ai.flagBriefError({
          briefId: "nonexistent",
          errorType: "factual_error",
          description: "Error",
        })
      ).rejects.toThrow("Brief not found");
    });
  });
});
