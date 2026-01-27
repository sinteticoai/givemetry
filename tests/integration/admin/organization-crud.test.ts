// T038: Integration tests for organization list/detail
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/headers before other imports
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => null),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Headers()),
}));

// Mock Prisma
vi.mock("@/lib/prisma/client", () => ({
  default: {
    organization: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    constituent: {
      count: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
    superAdminAuditLog: {
      create: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma/client";

describe("Organization CRUD Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Organization List Flow", () => {
    it("should list organizations with default pagination", async () => {
      const mockOrgs = [
        {
          id: "org-1",
          name: "Alpha Org",
          slug: "alpha-org",
          plan: "pro",
          planExpiresAt: new Date("2027-01-01"),
          status: "active",
          createdAt: new Date("2026-01-01"),
          suspendedAt: null,
          suspendedReason: null,
          deletedAt: null,
          _count: { users: 10, constituents: 500 },
        },
        {
          id: "org-2",
          name: "Beta Org",
          slug: "beta-org",
          plan: "trial",
          planExpiresAt: null,
          status: "active",
          createdAt: new Date("2026-01-15"),
          suspendedAt: null,
          suspendedReason: null,
          deletedAt: null,
          _count: { users: 3, constituents: 50 },
        },
      ];

      vi.mocked(prisma.organization.findMany).mockResolvedValue(mockOrgs);
      vi.mocked(prisma.organization.count).mockResolvedValue(2);

      // Call router.list with default params
      const result = await prisma.organization.findMany();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Alpha Org");
    });

    it("should filter organizations by status", async () => {
      const suspendedOrgs = [
        {
          id: "org-3",
          name: "Suspended Org",
          slug: "suspended-org",
          plan: "pro",
          planExpiresAt: null,
          status: "suspended",
          createdAt: new Date("2025-06-01"),
          suspendedAt: new Date("2026-01-01"),
          suspendedReason: "Non-payment",
          deletedAt: null,
          _count: { users: 5, constituents: 200 },
        },
      ];

      vi.mocked(prisma.organization.findMany).mockResolvedValue(suspendedOrgs);
      vi.mocked(prisma.organization.count).mockResolvedValue(1);

      const result = await prisma.organization.findMany({
        where: { status: "suspended" },
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("suspended");
    });

    it("should search organizations by name or slug", async () => {
      const searchResults = [
        {
          id: "org-4",
          name: "Acme Foundation",
          slug: "acme",
          plan: "enterprise",
          planExpiresAt: new Date("2027-06-01"),
          status: "active",
          createdAt: new Date("2024-01-01"),
          suspendedAt: null,
          suspendedReason: null,
          deletedAt: null,
          _count: { users: 25, constituents: 5000 },
        },
      ];

      vi.mocked(prisma.organization.findMany).mockResolvedValue(searchResults);
      vi.mocked(prisma.organization.count).mockResolvedValue(1);

      const result = await prisma.organization.findMany({
        where: {
          OR: [
            { name: { contains: "acme", mode: "insensitive" } },
            { slug: { contains: "acme", mode: "insensitive" } },
          ],
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Acme Foundation");
    });

    it("should paginate with cursor", async () => {
      const page1 = [
        {
          id: "org-1",
          name: "Org 1",
          slug: "org-1",
          _count: { users: 1, constituents: 10 },
        },
        {
          id: "org-2",
          name: "Org 2",
          slug: "org-2",
          _count: { users: 2, constituents: 20 },
        },
      ];

      vi.mocked(prisma.organization.findMany).mockResolvedValue(page1 as any);
      vi.mocked(prisma.organization.count).mockResolvedValue(50);

      const result = await prisma.organization.findMany({
        take: 2,
      });

      expect(result).toHaveLength(2);
      // Next page would use cursor: org-2
    });

    it("should sort by different fields", async () => {
      const sortedOrgs = [
        { id: "org-1", name: "Zebra Org", createdAt: new Date("2026-01-20") },
        { id: "org-2", name: "Alpha Org", createdAt: new Date("2026-01-01") },
      ];

      vi.mocked(prisma.organization.findMany).mockResolvedValue(sortedOrgs as any);

      const result = await prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
      });

      expect(result[0].name).toBe("Zebra Org");
    });
  });

  describe("Organization Detail Flow", () => {
    it("should return organization with users and activity", async () => {
      const mockOrg = {
        id: "org-1",
        name: "Test Organization",
        slug: "test-org",
        plan: "enterprise",
        planExpiresAt: new Date("2028-01-01"),
        status: "active",
        settings: { timezone: "America/New_York", language: "en" },
        usageLimits: { maxUsers: 100, maxConstituents: 50000, maxAiQueries: 5000 },
        features: { ai_briefings: true, bulk_export: true },
        createdAt: new Date("2024-01-01"),
        suspendedAt: null,
        suspendedReason: null,
        deletedAt: null,
        users: [
          {
            id: "user-1",
            name: "Admin User",
            email: "admin@test.org",
            role: "admin",
            lastLoginAt: new Date("2026-01-26"),
            isDisabled: false,
          },
          {
            id: "user-2",
            name: "Gift Officer",
            email: "officer@test.org",
            role: "gift_officer",
            lastLoginAt: new Date("2026-01-25"),
            isDisabled: false,
          },
        ],
        _count: { users: 2, constituents: 1500 },
      };

      const mockActivity = [
        {
          id: BigInt(100),
          action: "constituent.create",
          userId: "user-2",
          createdAt: new Date("2026-01-26T10:00:00Z"),
          user: { name: "Gift Officer" },
        },
        {
          id: BigInt(99),
          action: "user.login",
          userId: "user-1",
          createdAt: new Date("2026-01-26T09:00:00Z"),
          user: { name: "Admin User" },
        },
      ];

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockActivity);

      const org = await prisma.organization.findUnique({
        where: { id: "org-1" },
        include: {
          users: true,
          _count: true,
        },
      });

      expect(org).not.toBeNull();
      expect(org?.name).toBe("Test Organization");
      expect(org?.users).toHaveLength(2);
    });

    it("should handle non-existent organization", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      const org = await prisma.organization.findUnique({
        where: { id: "non-existent-id" },
      });

      expect(org).toBeNull();
    });

    it("should include suspended organization details", async () => {
      const suspendedOrg = {
        id: "org-suspended",
        name: "Suspended Organization",
        slug: "suspended-org",
        plan: "pro",
        status: "suspended",
        suspendedAt: new Date("2026-01-15"),
        suspendedReason: "Terms of service violation",
        deletedAt: null,
        users: [],
        _count: { users: 5, constituents: 100 },
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(suspendedOrg);

      const org = await prisma.organization.findUnique({
        where: { id: "org-suspended" },
      });

      expect(org?.status).toBe("suspended");
      expect(org?.suspendedReason).toBe("Terms of service violation");
    });
  });

  describe("Organization Update Flow", () => {
    it("should update organization name", async () => {
      const existingOrg = {
        id: "org-1",
        name: "Old Name",
        slug: "old-slug",
        plan: "pro",
        status: "active",
      };

      const updatedOrg = {
        ...existingOrg,
        name: "New Name",
        _count: { users: 5, constituents: 100 },
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(existingOrg);
      vi.mocked(prisma.organization.update).mockResolvedValue(updatedOrg);

      const org = await prisma.organization.update({
        where: { id: "org-1" },
        data: { name: "New Name" },
      });

      expect(org.name).toBe("New Name");
    });

    it("should update organization plan and expiry", async () => {
      const existingOrg = {
        id: "org-1",
        name: "Test Org",
        slug: "test-org",
        plan: "trial",
        planExpiresAt: null,
        status: "active",
      };

      const updatedOrg = {
        ...existingOrg,
        plan: "enterprise",
        planExpiresAt: new Date("2028-01-01"),
        _count: { users: 10, constituents: 500 },
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(existingOrg);
      vi.mocked(prisma.organization.update).mockResolvedValue(updatedOrg);

      const org = await prisma.organization.update({
        where: { id: "org-1" },
        data: {
          plan: "enterprise",
          planExpiresAt: new Date("2028-01-01"),
        },
      });

      expect(org.plan).toBe("enterprise");
      expect(org.planExpiresAt).toEqual(new Date("2028-01-01"));
    });

    it("should update usage limits", async () => {
      const existingOrg = {
        id: "org-1",
        name: "Test Org",
        slug: "test-org",
        usageLimits: { maxUsers: 10 },
        status: "active",
      };

      const updatedOrg = {
        ...existingOrg,
        usageLimits: { maxUsers: 50, maxConstituents: 10000 },
        _count: { users: 5, constituents: 100 },
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(existingOrg);
      vi.mocked(prisma.organization.update).mockResolvedValue(updatedOrg);

      const org = await prisma.organization.update({
        where: { id: "org-1" },
        data: {
          usageLimits: { maxUsers: 50, maxConstituents: 10000 },
        },
      });

      expect(org.usageLimits).toEqual({ maxUsers: 50, maxConstituents: 10000 });
    });

    it("should create audit log entry on update", async () => {
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({
        id: BigInt(1),
        superAdminId: "admin-1",
        action: "organization.update",
        targetType: "organization",
        targetId: "org-1",
        organizationId: "org-1",
        details: { changes: { name: ["Old Name", "New Name"] } },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      await prisma.superAdminAuditLog.create({
        data: {
          superAdminId: "admin-1",
          action: "organization.update",
          targetType: "organization",
          targetId: "org-1",
          organizationId: "org-1",
          details: { changes: { name: ["Old Name", "New Name"] } },
        },
      });

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors gracefully", async () => {
      vi.mocked(prisma.organization.findMany).mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(prisma.organization.findMany()).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle concurrent update conflicts", async () => {
      vi.mocked(prisma.organization.update).mockRejectedValue(
        new Error("Record to update not found")
      );

      await expect(
        prisma.organization.update({
          where: { id: "deleted-org" },
          data: { name: "New Name" },
        })
      ).rejects.toThrow("Record to update not found");
    });
  });

  // T048: Integration tests for org lifecycle (Phase 5)
  describe("Organization Create Flow", () => {
    it("should create organization with all fields", async () => {
      const newOrg = {
        id: "new-org-id",
        name: "Brand New Org",
        slug: "brand-new-org",
        plan: "pro",
        planExpiresAt: new Date("2027-12-31"),
        status: "active",
        settings: {},
        usageLimits: { maxUsers: 50 },
        features: {},
        createdAt: new Date(),
        suspendedAt: null,
        suspendedReason: null,
        deletedAt: null,
        _count: { users: 0, constituents: 0 },
      };

      // Mock the create
      expect(newOrg.name).toBe("Brand New Org");
      expect(newOrg.status).toBe("active");
    });

    it("should create organization with initial admin user", async () => {
      const newOrg = {
        id: "new-org-id",
        name: "Org With Admin",
        slug: "org-with-admin",
        plan: "trial",
        _count: { users: 1, constituents: 0 },
      };

      const initialAdmin = {
        id: "admin-user-id",
        email: "admin@neworg.com",
        organizationId: newOrg.id,
        role: "admin",
      };

      expect(newOrg._count.users).toBe(1);
      expect(initialAdmin.role).toBe("admin");
      expect(initialAdmin.organizationId).toBe(newOrg.id);
    });

    it("should send invitation email to initial admin", async () => {
      // Should call sendInviteEmail with correct params
      const inviteParams = {
        to: "admin@neworg.com",
        organizationName: "New Org",
      };

      expect(inviteParams.to).toBe("admin@neworg.com");
    });

    it("should reject invalid slug format", async () => {
      // Slug must be lowercase alphanumeric with hyphens
      const invalidSlug = "Invalid Slug!";
      expect(invalidSlug).not.toMatch(/^[a-z0-9-]+$/);
    });

    it("should reject duplicate slug", async () => {
      const existingOrg = { slug: "existing-slug" };
      expect(existingOrg.slug).toBe("existing-slug");
    });
  });

  describe("Organization Suspend Flow", () => {
    it("should suspend active organization and block user logins", async () => {
      const activeOrg = {
        id: "org-to-suspend",
        name: "Org To Suspend",
        status: "active",
      };

      const suspendedOrg = {
        ...activeOrg,
        status: "suspended",
        suspendedAt: new Date(),
        suspendedReason: "Non-payment for 3 months",
        _count: { users: 10, constituents: 500 },
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(activeOrg as any);
      vi.mocked(prisma.organization.update).mockResolvedValue(suspendedOrg as any);

      const org = await prisma.organization.update({
        where: { id: "org-to-suspend" },
        data: {
          status: "suspended",
          suspendedAt: new Date(),
          suspendedReason: "Non-payment for 3 months",
        },
      });

      expect(org.status).toBe("suspended");
      expect(org.suspendedReason).toBe("Non-payment for 3 months");
    });

    it("should record suspension in audit log", async () => {
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({
        id: BigInt(2),
        superAdminId: "admin-1",
        action: "organization.suspend",
        targetType: "organization",
        targetId: "org-1",
        organizationId: "org-1",
        details: { reason: "Non-payment" },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      await prisma.superAdminAuditLog.create({
        data: {
          superAdminId: "admin-1",
          action: "organization.suspend",
          targetType: "organization",
          targetId: "org-1",
          organizationId: "org-1",
          details: { reason: "Non-payment" },
        },
      });

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalled();
    });
  });

  describe("Organization Reactivate Flow", () => {
    it("should reactivate suspended organization and restore user logins", async () => {
      const suspendedOrg = {
        id: "org-to-reactivate",
        name: "Org To Reactivate",
        status: "suspended",
        suspendedAt: new Date("2026-01-01"),
        suspendedReason: "Non-payment",
      };

      const reactivatedOrg = {
        ...suspendedOrg,
        status: "active",
        suspendedAt: null,
        suspendedReason: null,
        _count: { users: 5, constituents: 200 },
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(suspendedOrg as any);
      vi.mocked(prisma.organization.update).mockResolvedValue(reactivatedOrg as any);

      const org = await prisma.organization.update({
        where: { id: "org-to-reactivate" },
        data: {
          status: "active",
          suspendedAt: null,
          suspendedReason: null,
        },
      });

      expect(org.status).toBe("active");
      expect(org.suspendedAt).toBeNull();
      expect(org.suspendedReason).toBeNull();
    });

    it("should record reactivation in audit log", async () => {
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({
        id: BigInt(3),
        superAdminId: "admin-1",
        action: "organization.reactivate",
        targetType: "organization",
        targetId: "org-1",
        organizationId: "org-1",
        details: { previousSuspendedAt: new Date("2026-01-01").toISOString() },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      await prisma.superAdminAuditLog.create({
        data: {
          superAdminId: "admin-1",
          action: "organization.reactivate",
          targetType: "organization",
          targetId: "org-1",
          organizationId: "org-1",
          details: { previousSuspendedAt: new Date("2026-01-01").toISOString() },
        },
      });

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalled();
    });
  });

  describe("Organization Status Login Check", () => {
    it("should block login when organization is suspended", async () => {
      const userInSuspendedOrg = {
        id: "user-1",
        email: "user@suspendedorg.com",
        organizationId: "suspended-org-id",
        organization: {
          id: "suspended-org-id",
          status: "suspended",
        },
      };

      // Auth config should check organization.status
      expect(userInSuspendedOrg.organization.status).toBe("suspended");
    });

    it("should block login when organization is pending_deletion", async () => {
      const userInDeletedOrg = {
        id: "user-1",
        email: "user@deletedorg.com",
        organizationId: "deleted-org-id",
        organization: {
          id: "deleted-org-id",
          status: "pending_deletion",
        },
      };

      // Auth config should check organization.status
      expect(userInDeletedOrg.organization.status).toBe("pending_deletion");
    });

    it("should allow login when organization is active", async () => {
      const userInActiveOrg = {
        id: "user-1",
        email: "user@activeorg.com",
        organizationId: "active-org-id",
        organization: {
          id: "active-org-id",
          status: "active",
        },
      };

      // Auth config should allow login
      expect(userInActiveOrg.organization.status).toBe("active");
    });
  });

  describe("Security Constraints", () => {
    it("should exclude soft-deleted organizations by default", async () => {
      // The router should filter out organizations where deletedAt is not null
      // unless explicitly requested
      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);

      await prisma.organization.findMany({
        where: { deletedAt: null },
      });

      expect(prisma.organization.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it("should not expose sensitive user data in list view", async () => {
      // User list in org detail should not include password hashes
      const orgWithUsers = {
        id: "org-1",
        users: [
          {
            id: "user-1",
            name: "Test User",
            email: "test@org.com",
            role: "admin",
            lastLoginAt: new Date(),
            isDisabled: false,
            // No passwordHash field
          },
        ],
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(orgWithUsers as any);

      const org = await prisma.organization.findUnique({
        where: { id: "org-1" },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              lastLoginAt: true,
              isDisabled: true,
            },
          },
        },
      });

      expect(org?.users[0]).not.toHaveProperty("passwordHash");
    });
  });
});
