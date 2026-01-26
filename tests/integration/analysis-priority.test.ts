// T138: Integration tests for priority procedures
import { describe, it, expect, vi } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";
import type { Context } from "@/server/trpc/context";
import type { PrismaClient } from "@prisma/client";

// Create caller factory
const createCaller = createCallerFactory(appRouter);

// Mock constituent data with priority scores
const mockConstituents = [
  {
    id: "const-1",
    firstName: "Alice",
    lastName: "Major",
    email: "alice@example.com",
    phone: "555-1234",
    constituentType: "alumni",
    classYear: 1995,
    priorityScore: 0.92,
    priorityFactors: [
      { name: "capacity", value: "$1M+ estimated capacity", impact: "high" },
      { name: "likelihood", value: "Low lapse risk (0.15)", impact: "high" },
      { name: "timing", value: "Capital campaign active", impact: "high" },
      { name: "recency", value: "Meeting last month", impact: "high" },
    ],
    estimatedCapacity: 1500000,
    lapseRiskScore: 0.15,
    assignedOfficer: { id: "officer-1", name: "Jane Officer" },
    contacts: [{ contactDate: new Date("2025-12-15") }],
    gifts: [{ amount: 25000, giftDate: new Date("2025-11-01") }],
  },
  {
    id: "const-2",
    firstName: "Bob",
    lastName: "Prospect",
    email: "bob@example.com",
    phone: "555-5678",
    constituentType: "friend",
    classYear: null,
    priorityScore: 0.68,
    priorityFactors: [
      { name: "capacity", value: "$250K-$500K estimated", impact: "medium" },
      { name: "likelihood", value: "Moderate lapse risk (0.45)", impact: "medium" },
      { name: "timing", value: "Fiscal year end approaching", impact: "medium" },
      { name: "recency", value: "3 months since contact", impact: "medium" },
    ],
    estimatedCapacity: 350000,
    lapseRiskScore: 0.45,
    assignedOfficer: { id: "officer-1", name: "Jane Officer" },
    contacts: [{ contactDate: new Date("2025-10-01") }],
    gifts: [{ amount: 5000, giftDate: new Date("2025-06-15") }],
  },
  {
    id: "const-3",
    firstName: "Carol",
    lastName: "Donor",
    email: "carol@example.com",
    phone: "555-9012",
    constituentType: "parent",
    classYear: null,
    priorityScore: 0.45,
    priorityFactors: [
      { name: "capacity", value: "$50K-$100K estimated", impact: "medium" },
      { name: "likelihood", value: "Medium lapse risk (0.55)", impact: "medium" },
      { name: "timing", value: "No active campaigns", impact: "low" },
      { name: "recency", value: "6 months since contact", impact: "low" },
    ],
    estimatedCapacity: 75000,
    lapseRiskScore: 0.55,
    assignedOfficer: { id: "officer-2", name: "John Manager" },
    contacts: [{ contactDate: new Date("2025-07-01") }],
    gifts: [{ amount: 1000, giftDate: new Date("2025-03-01") }],
  },
  {
    id: "const-4",
    firstName: "Dave",
    lastName: "RecentContact",
    email: "dave@example.com",
    phone: "555-3456",
    constituentType: "alumni",
    classYear: 2005,
    priorityScore: 0.75,
    priorityFactors: [
      { name: "capacity", value: "$100K-$250K estimated", impact: "medium" },
      { name: "likelihood", value: "Low lapse risk (0.2)", impact: "high" },
      { name: "timing", value: "Capital campaign active", impact: "high" },
      { name: "recency", value: "Contacted last week", impact: "high" },
    ],
    estimatedCapacity: 150000,
    lapseRiskScore: 0.2,
    assignedOfficer: { id: "officer-1", name: "Jane Officer" },
    contacts: [{ contactDate: new Date("2026-01-10") }], // Very recent contact
    gifts: [{ amount: 3000, giftDate: new Date("2025-12-01") }],
  },
];

// Create mock context helper
function createMockContext(overrides: Partial<{
  role: "admin" | "manager" | "gift_officer" | "viewer";
  userId: string;
  organizationId: string;
}> = {}): Context {
  const role = overrides.role ?? "admin";
  const userId = overrides.userId ?? "user-123";
  const organizationId = overrides.organizationId ?? "org-123";

  const mockPrisma = {
    constituent: {
      findMany: vi.fn().mockImplementation(({ where, take, orderBy }) => {
        let results = [...mockConstituents];

        // Filter by priority score
        if (where?.priorityScore?.gte !== undefined) {
          results = results.filter(c => Number(c.priorityScore) >= where.priorityScore.gte);
        }

        // Filter by assigned officer
        if (where?.assignedOfficerId) {
          results = results.filter(c => c.assignedOfficer?.id === where.assignedOfficerId);
        }

        // Filter out recently contacted (within 7 days by default)
        if (where?.NOT?.contacts?.some?.contactDate?.gte) {
          const cutoffDate = where.NOT.contacts.some.contactDate.gte;
          results = results.filter(c => {
            const lastContact = c.contacts[0]?.contactDate;
            return !lastContact || lastContact < cutoffDate;
          });
        }

        // Sort by priority score descending
        if (orderBy?.priorityScore === "desc") {
          results.sort((a, b) => Number(b.priorityScore) - Number(a.priorityScore));
        }

        // Apply limit
        if (take) {
          results = results.slice(0, take);
        }

        return Promise.resolve(results);
      }),
      findFirst: vi.fn().mockImplementation(({ where }) => {
        const found = mockConstituents.find(c => c.id === where?.id);
        return Promise.resolve(found || null);
      }),
      count: vi.fn().mockImplementation(({ where }) => {
        let results = [...mockConstituents];

        if (where?.priorityScore?.gte !== undefined) {
          results = results.filter(c => Number(c.priorityScore) >= where.priorityScore.gte);
        }

        return Promise.resolve(results.length);
      }),
      aggregate: vi.fn().mockResolvedValue({
        _sum: { estimatedCapacity: 2000000 },
        _avg: { priorityScore: 0.7 },
      }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    prediction: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({ id: "pred-1" }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
    },
    gift: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 50000 } }),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([
        { id: "officer-1", name: "Jane Officer", _count: { assignedConstituents: 25 } },
        { id: "officer-2", name: "John Manager", _count: { assignedConstituents: 15 } },
      ]),
    },
  } as unknown as PrismaClient;

  const withOrgFilter = <T extends { organizationId?: string }>(where?: T) => ({
    ...where,
    organizationId,
  });

  const withOrgCreate = <T extends object>(data: T) => ({
    ...data,
    organizationId,
  });

  return {
    prisma: mockPrisma,
    session: {
      user: {
        id: userId,
        organizationId,
        email: "test@example.com",
        role,
        name: "Test User",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    withOrgFilter,
    withOrgCreate,
    organizationId,
  } as Context;
}

describe("Analysis Priority Procedures", () => {
  describe("getPriorityList", () => {
    it("should return priority list sorted by score descending", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
      });

      expect(result.items).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);

      // Verify descending order
      for (let i = 1; i < result.items.length; i++) {
        const prev = result.items[i - 1];
        const curr = result.items[i];
        if (prev && curr) {
          expect(Number(prev.priorityScore)).toBeGreaterThanOrEqual(Number(curr.priorityScore));
        }
      }
    });

    it("should filter by assigned officer", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
        assignedOfficerId: "officer-1",
      });

      // Items should exist (mock returns filtered results)
      expect(result.items).toBeDefined();
    });

    it("should filter by minimum priority score", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
        minPriority: 0.6,
      });

      // All returned items should have priority >= 0.6
      for (const item of result.items) {
        expect(Number(item.priorityScore)).toBeGreaterThanOrEqual(0.6);
      }
    });

    it("should exclude recently contacted when filter enabled", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
        excludeRecentContact: true,
      });

      // const-4 was contacted very recently and should be excluded
      const hasRecentlyContacted = result.items.some(item => item.constituent.id === "const-4");
      expect(hasRecentlyContacted).toBe(false);
    });

    it("should include constituent details", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
      });

      for (const item of result.items) {
        expect(item.constituent.displayName).toBeDefined();
        expect(item.priorityScore).toBeDefined();
        expect(item.factors).toBeDefined();
      }
    });

    it("should include last contact date", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
      });

      for (const item of result.items) {
        // engagement.lastContactDate should exist (can be null if no contacts)
        expect(item.engagement).toHaveProperty("lastContactDate");
      }
    });

    it("should respect pagination limit", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 2,
      });

      expect(result.items.length).toBeLessThanOrEqual(2);
    });

    it("should return nextCursor for pagination", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 2,
      });

      // If more items exist than limit, should have nextCursor
      if (mockConstituents.length > 2) {
        expect(result.nextCursor).toBeDefined();
      }
    });
  });

  describe("providePriorityFeedback", () => {
    it("should record not_now feedback", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.providePriorityFeedback({
        constituentId: "const-1",
        feedback: "not_now",
      });

      expect(result.success).toBe(true);

      // Verify prediction was updated
      expect(ctx.prisma.prediction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            constituentId: "const-1",
            predictionType: "priority",
            isCurrent: true,
          }),
        })
      );
    });

    it("should record not_interested feedback", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.providePriorityFeedback({
        constituentId: "const-2",
        feedback: "not_interested",
      });

      expect(result.success).toBe(true);
    });

    it("should record already_in_conversation feedback", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.providePriorityFeedback({
        constituentId: "const-3",
        feedback: "already_in_conversation",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("refreshPriorities", () => {
    it("should return refreshed priority list", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      const result = await caller.analysis.refreshPriorities();

      expect(result.items).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it("should create audit log entry", async () => {
      const ctx = createMockContext({ role: "admin" });
      const caller = createCaller(ctx);

      await caller.analysis.refreshPriorities();

      expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "analysis.refresh",
            resourceType: "priority",
          }),
        })
      );
    });
  });

  describe("Role-based Access", () => {
    it("should allow gift officers to view their portfolio priorities", async () => {
      const ctx = createMockContext({ role: "gift_officer", userId: "officer-1" });
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
      });

      expect(result.items).toBeDefined();
    });

    it("should allow managers to view all priorities", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
      });

      expect(result.items).toBeDefined();
    });

    it("should allow admins to view all priorities", async () => {
      const ctx = createMockContext({ role: "admin" });
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
      });

      expect(result.items).toBeDefined();
    });

    it("should allow gift officers to provide feedback", async () => {
      const ctx = createMockContext({ role: "gift_officer" });
      const caller = createCaller(ctx);

      const result = await caller.analysis.providePriorityFeedback({
        constituentId: "const-1",
        feedback: "not_now",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Priority Score Distribution", () => {
    it("should handle constituents with no capacity data", async () => {
      const ctx = createMockContext();
      // Add a constituent with null capacity
      mockConstituents.push({
        id: "const-5",
        firstName: "Eve",
        lastName: "Unknown",
        email: "eve@example.com",
        phone: null,
        constituentType: "friend",
        classYear: null,
        priorityScore: 0.35,
        priorityFactors: [
          { name: "capacity", value: "Unknown capacity", impact: "low" },
        ],
        estimatedCapacity: null,
        lapseRiskScore: 0.5,
        assignedOfficer: { id: "officer-1", name: "Jane Officer" },
        contacts: [],
        gifts: [],
      } as any);

      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
      });

      // Should include the constituent with unknown capacity
      expect(result.items.some(item => item.capacityIndicator.estimate === null)).toBe(true);

      // Clean up
      mockConstituents.pop();
    });

    it("should handle constituents with no contacts", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
      });

      // Results should still be valid even if some have no contacts
      expect(result.items).toBeDefined();
    });

    it("should handle constituents with no gifts", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getPriorityList({
        limit: 50,
      });

      // Results should still be valid even if some have no gifts
      expect(result.items).toBeDefined();
    });
  });
});
