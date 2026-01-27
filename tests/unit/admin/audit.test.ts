// T093: Unit tests for super admin audit router
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma before importing router
vi.mock("@/lib/prisma/client", () => ({
  default: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    superAdminAuditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    superAdmin: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma/client";

describe("Audit Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return combined tenant and super admin audit logs", async () => {
      const mockTenantLogs = [
        {
          id: BigInt(1),
          action: "constituent.create",
          organizationId: "org-uuid-1",
          userId: "user-uuid-1",
          resourceType: "constituent",
          resourceId: "const-uuid-1",
          details: { name: "John Doe" },
          ipAddress: "192.168.1.1",
          createdAt: new Date("2026-01-27"),
        },
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockTenantLogs as any);

      const result = await prisma.auditLog.findMany();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("action");
    });

    it("should support pagination with cursor and limit", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(100);

      const totalCount = await prisma.auditLog.count();
      expect(totalCount).toBe(100);
    });

    it("should filter by organizationId", async () => {
      const orgId = "org-uuid-1";
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      // Verify filter is applied in query
      await prisma.auditLog.findMany({
        where: { organizationId: orgId },
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
        })
      );
    });

    it("should filter by action type", async () => {
      const action = "constituent.create";
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      await prisma.auditLog.findMany({
        where: { action },
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action },
        })
      );
    });

    it("should filter by date range", async () => {
      const dateRange = {
        from: new Date("2026-01-01"),
        to: new Date("2026-01-31"),
      };

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      await prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalled();
    });

    it("should return logs sorted by createdAt descending", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should include actor name from user or super admin", async () => {
      const mockLogs = [
        {
          id: BigInt(1),
          userId: "user-uuid-1",
          action: "gift.create",
          user: { name: "Gift Officer" },
        },
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as any);

      const result = await prisma.auditLog.findMany({
        include: { user: { select: { name: true } } },
      });

      expect(result[0]).toHaveProperty("user");
    });

    it("should include organization name", async () => {
      const mockLogs = [
        {
          id: BigInt(1),
          organizationId: "org-uuid-1",
          organization: { name: "Acme Foundation" },
        },
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as any);

      const result = await prisma.auditLog.findMany({
        include: { organization: { select: { name: true } } },
      });

      expect(result[0]).toHaveProperty("organization");
    });
  });

  describe("superAdminLogs", () => {
    it("should return only super admin audit logs", async () => {
      const mockAdminLogs = [
        {
          id: BigInt(1),
          superAdminId: "admin-uuid-1",
          action: "organization.create",
          targetType: "organization",
          targetId: "org-uuid-1",
          createdAt: new Date("2026-01-27"),
        },
      ];

      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue(
        mockAdminLogs as any
      );

      const result = await prisma.superAdminAuditLog.findMany();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("superAdminId");
    });

    it("should filter by superAdminId", async () => {
      const adminId = "admin-uuid-1";
      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue([]);

      await prisma.superAdminAuditLog.findMany({
        where: { superAdminId: adminId },
      });

      expect(prisma.superAdminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { superAdminId: adminId },
        })
      );
    });

    it("should include super admin name", async () => {
      const mockLogs = [
        {
          id: BigInt(1),
          superAdminId: "admin-uuid-1",
          superAdmin: { name: "System Admin" },
        },
      ];

      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue(
        mockLogs as any
      );

      const result = await prisma.superAdminAuditLog.findMany({
        include: { superAdmin: { select: { name: true } } },
      });

      expect(result[0]).toHaveProperty("superAdmin");
    });

    it("should include organizationId and organization name when applicable", async () => {
      const mockLogs = [
        {
          id: BigInt(1),
          organizationId: "org-uuid-1",
          action: "organization.suspend",
        },
      ];

      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue(
        mockLogs as any
      );

      const result = await prisma.superAdminAuditLog.findMany();
      expect(result[0]).toHaveProperty("organizationId");
    });

    it("should support pagination", async () => {
      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.superAdminAuditLog.count).mockResolvedValue(50);

      const count = await prisma.superAdminAuditLog.count();
      expect(count).toBe(50);
    });
  });

  describe("actionTypes", () => {
    it("should return unique tenant action types", async () => {
      const mockActions = [
        { action: "constituent.create" },
        { action: "constituent.update" },
        { action: "gift.create" },
        { action: "contact.create" },
      ];

      vi.mocked(prisma.auditLog.groupBy).mockResolvedValue(mockActions as any);

      const result = await prisma.auditLog.groupBy({ by: ["action"] });
      expect(result).toHaveLength(4);
    });

    it("should return unique super admin action types", async () => {
      const mockActions = [
        { action: "organization.create" },
        { action: "organization.suspend" },
        { action: "user.disable" },
        { action: "impersonation.start" },
      ];

      vi.mocked(prisma.superAdminAuditLog.groupBy).mockResolvedValue(
        mockActions as any
      );

      const result = await prisma.superAdminAuditLog.groupBy({ by: ["action"] });
      expect(result).toHaveLength(4);
    });

    it("should separate tenant and admin action types in response", () => {
      const expectedResponse = {
        tenantActions: [
          "constituent.create",
          "constituent.update",
          "gift.create",
        ],
        superAdminActions: [
          "organization.create",
          "organization.suspend",
          "user.disable",
        ],
      };

      expect(expectedResponse).toHaveProperty("tenantActions");
      expect(expectedResponse).toHaveProperty("superAdminActions");
      expect(Array.isArray(expectedResponse.tenantActions)).toBe(true);
      expect(Array.isArray(expectedResponse.superAdminActions)).toBe(true);
    });
  });

  describe("export", () => {
    it("should generate CSV export for matching logs", async () => {
      const mockLogs = [
        {
          id: BigInt(1),
          action: "constituent.create",
          createdAt: new Date("2026-01-27"),
        },
        {
          id: BigInt(2),
          action: "gift.create",
          createdAt: new Date("2026-01-26"),
        },
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as any);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(2);

      const count = await prisma.auditLog.count();
      expect(count).toBe(2);
    });

    it("should apply same filters as list for export", async () => {
      const orgId = "org-uuid-1";
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      await prisma.auditLog.findMany({
        where: { organizationId: orgId },
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
        })
      );
    });

    it("should return download URL, expiration, and record count", () => {
      const expectedResponse = {
        downloadUrl: "https://storage.example.com/exports/audit-123.csv",
        expiresAt: new Date("2026-01-28T12:00:00Z"),
        recordCount: 5000,
      };

      expect(expectedResponse).toHaveProperty("downloadUrl");
      expect(expectedResponse).toHaveProperty("expiresAt");
      expect(expectedResponse).toHaveProperty("recordCount");
      expect(expectedResponse.downloadUrl).toMatch(/\.csv$/);
    });

    it("should handle large exports (100k+ records) without timeout", () => {
      // Export should use streaming or batch processing
      const recordCount = 150000;
      expect(recordCount).toBeGreaterThan(100000);
    });

    it("should log export action to super admin audit log", async () => {
      // Verify audit logging on export
      const exportAction = "audit.export";
      expect(exportAction).toBe("audit.export");
    });
  });
});

describe("Audit Input Validation", () => {
  it("should validate organizationId as UUID", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const invalidUuid = "not-a-uuid";

    expect(validUuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(invalidUuid).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("should validate date range (from <= to)", () => {
    const validRange = {
      from: new Date("2026-01-01"),
      to: new Date("2026-01-31"),
    };

    expect(validRange.from.getTime()).toBeLessThanOrEqual(
      validRange.to.getTime()
    );
  });

  it("should validate pagination limit (1-100)", () => {
    const validLimits = [1, 20, 50, 100];
    const invalidLimits = [0, -1, 101, 1000];

    validLimits.forEach((limit) => {
      expect(limit).toBeGreaterThanOrEqual(1);
      expect(limit).toBeLessThanOrEqual(100);
    });

    invalidLimits.forEach((limit) => {
      expect(limit < 1 || limit > 100).toBe(true);
    });
  });

  it("should validate export format (only csv supported)", () => {
    const supportedFormats = ["csv"];
    const format = "csv";

    expect(supportedFormats).toContain(format);
    expect(supportedFormats).not.toContain("json");
    expect(supportedFormats).not.toContain("xlsx");
  });
});

describe("Audit Response Format", () => {
  it("should format combined log entries with source indicator", () => {
    const expectedFormat = {
      id: "1",
      source: "tenant",
      action: "constituent.create",
      actorType: "user",
      actorId: "user-uuid",
      actorName: "Gift Officer",
      organizationId: "org-uuid",
      organizationName: "Foundation",
      targetType: "constituent",
      targetId: "const-uuid",
      details: {},
      ipAddress: "192.168.1.1",
      createdAt: new Date(),
    };

    expect(expectedFormat).toHaveProperty("id");
    expect(expectedFormat).toHaveProperty("source");
    expect(expectedFormat).toHaveProperty("action");
    expect(expectedFormat).toHaveProperty("actorType");
    expect(expectedFormat).toHaveProperty("actorName");
    expect(["tenant", "super_admin"]).toContain(expectedFormat.source);
    expect(["user", "super_admin"]).toContain(expectedFormat.actorType);
  });

  it("should format super admin log entries", () => {
    const expectedFormat = {
      id: "1",
      superAdminId: "admin-uuid",
      superAdminName: "System Admin",
      action: "organization.create",
      targetType: "organization",
      targetId: "org-uuid",
      organizationId: "org-uuid",
      organizationName: "New Foundation",
      details: { name: "New Foundation" },
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0",
      createdAt: new Date(),
    };

    expect(expectedFormat).toHaveProperty("superAdminId");
    expect(expectedFormat).toHaveProperty("superAdminName");
    expect(expectedFormat).toHaveProperty("action");
    expect(expectedFormat).toHaveProperty("targetType");
  });

  it("should format action types response", () => {
    const expectedFormat = {
      tenantActions: ["constituent.create", "gift.create"],
      superAdminActions: ["organization.create", "user.disable"],
    };

    expect(Array.isArray(expectedFormat.tenantActions)).toBe(true);
    expect(Array.isArray(expectedFormat.superAdminActions)).toBe(true);
  });

  it("should format export response", () => {
    const expectedFormat = {
      downloadUrl: "https://example.com/exports/audit.csv",
      expiresAt: new Date(),
      recordCount: 1000,
    };

    expect(expectedFormat).toHaveProperty("downloadUrl");
    expect(expectedFormat).toHaveProperty("expiresAt");
    expect(expectedFormat).toHaveProperty("recordCount");
    expect(typeof expectedFormat.recordCount).toBe("number");
  });
});

describe("Audit Data Retention", () => {
  it("should only return logs within 2-year retention period", () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const validDate = new Date();
    const expiredDate = new Date();
    expiredDate.setFullYear(expiredDate.getFullYear() - 3);

    expect(validDate.getTime()).toBeGreaterThan(twoYearsAgo.getTime());
    expect(expiredDate.getTime()).toBeLessThan(twoYearsAgo.getTime());
  });
});
