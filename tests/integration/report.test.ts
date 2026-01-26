// T205: Integration tests for report procedures
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createTestContext, cleanupTestContext } from "../helpers/test-context";
import { appRouter } from "@/server/routers/_app";

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

describe("Report Router Integration", () => {
  let testCtx: Awaited<ReturnType<typeof createTestContext>>;

  beforeAll(async () => {
    testCtx = await createTestContext({
      role: "manager",
      seedData: true,
    });
  });

  afterAll(async () => {
    await cleanupTestContext(testCtx);
  });

  describe("report.generate", () => {
    it("should create a new report with queued status", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

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
      expect(result.status).toBe("queued");
      expect(result.title).toBe("Q4 Executive Summary");
      expect(result.reportType).toBe("executive");
    });

    it("should include organization context", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      const result = await caller.report.generate({
        reportType: "portfolio",
        title: "Portfolio Health Report",
      });

      expect(result.organizationId).toBe(testCtx.ctx.session.user.organizationId);
    });

    it("should create audit log entry", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      const result = await caller.report.generate({
        reportType: "executive",
        title: "Audit Test Report",
      });

      const auditLog = await testCtx.prisma.auditLog.findFirst({
        where: {
          resourceId: result.id,
          action: "report.generate",
        },
      });

      expect(auditLog).toBeDefined();
    });

    it("should support date range parameters", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

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
      const caller = appRouter.createCaller(testCtx.ctx);

      // Create a report first
      const created = await caller.report.generate({
        reportType: "executive",
        title: "Test Get Report",
      });

      const result = await caller.report.get({ id: created.id });

      expect(result.id).toBe(created.id);
      expect(result.title).toBe("Test Get Report");
    });

    it("should throw NOT_FOUND for non-existent report", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      await expect(
        caller.report.get({ id: "00000000-0000-0000-0000-000000000000" })
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should not return reports from other organizations", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      // Create report with a different org (simulated)
      const otherOrgReport = await testCtx.prisma.report.create({
        data: {
          organizationId: "00000000-0000-0000-0000-000000000001",
          reportType: "executive",
          title: "Other Org Report",
          status: "completed",
        },
      });

      await expect(caller.report.get({ id: otherOrgReport.id })).rejects.toThrow("NOT_FOUND");

      // Cleanup
      await testCtx.prisma.report.delete({ where: { id: otherOrgReport.id } });
    });
  });

  describe("report.list", () => {
    it("should list reports for the organization", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      // Create some reports
      await caller.report.generate({ reportType: "executive", title: "List Test 1" });
      await caller.report.generate({ reportType: "portfolio", title: "List Test 2" });

      const result = await caller.report.list({ limit: 10 });

      expect(result.items).toBeDefined();
      expect(result.items.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter by report type", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      await caller.report.generate({ reportType: "executive", title: "Exec Filter" });
      await caller.report.generate({ reportType: "portfolio", title: "Portfolio Filter" });

      const result = await caller.report.list({
        reportType: "executive",
        limit: 50,
      });

      result.items.forEach((report) => {
        expect(report.reportType).toBe("executive");
      });
    });

    it("should filter by status", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      const result = await caller.report.list({
        status: "queued",
        limit: 50,
      });

      result.items.forEach((report) => {
        expect(report.status).toBe("queued");
      });
    });

    it("should support pagination", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      const firstPage = await caller.report.list({ limit: 2 });

      if (firstPage.nextCursor) {
        const secondPage = await caller.report.list({
          limit: 2,
          cursor: firstPage.nextCursor,
        });

        expect(secondPage.items).toBeDefined();
        // Ensure no overlap
        const firstIds = firstPage.items.map((r) => r.id);
        const secondIds = secondPage.items.map((r) => r.id);
        const overlap = firstIds.filter((id) => secondIds.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    it("should order by createdAt descending", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

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
      const caller = appRouter.createCaller(testCtx.ctx);

      const created = await caller.report.generate({
        reportType: "executive",
        title: "Delete Test Report",
      });

      const result = await caller.report.delete({ id: created.id });

      expect(result.success).toBe(true);

      // Verify deleted
      await expect(caller.report.get({ id: created.id })).rejects.toThrow("NOT_FOUND");
    });

    it("should throw NOT_FOUND for non-existent report", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      await expect(
        caller.report.delete({ id: "00000000-0000-0000-0000-000000000000" })
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("report.schedule", () => {
    it("should create a scheduled report", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      const result = await caller.report.schedule({
        reportType: "executive",
        title: "Weekly Executive Report",
        cron: "0 9 * * 1", // Every Monday at 9am
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("scheduled");
      expect(result.scheduleCron).toBe("0 9 * * 1");
    });

    it("should support custom parameters", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      const result = await caller.report.schedule({
        reportType: "portfolio",
        title: "Monthly Portfolio Report",
        cron: "0 9 1 * *", // First day of month at 9am
        parameters: {
          includeCharts: true,
        },
      });

      expect(result.parameters).toBeDefined();
    });
  });

  describe("report.getSchedules", () => {
    it("should list scheduled reports", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      // Create a scheduled report
      await caller.report.schedule({
        reportType: "executive",
        title: "Schedule List Test",
        cron: "0 9 * * 1",
      });

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
      const caller = appRouter.createCaller(testCtx.ctx);

      const scheduled = await caller.report.schedule({
        reportType: "executive",
        title: "Cancel Test Schedule",
        cron: "0 9 * * 1",
      });

      const result = await caller.report.cancelSchedule({ id: scheduled.id });

      expect(result.success).toBe(true);

      // Verify cancelled
      const schedules = await caller.report.getSchedules();
      const found = schedules.find((s) => s.id === scheduled.id);
      expect(found).toBeUndefined();
    });

    it("should throw NOT_FOUND for non-scheduled report", async () => {
      const caller = appRouter.createCaller(testCtx.ctx);

      // Create a non-scheduled report
      const report = await caller.report.generate({
        reportType: "executive",
        title: "Not Scheduled",
      });

      await expect(caller.report.cancelSchedule({ id: report.id })).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("Permission Checks", () => {
    it("should allow managers to generate reports", async () => {
      const managerCtx = await createTestContext({ role: "manager" });
      const caller = appRouter.createCaller(managerCtx.ctx);

      const result = await caller.report.generate({
        reportType: "executive",
        title: "Manager Report",
      });

      expect(result).toBeDefined();
      await cleanupTestContext(managerCtx);
    });

    it("should allow admins to generate reports", async () => {
      const adminCtx = await createTestContext({ role: "admin" });
      const caller = appRouter.createCaller(adminCtx.ctx);

      const result = await caller.report.generate({
        reportType: "executive",
        title: "Admin Report",
      });

      expect(result).toBeDefined();
      await cleanupTestContext(adminCtx);
    });

    it("should deny viewers from generating reports", async () => {
      const viewerCtx = await createTestContext({ role: "viewer" });
      const caller = appRouter.createCaller(viewerCtx.ctx);

      await expect(
        caller.report.generate({
          reportType: "executive",
          title: "Viewer Report",
        })
      ).rejects.toThrow();

      await cleanupTestContext(viewerCtx);
    });

    it("should allow viewers to list reports", async () => {
      const viewerCtx = await createTestContext({ role: "viewer" });
      const caller = appRouter.createCaller(viewerCtx.ctx);

      const result = await caller.report.list({ limit: 10 });

      expect(result.items).toBeDefined();
      await cleanupTestContext(viewerCtx);
    });
  });
});
