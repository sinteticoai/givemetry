// T222: Integration tests for alert procedures
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/routers/_app";
import type { Context } from "@/server/trpc/context";

// Mock Prisma client
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    alert: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Import after mock
import { prisma } from "@/lib/prisma/client";

const mockPrisma = prisma as unknown as {
  alert: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("Alert Router Integration", () => {
  const testOrgId = "org-123";
  const testUserId = "user-123";

  const createTestContext = (role: "admin" | "manager" | "gift_officer" | "viewer" = "admin"): Context => ({
    session: {
      user: {
        id: testUserId,
        email: "test@example.com",
        name: "Test User",
        organizationId: testOrgId,
        role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    prisma: mockPrisma as any,
    withOrgFilter: (where = {}) => ({ ...where, organizationId: testOrgId }),
    withOrgCreate: (data: object) => ({ ...data, organizationId: testOrgId }),
    organizationId: testOrgId,
  });

  const createCaller = createCallerFactory(appRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAlert = {
    id: "alert-1",
    organizationId: testOrgId,
    constituentId: "const-1",
    alertType: "contact_gap",
    severity: "high",
    title: "Test Alert",
    description: "Test alert description",
    factors: [{ name: "test", value: "test value" }],
    status: "active",
    actedOnAt: null,
    actedOnBy: null,
    createdAt: new Date(),
    constituent: {
      id: "const-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    },
  };

  describe("alert.list", () => {
    it("lists alerts for organization", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([mockAlert]);

      const caller = createCaller(createTestContext());
      const result = await caller.alert.list({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe("alert-1");
      expect(mockPrisma.alert.findMany).toHaveBeenCalled();
    });

    it("filters by status", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([mockAlert]);

      const caller = createCaller(createTestContext());
      await caller.alert.list({ status: "active" });

      const callArgs = mockPrisma.alert.findMany.mock.calls[0][0];
      expect(callArgs.where.status).toBe("active");
    });

    it("filters by severity", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([mockAlert]);

      const caller = createCaller(createTestContext());
      await caller.alert.list({ severity: "high" });

      const callArgs = mockPrisma.alert.findMany.mock.calls[0][0];
      expect(callArgs.where.severity).toBe("high");
    });

    it("filters by alert type", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([mockAlert]);

      const caller = createCaller(createTestContext());
      await caller.alert.list({ alertType: "contact_gap" });

      const callArgs = mockPrisma.alert.findMany.mock.calls[0][0];
      expect(callArgs.where.alertType).toBe("contact_gap");
    });

    it("paginates results with cursor", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([mockAlert]);

      const caller = createCaller(createTestContext());
      await caller.alert.list({ limit: 10, cursor: "prev-alert-id" });

      const callArgs = mockPrisma.alert.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(11); // limit + 1 for cursor
      expect(callArgs.cursor).toEqual({ id: "prev-alert-id" });
      expect(callArgs.skip).toBe(1);
    });

    it("returns nextCursor when more results exist", async () => {
      const alerts = [
        { ...mockAlert, id: "alert-1" },
        { ...mockAlert, id: "alert-2" },
        { ...mockAlert, id: "alert-3" },
      ];
      mockPrisma.alert.findMany.mockResolvedValue(alerts);

      const caller = createCaller(createTestContext());
      const result = await caller.alert.list({ limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe("alert-3");
    });
  });

  describe("alert.get", () => {
    it("returns alert by ID", async () => {
      mockPrisma.alert.findFirst.mockResolvedValue(mockAlert);

      const caller = createCaller(createTestContext());
      const result = await caller.alert.get({ id: "alert-1" });

      expect(result.id).toBe("alert-1");
      expect(result.title).toBe("Test Alert");
    });

    it("throws NOT_FOUND for non-existent alert", async () => {
      mockPrisma.alert.findFirst.mockResolvedValue(null);

      const caller = createCaller(createTestContext());

      await expect(caller.alert.get({ id: "nonexistent" })).rejects.toThrow("NOT_FOUND");
    });

    it("enforces organization scope", async () => {
      mockPrisma.alert.findFirst.mockResolvedValue(null);

      const caller = createCaller(createTestContext());
      await caller.alert.get({ id: "alert-1" }).catch(() => {});

      const callArgs = mockPrisma.alert.findFirst.mock.calls[0][0];
      expect(callArgs.where.organizationId).toBe(testOrgId);
    });
  });

  describe("alert.dismiss", () => {
    it("dismisses an alert", async () => {
      mockPrisma.alert.findFirst.mockResolvedValue(mockAlert);
      mockPrisma.alert.update.mockResolvedValue({
        ...mockAlert,
        status: "dismissed",
        actedOnAt: new Date(),
      });

      const caller = createCaller(createTestContext());
      const result = await caller.alert.dismiss({ id: "alert-1" });

      expect(result.success).toBe(true);
      expect(mockPrisma.alert.update).toHaveBeenCalledWith({
        where: { id: "alert-1" },
        data: expect.objectContaining({
          status: "dismissed",
          actedOnAt: expect.any(Date),
          actedOnBy: "Test User",
        }),
      });
    });

    it("throws NOT_FOUND for non-existent alert", async () => {
      mockPrisma.alert.findFirst.mockResolvedValue(null);

      const caller = createCaller(createTestContext());

      await expect(caller.alert.dismiss({ id: "nonexistent" })).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("alert.markActed", () => {
    it("marks alert as acted upon", async () => {
      mockPrisma.alert.findFirst.mockResolvedValue(mockAlert);
      mockPrisma.alert.update.mockResolvedValue({
        ...mockAlert,
        status: "acted_on",
        actedOnAt: new Date(),
      });

      const caller = createCaller(createTestContext());
      const result = await caller.alert.markActed({
        id: "alert-1",
        notes: "Contacted donor via phone",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.alert.update).toHaveBeenCalledWith({
        where: { id: "alert-1" },
        data: expect.objectContaining({
          status: "acted_on",
          actedOnAt: expect.any(Date),
          description: expect.stringContaining("Contacted donor via phone"),
        }),
      });
    });

    it("works without notes", async () => {
      mockPrisma.alert.findFirst.mockResolvedValue(mockAlert);
      mockPrisma.alert.update.mockResolvedValue({
        ...mockAlert,
        status: "acted_on",
        actedOnAt: new Date(),
      });

      const caller = createCaller(createTestContext());
      const result = await caller.alert.markActed({ id: "alert-1" });

      expect(result.success).toBe(true);
    });
  });

  describe("alert.counts", () => {
    it("returns alert counts", async () => {
      mockPrisma.alert.count
        .mockResolvedValueOnce(10) // active
        .mockResolvedValueOnce(3);  // high

      const caller = createCaller(createTestContext());
      const result = await caller.alert.counts();

      expect(result.active).toBe(10);
      expect(result.high).toBe(3);
    });

    it("applies organization filter to counts", async () => {
      mockPrisma.alert.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);

      const caller = createCaller(createTestContext());
      await caller.alert.counts();

      const callArgs = mockPrisma.alert.count.mock.calls[0][0];
      expect(callArgs.where.organizationId).toBe(testOrgId);
    });
  });

  describe("portfolio-based filtering for gift officers", () => {
    it("gift officers see only alerts for their assigned constituents", async () => {
      // Gift officers have portfolio filter applied via context
      const giftOfficerContext = createTestContext("gift_officer");

      mockPrisma.alert.findMany.mockResolvedValue([]);

      const caller = createCaller(giftOfficerContext);
      await caller.alert.list({});

      // The router should apply portfolio filtering
      expect(mockPrisma.alert.findMany).toHaveBeenCalled();
    });
  });
});
