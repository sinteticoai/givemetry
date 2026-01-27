// T205: Integration tests for report procedures
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";
import type { Context } from "@/server/trpc/context";
import type { PrismaClient } from "@prisma/client";

// Mock the pdf-renderer since it requires specific node environment
vi.mock("@react-pdf/renderer", () => ({
  Document: vi.fn(),
  Page: vi.fn(),
  Text: vi.fn(),
  View: vi.fn(),
  StyleSheet: { create: vi.fn(() => ({})) },
  pdf: vi.fn(() => ({
    toBuffer: vi.fn(() => Promise.resolve(Buffer.from("mock-pdf"))),
  })),
}));

// Mock the report services
vi.mock("@/server/services/report/report-generator", () => ({
  generateExecutiveReport: vi.fn().mockResolvedValue({
    content: "<html>Report</html>",
    metadata: { generatedAt: new Date() },
  }),
  generatePortfolioHealthReport: vi.fn().mockResolvedValue({
    content: "<html>Report</html>",
    metadata: { generatedAt: new Date() },
  }),
  generateLapseRiskReport: vi.fn().mockResolvedValue({
    content: "<html>Report</html>",
    metadata: { generatedAt: new Date() },
  }),
  generatePrioritiesReport: vi.fn().mockResolvedValue({
    content: "<html>Report</html>",
    metadata: { generatedAt: new Date() },
  }),
}));

vi.mock("@/server/services/report/content-aggregator", () => ({
  aggregateReportContent: vi.fn().mockResolvedValue({
    portfolioHealth: { score: 0.8, metrics: {} },
    topOpportunities: [],
    riskAlerts: [],
    keyMetrics: {},
    recommendedActions: [],
  }),
}));

const testOrgId = "22222222-2222-4222-a222-222222222222";
const testUserId = "33333333-3333-4333-a333-333333333333";

// Mock report data
const mockReports = [
  {
    id: "a1a1a1a1-a1a1-4a1a-aa1a-a1a1a1a1a1a1",
    organizationId: testOrgId,
    reportType: "executive",
    title: "Q4 Executive Summary",
    status: "queued",
    parameters: { includeCharts: true },
    scheduleCron: null,
    createdAt: new Date("2026-01-25"),
    updatedAt: new Date("2026-01-25"),
  },
  {
    id: "a2a2a2a2-a2a2-4a2a-aa2a-a2a2a2a2a2a2",
    organizationId: testOrgId,
    reportType: "portfolio",
    title: "Portfolio Health Report",
    status: "completed",
    parameters: {},
    scheduleCron: null,
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-01-20"),
  },
  {
    id: "a3a3a3a3-a3a3-4a3a-aa3a-a3a3a3a3a3a3",
    organizationId: testOrgId,
    reportType: "executive",
    title: "Weekly Executive Report",
    status: "scheduled",
    parameters: {},
    scheduleCron: "0 9 * * 1",
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
  },
];

const createMockContext = (role: "admin" | "manager" | "gift_officer" | "viewer" = "manager"): Context => {
  const mockPrisma = {
    report: {
      create: vi.fn().mockImplementation((args) => ({
        id: "11111111-1111-4111-a111-111111111111",
        organizationId: testOrgId,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findFirst: vi.fn().mockImplementation((args) => {
        const report = mockReports.find(
          (r) => r.id === args.where?.id && r.organizationId === args.where?.organizationId
        );
        return report || null;
      }),
      findMany: vi.fn().mockImplementation((args) => {
        let results = mockReports.filter((r) => r.organizationId === args.where?.organizationId);
        if (args.where?.reportType) {
          results = results.filter((r) => r.reportType === args.where.reportType);
        }
        if (args.where?.status) {
          results = results.filter((r) => r.status === args.where.status);
        }
        if (args.where?.scheduleCron) {
          results = results.filter((r) => r.scheduleCron !== null);
        }
        // Sort by createdAt desc
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        // Apply limit
        if (args.take) {
          results = results.slice(0, args.take);
        }
        return results;
      }),
      update: vi.fn().mockImplementation((args) => {
        // Return the updated report - either from mockReports or a new one
        const report = mockReports.find((r) => r.id === args.where?.id);
        if (report) {
          return { ...report, ...args.data };
        }
        // For newly created reports that aren't in mockReports
        return {
          id: args.where?.id || "11111111-1111-4111-a111-111111111111",
          organizationId: testOrgId,
          reportType: "executive",
          title: "Test Report",
          status: "completed",
          parameters: { includeCharts: true },
          scheduleCron: null,
          content: { html: "<html>Report</html>" },
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
      delete: vi.fn().mockImplementation((args) => {
        const index = mockReports.findIndex((r) => r.id === args.where?.id);
        if (index >= 0) {
          return mockReports[index];
        }
        return null;
      }),
      count: vi.fn().mockResolvedValue(mockReports.length),
    },
    organization: {
      findUnique: vi.fn().mockResolvedValue({ id: testOrgId, name: "Test Organization" }),
    },
    constituent: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "c1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          priorityScore: 0.8,
          lapseRiskScore: 0.2,
          estimatedCapacity: 100000,
          assignedOfficerId: "user-1",
          dataQualityScore: 0.9,
        },
      ]),
    },
    gift: {
      findMany: vi.fn().mockResolvedValue([
        { id: "g1", constituentId: "c1", amount: 1000, giftDate: new Date() },
      ]),
    },
    contact: {
      findMany: vi.fn().mockResolvedValue([
        { id: "ct1", constituentId: "c1", contactDate: new Date(), contactType: "call" },
      ]),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([
        { id: "user-1", name: "Gift Officer 1" },
      ]),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
  } as unknown as PrismaClient;

  return {
    prisma: mockPrisma,
    session: {
      user: {
        id: testUserId,
        organizationId: testOrgId,
        email: "test@example.com",
        role,
        name: "Test User",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    withOrgFilter: (where = {}) => ({ ...where, organizationId: testOrgId }),
    withOrgCreate: (data: object) => ({ ...data, organizationId: testOrgId }),
    organizationId: testOrgId,
  };
};

describe("Report Router Integration", () => {
  const createCaller = createCallerFactory(appRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("report.generate", () => {
    it("should create and process a report to completion", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      const result = await caller.report.generate({
        reportType: "executive",
        title: "Q4 Executive Summary",
        parameters: {
          includeCharts: true,
          includeRecommendations: true,
        },
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      // Router processes the report immediately, so status is "completed"
      expect(result.status).toBe("completed");
      expect(result.reportType).toBe("executive");
    });

    it("should include organization context", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      const result = await caller.report.generate({
        reportType: "portfolio",
        title: "Portfolio Health Report",
      });

      expect(result.organizationId).toBe(testOrgId);
    });

    it("should create audit log entry", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      await caller.report.generate({
        reportType: "executive",
        title: "Audit Test Report",
      });

      expect(ctx.prisma.auditLog.create).toHaveBeenCalled();
    });

    it("should support date range parameters", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      const result = await caller.report.generate({
        reportType: "executive",
        title: "Date Range Report",
        parameters: {
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-12-31"),
        },
      });

      expect(result.parameters).toBeDefined();
    });
  });

  describe("report.get", () => {
    it("should retrieve a report by ID", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      const result = await caller.report.get({ id: "a1a1a1a1-a1a1-4a1a-aa1a-a1a1a1a1a1a1" });

      expect(result.id).toBe("a1a1a1a1-a1a1-4a1a-aa1a-a1a1a1a1a1a1");
      expect(result.title).toBe("Q4 Executive Summary");
    });

    it("should throw NOT_FOUND for non-existent report", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      await expect(
        caller.report.get({ id: "00000000-0000-4000-8000-000000000000" })
      ).rejects.toThrow();
    });
  });

  describe("report.list", () => {
    it("should list reports for the organization", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      const result = await caller.report.list({ limit: 10 });

      expect(result.items).toBeDefined();
      expect(result.items.length).toBeGreaterThanOrEqual(1);
    });

    it("should filter by report type", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      const result = await caller.report.list({
        reportType: "executive",
        limit: 50,
      });

      result.items.forEach((report) => {
        expect(report.reportType).toBe("executive");
      });
    });

    it("should filter by status", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      const result = await caller.report.list({
        status: "queued",
        limit: 50,
      });

      result.items.forEach((report) => {
        expect(report.status).toBe("queued");
      });
    });

    it("should order by createdAt descending", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      const result = await caller.report.list({ limit: 10 });

      for (let i = 0; i < result.items.length - 1; i++) {
        const current = new Date(result.items[i]!.createdAt).getTime();
        const next = new Date(result.items[i + 1]!.createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe("report.delete", () => {
    it("should delete a report", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      const result = await caller.report.delete({ id: "a1a1a1a1-a1a1-4a1a-aa1a-a1a1a1a1a1a1" });

      expect(result.success).toBe(true);
    });

    it("should throw NOT_FOUND for non-existent report", async () => {
      const ctx = createMockContext("manager");
      (ctx.prisma.report.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const caller = createCaller(ctx);

      await expect(
        caller.report.delete({ id: "00000000-0000-4000-8000-000000000000" })
      ).rejects.toThrow();
    });
  });

  describe("report.schedule", () => {
    it("should create a scheduled report", async () => {
      const ctx = createMockContext("manager");
      (ctx.prisma.report.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "5c4ed111-1111-4111-a111-111111111111",
        organizationId: testOrgId,
        reportType: "executive",
        title: "Weekly Executive Report",
        status: "scheduled",
        scheduleCron: "0 9 * * 1",
        parameters: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const caller = createCaller(ctx);

      const result = await caller.report.schedule({
        reportType: "executive",
        title: "Weekly Executive Report",
        cron: "0 9 * * 1",
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("scheduled");
      expect(result.scheduleCron).toBe("0 9 * * 1");
    });

    it("should support custom parameters", async () => {
      const ctx = createMockContext("manager");
      (ctx.prisma.report.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "5c4ed222-2222-4222-a222-222222222222",
        organizationId: testOrgId,
        reportType: "portfolio",
        title: "Monthly Portfolio Report",
        status: "scheduled",
        scheduleCron: "0 9 1 * *",
        parameters: { includeCharts: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const caller = createCaller(ctx);

      const result = await caller.report.schedule({
        reportType: "portfolio",
        title: "Monthly Portfolio Report",
        cron: "0 9 1 * *",
        parameters: {
          includeCharts: true,
        },
      });

      expect(result.parameters).toBeDefined();
    });
  });

  describe("report.getSchedules", () => {
    it("should list scheduled reports", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      const result = await caller.report.getSchedules();

      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((schedule) => {
        expect(schedule.status).toBe("scheduled");
        expect(schedule.scheduleCron).toBeDefined();
      });
    });
  });

  describe("report.cancelSchedule", () => {
    it("should cancel a scheduled report", async () => {
      const ctx = createMockContext("manager");
      (ctx.prisma.report.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "a3a3a3a3-a3a3-4a3a-aa3a-a3a3a3a3a3a3",
        organizationId: testOrgId,
        status: "scheduled",
        scheduleCron: "0 9 * * 1",
      });
      const caller = createCaller(ctx);

      const result = await caller.report.cancelSchedule({ id: "a3a3a3a3-a3a3-4a3a-aa3a-a3a3a3a3a3a3" });

      expect(result.success).toBe(true);
    });

    it("should throw NOT_FOUND for non-scheduled report", async () => {
      const ctx = createMockContext("manager");
      // Mock returning null since router queries for status: "scheduled" specifically
      // and the report is not scheduled
      (ctx.prisma.report.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const caller = createCaller(ctx);

      await expect(
        caller.report.cancelSchedule({ id: "a1a1a1a1-a1a1-4a1a-aa1a-a1a1a1a1a1a1" })
      ).rejects.toThrow();
    });
  });

  describe("Permission Checks", () => {
    it("should allow managers to generate reports", async () => {
      const ctx = createMockContext("manager");
      const caller = createCaller(ctx);

      const result = await caller.report.generate({
        reportType: "executive",
        title: "Manager Report",
      });

      expect(result).toBeDefined();
    });

    it("should allow admins to generate reports", async () => {
      const ctx = createMockContext("admin");
      const caller = createCaller(ctx);

      const result = await caller.report.generate({
        reportType: "executive",
        title: "Admin Report",
      });

      expect(result).toBeDefined();
    });

    it("should deny viewers from generating reports", async () => {
      const ctx = createMockContext("viewer");
      const caller = createCaller(ctx);

      await expect(
        caller.report.generate({
          reportType: "executive",
          title: "Viewer Report",
        })
      ).rejects.toThrow();
    });

    it("should allow viewers to list reports", async () => {
      const ctx = createMockContext("viewer");
      const caller = createCaller(ctx);

      const result = await caller.report.list({ limit: 10 });

      expect(result.items).toBeDefined();
    });
  });
});
