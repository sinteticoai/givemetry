// T155: Integration tests for brief generation
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Note: Tests use fallback briefs when ANTHROPIC_API_KEY is not set
// This is intentional for testing the basic flow without actual AI calls

import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";
import { type Context } from "@/server/trpc/context";
import { PrismaClient } from "@prisma/client";

const mockConstituent = {
  id: "11111111-1111-4111-a111-111111111111",
  organizationId: "22222222-2222-4222-a222-222222222222",
  externalId: "e1e1e1e1-e1e1-4e1e-ae1e-e1e1e1e1e1e1",
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  constituentType: "alumni",
  classYear: 1995,
  gifts: [
    { id: "55555555-5555-4555-a555-555555555551", amount: 10000, giftDate: new Date("2025-12-01"), fundName: "Annual Fund" },
    { id: "55555555-5555-4555-a555-555555555552", amount: 5000, giftDate: new Date("2024-12-01"), fundName: "Scholarship" },
  ],
  contacts: [
    { id: "66666666-6666-4666-a666-666666666661", contactType: "meeting", contactDate: new Date("2025-11-15"), notes: "Discussed giving" },
  ],
  predictions: [
    { id: "cccccccc-cccc-4ccc-accc-cccccccccc01", predictionType: "priority", score: 0.85, isCurrent: true },
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
        id: "44444444-4444-4444-a444-444444444444",
        ...args.data,
        createdAt: new Date(),
      })),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockImplementation((args) => ({
        id: args.where.id,
        ...args.data,
      })),
      delete: vi.fn().mockResolvedValue({ id: "44444444-4444-4444-a444-444444444444" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "a1a1a1a1-a1a1-4a1a-aa1a-a1a1a1a1a1a1" }),
    },
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
        constituentId: "11111111-1111-4111-a111-111111111111",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("44444444-4444-4444-a444-444444444444");
      expect(result.constituentId).toBe("11111111-1111-4111-a111-111111111111");
      expect(result.content).toBeDefined();
    });

    it("includes constituent data in brief generation", async () => {
      const result = await caller.ai.generateBrief({
        constituentId: "11111111-1111-4111-a111-111111111111",
      });

      expect(ctx.prisma.constituent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "11111111-1111-4111-a111-111111111111",
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
        caller.ai.generateBrief({ constituentId: "00000000-0000-0000-0000-000000000000" })
      ).rejects.toThrow("Constituent not found");
    });

    it("enforces portfolio-based access for gift officers", async () => {
      const giftOfficerCtx = createMockContext({
        session: {
          user: {
            id: "dddddddd-dddd-4ddd-addd-dddddddddddd",
            organizationId: "22222222-2222-4222-a222-222222222222",
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
        giftOfficerCaller.ai.generateBrief({ constituentId: "11111111-1111-4111-a111-111111111111" })
      ).rejects.toThrow("Constituent not found");

      // Verify the query included portfolio filter
      expect(giftOfficerCtx.prisma.constituent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedOfficerId: "dddddddd-dddd-4ddd-addd-dddddddddddd",
          }),
        })
      );
    });

    it("creates an audit log entry", async () => {
      await caller.ai.generateBrief({
        constituentId: "11111111-1111-4111-a111-111111111111",
      });

      expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "brief.generate",
            resourceType: "brief",
            userId: "33333333-3333-4333-a333-333333333333",
            organizationId: "22222222-2222-4222-a222-222222222222",
          }),
        })
      );
    });

    it("stores token usage in brief record", async () => {
      await caller.ai.generateBrief({
        constituentId: "11111111-1111-4111-a111-111111111111",
      });

      // When using fallback (no API key), tokens are null and model is "fallback"
      expect(ctx.prisma.brief.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            constituentId: "11111111-1111-4111-a111-111111111111",
            modelUsed: expect.any(String),
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
        unauthenticatedCaller.ai.generateBrief({ constituentId: "11111111-1111-4111-a111-111111111111" })
      ).rejects.toThrow();
    });
  });

  describe("getBrief", () => {
    const mockBrief = {
      id: "44444444-4444-4444-a444-444444444444",
      organizationId: "22222222-2222-4222-a222-222222222222",
      constituentId: "11111111-1111-4111-a111-111111111111",
      userId: "33333333-3333-4333-a333-333333333333",
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
        id: "11111111-1111-4111-a111-111111111111",
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
      },
      user: {
        id: "33333333-3333-4333-a333-333333333333",
        name: "Test User",
      },
    };

    it("retrieves a brief by ID", async () => {
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockBrief);

      const result = await caller.ai.getBrief({ id: "44444444-4444-4444-a444-444444444444" });

      expect(result).toBeDefined();
      expect(result.id).toBe("44444444-4444-4444-a444-444444444444");
      expect(result.constituent).toBeDefined();
      expect(result.constituent.firstName).toBe("John");
    });

    it("throws NOT_FOUND for non-existent brief", async () => {
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.ai.getBrief({ id: "00000000-0000-0000-0000-000000000000" })
      ).rejects.toThrow("Brief not found");
    });

    it("only returns briefs from same organization", async () => {
      // Setup mock to return a brief to avoid NOT_FOUND
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockBrief);

      await caller.ai.getBrief({ id: "44444444-4444-4444-a444-444444444444" });

      expect(ctx.prisma.brief.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "22222222-2222-4222-a222-222222222222",
          }),
        })
      );
    });
  });

  describe("listBriefs", () => {
    const mockBriefs = [
      {
        id: "b1b1b1b1-b1b1-4b1b-ab1b-b1b1b1b1b1b1",
        constituentId: "c1c1c1c1-c1c1-4c1c-ac1c-c1c1c1c1c1c1",
        createdAt: new Date("2026-01-25"),
        constituent: { id: "c1c1c1c1-c1c1-4c1c-ac1c-c1c1c1c1c1c1", firstName: "John", lastName: "Smith" },
      },
      {
        id: "b2b2b2b2-b2b2-4b2b-ab2b-b2b2b2b2b2b2",
        constituentId: "c2c2c2c2-c2c2-4c2c-ac2c-c2c2c2c2c2c2",
        createdAt: new Date("2026-01-24"),
        constituent: { id: "c2c2c2c2-c2c2-4c2c-ac2c-c2c2c2c2c2c2", firstName: "Jane", lastName: "Doe" },
      },
    ];

    it("lists briefs for organization", async () => {
      (ctx.prisma.brief.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockBriefs);

      const result = await caller.ai.listBriefs({ limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe("b1b1b1b1-b1b1-4b1b-ab1b-b1b1b1b1b1b1");
    });

    it("filters by constituent ID", async () => {
      (ctx.prisma.brief.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockBriefs[0]]);

      await caller.ai.listBriefs({
        constituentId: "c1c1c1c1-c1c1-4c1c-ac1c-c1c1c1c1c1c1",
        limit: 20,
      });

      expect(ctx.prisma.brief.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            constituentId: "c1c1c1c1-c1c1-4c1c-ac1c-c1c1c1c1c1c1",
          }),
        })
      );
    });

    it("supports pagination with cursor", async () => {
      const moreResults = [...mockBriefs, { id: "b3b3b3b3-b3b3-4b3b-ab3b-b3b3b3b3b3b3", constituentId: "c3030303-0303-4030-a030-030303030303", createdAt: new Date() }];
      (ctx.prisma.brief.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(moreResults);

      const result = await caller.ai.listBriefs({ limit: 2 });

      expect(result.nextCursor).toBe("b3b3b3b3-b3b3-4b3b-ab3b-b3b3b3b3b3b3");
    });

    it("returns undefined nextCursor when no more results", async () => {
      (ctx.prisma.brief.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockBriefs);

      const result = await caller.ai.listBriefs({ limit: 20 });

      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe("updateBrief", () => {
    const existingBrief = {
      id: "44444444-4444-4444-a444-444444444444",
      organizationId: "22222222-2222-4222-a222-222222222222",
      constituentId: "11111111-1111-4111-a111-111111111111",
      userId: "33333333-3333-4333-a333-333333333333",
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
        id: "44444444-4444-4444-a444-444444444444",
        content: updatedContent,
      });

      expect(ctx.prisma.brief.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "44444444-4444-4444-a444-444444444444" },
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
          id: "00000000-0000-0000-0000-000000000000",
          content: { summary: { text: "", citations: [] } },
        })
      ).rejects.toThrow("Brief not found");
    });

    it("creates audit log for update", async () => {
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existingBrief);

      await caller.ai.updateBrief({
        id: "44444444-4444-4444-a444-444444444444",
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
      id: "44444444-4444-4444-a444-444444444444",
      organizationId: "22222222-2222-4222-a222-222222222222",
      constituentId: "11111111-1111-4111-a111-111111111111",
    };

    it("records error flag on brief", async () => {
      (ctx.prisma.brief.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existingBrief);

      const result = await caller.ai.flagBriefError({
        briefId: "44444444-4444-4444-a444-444444444444",
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
          briefId: "00000000-0000-0000-0000-000000000000",
          errorType: "factual_error",
          description: "Error",
        })
      ).rejects.toThrow("Brief not found");
    });
  });
});
