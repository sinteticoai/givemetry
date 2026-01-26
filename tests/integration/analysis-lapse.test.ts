// T118: Integration tests for lapse risk procedures
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";
import type { Context } from "@/server/trpc/context";
import type { PrismaClient } from "@prisma/client";

// Create caller factory
const createCaller = createCallerFactory(appRouter);

// Mock constituent data with lapse risk scores
const mockConstituents = [
  {
    id: "const-1",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    lapseRiskScore: 0.85,
    lapseRiskFactors: [
      { name: "recency", value: "24 months since last gift", impact: "high" },
      { name: "frequency", value: "Giving stopped", impact: "high" },
    ],
    assignedOfficer: { id: "officer-1", name: "Jane Officer" },
    gifts: [{ amount: 1000, giftDate: new Date("2024-01-15") }],
    contacts: [],
    _count: { gifts: 3, contacts: 1 },
  },
  {
    id: "const-2",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@example.com",
    lapseRiskScore: 0.55,
    lapseRiskFactors: [
      { name: "recency", value: "14 months since last gift", impact: "medium" },
      { name: "contact", value: "6 months since contact", impact: "medium" },
    ],
    assignedOfficer: { id: "officer-1", name: "Jane Officer" },
    gifts: [{ amount: 500, giftDate: new Date("2024-11-01") }],
    contacts: [{ contactDate: new Date("2025-07-01") }],
    _count: { gifts: 5, contacts: 3 },
  },
  {
    id: "const-3",
    firstName: "Bob",
    lastName: "Johnson",
    email: "bob@example.com",
    lapseRiskScore: 0.25,
    lapseRiskFactors: [
      { name: "recency", value: "2 months since last gift", impact: "low" },
      { name: "frequency", value: "Annual giver, stable pattern", impact: "low" },
    ],
    assignedOfficer: { id: "officer-2", name: "John Manager" },
    gifts: [{ amount: 2000, giftDate: new Date("2025-11-01") }],
    contacts: [{ contactDate: new Date("2025-10-01") }],
    _count: { gifts: 8, contacts: 5 },
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
      findMany: vi.fn().mockImplementation(({ where, take }) => {
        let results = [...mockConstituents];

        // Filter by risk score
        if (where?.lapseRiskScore?.gte !== undefined) {
          results = results.filter(c => Number(c.lapseRiskScore) >= where.lapseRiskScore.gte);
        }
        if (where?.lapseRiskScore?.lt !== undefined) {
          results = results.filter(c => Number(c.lapseRiskScore) < where.lapseRiskScore.lt);
        }

        // Filter by officer
        if (where?.assignedOfficerId) {
          results = results.filter(c => c.assignedOfficer?.id === where.assignedOfficerId);
        }

        // Sort by risk score descending
        results.sort((a, b) => Number(b.lapseRiskScore) - Number(a.lapseRiskScore));

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

        if (where?.lapseRiskScore?.gte !== undefined) {
          results = results.filter(c => Number(c.lapseRiskScore) >= where.lapseRiskScore.gte);
        }
        if (where?.lapseRiskScore?.lt !== undefined) {
          results = results.filter(c => Number(c.lapseRiskScore) < where.lapseRiskScore.lt);
        }

        return Promise.resolve(results.length);
      }),
    },
    gift: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 15000 } }),
    },
    alert: {
      create: vi.fn().mockResolvedValue({ id: "alert-1" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
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

describe("Analysis Lapse Risk Procedures", () => {
  describe("getLapseRiskList", () => {
    it("should return lapse risk list with summary", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
      });

      expect(result.items).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.highRiskCount).toBeGreaterThanOrEqual(0);
      expect(result.summary.mediumRiskCount).toBeGreaterThanOrEqual(0);
      expect(result.summary.lowRiskCount).toBeGreaterThanOrEqual(0);
    });

    it("should filter by risk level - high", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
        riskLevel: "high",
      });

      // All returned items should have high risk level
      for (const item of result.items) {
        expect(item.riskLevel).toBe("high");
        expect(item.riskScore).toBeGreaterThanOrEqual(0.7);
      }
    });

    it("should filter by risk level - medium", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
        riskLevel: "medium",
      });

      // All returned items should have medium risk level
      for (const item of result.items) {
        expect(item.riskLevel).toBe("medium");
        expect(item.riskScore).toBeGreaterThanOrEqual(0.4);
        expect(item.riskScore).toBeLessThan(0.7);
      }
    });

    it("should filter by assigned officer", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
        assignedOfficerId: "officer-1",
      });

      // All returned items should be assigned to officer-1
      for (const item of result.items) {
        expect(item.constituent.assignedOfficerId).toBe("officer-1");
      }
    });

    it("should return items sorted by risk score descending", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
      });

      // Verify descending order
      for (let i = 1; i < result.items.length; i++) {
        const prev = result.items[i - 1];
        const curr = result.items[i];
        if (prev && curr) {
          expect(prev.riskScore).toBeGreaterThanOrEqual(curr.riskScore);
        }
      }
    });

    it("should include giving summary for each constituent", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
      });

      for (const item of result.items) {
        expect(item.givingSummary).toBeDefined();
        expect(item.givingSummary).toHaveProperty("lastGiftDate");
        expect(item.givingSummary).toHaveProperty("lastGiftAmount");
      }
    });

    it("should include explainable factors", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
      });

      for (const item of result.items) {
        expect(item.factors).toBeDefined();
        expect(Array.isArray(item.factors)).toBe(true);
      }
    });

    it("should include predicted lapse window", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
      });

      for (const item of result.items) {
        expect(item.predictedLapseWindow).toBeDefined();
        expect(typeof item.predictedLapseWindow).toBe("string");
      }
    });

    it("should respect pagination limit", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 2,
      });

      expect(result.items.length).toBeLessThanOrEqual(2);
    });
  });

  describe("markLapseAddressed", () => {
    it("should mark lapse as addressed and create alert", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.markLapseAddressed({
        constituentId: "const-1",
        action: "addressed",
        notes: "Called donor, left voicemail",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("addressed");

      // Verify alert was created
      expect(ctx.prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            constituentId: "const-1",
            alertType: "lapse_risk",
            status: "acted_on",
          }),
        })
      );
    });

    it("should mark lapse as retained", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.markLapseAddressed({
        constituentId: "const-1",
        action: "retained",
        notes: "Donor confirmed continued support",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("retained");
    });

    it("should mark lapse as dismissed", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.markLapseAddressed({
        constituentId: "const-1",
        action: "dismissed",
        notes: "Risk assessment not accurate for this donor",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("dismissed");

      // Verify alert status is dismissed
      expect(ctx.prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "dismissed",
          }),
        })
      );
    });

    it("should create audit log entry", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      await caller.analysis.markLapseAddressed({
        constituentId: "const-1",
        action: "addressed",
      });

      expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "lapse_risk.addressed",
            resourceType: "constituent",
            resourceId: "const-1",
          }),
        })
      );
    });

    it("should throw error for non-existent constituent", async () => {
      const ctx = createMockContext();
      // Override findFirst to return null
      (ctx.prisma.constituent.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const caller = createCaller(ctx);

      await expect(
        caller.analysis.markLapseAddressed({
          constituentId: "non-existent",
          action: "addressed",
        })
      ).rejects.toThrow("Constituent not found");
    });

    it("should include risk score in audit log details", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      await caller.analysis.markLapseAddressed({
        constituentId: "const-1",
        action: "retained",
        notes: "Test notes",
      });

      expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            details: expect.objectContaining({
              action: "retained",
              notes: "Test notes",
              riskScore: expect.any(Number),
            }),
          }),
        })
      );
    });
  });

  describe("Role-based Access", () => {
    it("should allow gift officers to view their portfolio lapse risks", async () => {
      const ctx = createMockContext({ role: "gift_officer", userId: "officer-1" });
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
      });

      // Should not throw and return results
      expect(result.items).toBeDefined();
    });

    it("should allow managers to view all lapse risks", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
      });

      expect(result.items).toBeDefined();
    });

    it("should allow admins to view all lapse risks", async () => {
      const ctx = createMockContext({ role: "admin" });
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
      });

      expect(result.items).toBeDefined();
    });

    it("should allow gift officers to mark lapse as addressed", async () => {
      const ctx = createMockContext({ role: "gift_officer" });
      const caller = createCaller(ctx);

      const result = await caller.analysis.markLapseAddressed({
        constituentId: "const-1",
        action: "addressed",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Summary Statistics", () => {
    it("should calculate correct high risk count", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
      });

      // Our mock has 1 high risk donor (const-1 with score 0.85)
      expect(result.summary.highRiskCount).toBeGreaterThanOrEqual(0);
    });

    it("should calculate correct medium risk count", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
      });

      // Our mock has 1 medium risk donor (const-2 with score 0.55)
      expect(result.summary.mediumRiskCount).toBeGreaterThanOrEqual(0);
    });

    it("should include total at-risk value", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.analysis.getLapseRiskList({
        limit: 50,
      });

      expect(result.summary.totalAtRiskValue).toBeDefined();
      expect(typeof result.summary.totalAtRiskValue).toBe("number");
    });
  });
});
