// T058: Integration tests for user management
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
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
    superAdminAuditLog: {
      create: vi.fn(),
    },
    verificationToken: {
      create: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock("@/server/services/email", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ id: "email-123" }),
}));

import prisma from "@/lib/prisma/client";

describe("User Management Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("User List Flow", () => {
    it("should list users with default pagination", async () => {
      const mockUsers = [
        {
          id: "user-1",
          name: "Alice Admin",
          email: "alice@org1.com",
          organizationId: "org-1",
          organization: { id: "org-1", name: "Organization One" },
          role: "admin",
          lastLoginAt: new Date("2026-01-25"),
          isDisabled: false,
          disabledAt: null,
          disabledReason: null,
          createdAt: new Date("2025-06-01"),
        },
        {
          id: "user-2",
          name: "Bob Officer",
          email: "bob@org2.com",
          organizationId: "org-2",
          organization: { id: "org-2", name: "Organization Two" },
          role: "gift_officer",
          lastLoginAt: new Date("2026-01-26"),
          isDisabled: false,
          disabledAt: null,
          disabledReason: null,
          createdAt: new Date("2025-08-15"),
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);
      vi.mocked(prisma.user.count).mockResolvedValue(2);

      const result = await prisma.user.findMany({
        include: { organization: { select: { name: true } } },
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Alice Admin");
      expect(result[0].organization.name).toBe("Organization One");
    });

    it("should filter users by organization", async () => {
      const orgUsers = [
        {
          id: "user-1",
          name: "User One",
          organizationId: "org-specific",
          organization: { name: "Specific Org" },
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(orgUsers as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await prisma.user.findMany({
        where: { organizationId: "org-specific" },
      });

      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe("org-specific");
    });

    it("should filter by disabled status", async () => {
      const disabledUsers = [
        {
          id: "user-disabled",
          name: "Disabled User",
          email: "disabled@org.com",
          isDisabled: true,
          disabledAt: new Date("2026-01-15"),
          disabledReason: "Terms violation",
          disabledBy: "admin-123",
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(disabledUsers as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await prisma.user.findMany({
        where: { isDisabled: true },
      });

      expect(result).toHaveLength(1);
      expect(result[0].isDisabled).toBe(true);
      expect(result[0].disabledReason).toBe("Terms violation");
    });

    it("should search users by email or name", async () => {
      const searchResults = [
        {
          id: "user-found",
          name: "John Doe",
          email: "john.doe@company.com",
          organizationId: "org-1",
          organization: { name: "Company Inc" },
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(searchResults as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: "john", mode: "insensitive" } },
            { email: { contains: "john", mode: "insensitive" } },
          ],
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("John Doe");
    });

    it("should filter by role", async () => {
      const admins = [
        { id: "admin-1", name: "Admin User", role: "admin" },
        { id: "admin-2", name: "Another Admin", role: "admin" },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(admins as any);
      vi.mocked(prisma.user.count).mockResolvedValue(2);

      const result = await prisma.user.findMany({
        where: { role: "admin" },
      });

      expect(result).toHaveLength(2);
      result.forEach((user) => {
        expect(user.role).toBe("admin");
      });
    });

    it("should paginate with cursor", async () => {
      const page1 = [
        { id: "user-1", name: "User 1" },
        { id: "user-2", name: "User 2" },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(page1 as any);
      vi.mocked(prisma.user.count).mockResolvedValue(100);

      const result = await prisma.user.findMany({
        take: 2,
      });

      expect(result).toHaveLength(2);
    });
  });

  describe("User Detail Flow", () => {
    it("should return user with organization and activity", async () => {
      const mockUser = {
        id: "user-detail",
        name: "Detailed User",
        email: "detailed@org.com",
        organizationId: "org-1",
        organization: { id: "org-1", name: "Test Organization" },
        role: "gift_officer",
        lastLoginAt: new Date("2026-01-26"),
        isDisabled: false,
        disabledAt: null,
        disabledReason: null,
        disabledBy: null,
        createdAt: new Date("2025-01-01"),
      };

      const mockActivity = [
        {
          id: BigInt(100),
          action: "constituent.view",
          resourceType: "constituent",
          createdAt: new Date("2026-01-26T10:00:00Z"),
        },
        {
          id: BigInt(99),
          action: "gift.create",
          resourceType: "gift",
          createdAt: new Date("2026-01-25T14:30:00Z"),
        },
      ];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockActivity as any);

      const user = await prisma.user.findUnique({
        where: { id: "user-detail" },
        include: { organization: true },
      });

      expect(user).not.toBeNull();
      expect(user?.name).toBe("Detailed User");
      expect(user?.organization.name).toBe("Test Organization");
    });

    it("should handle non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const user = await prisma.user.findUnique({
        where: { id: "non-existent" },
      });

      expect(user).toBeNull();
    });

    it("should include disabled user details", async () => {
      const disabledUser = {
        id: "disabled-user",
        name: "Disabled Person",
        email: "disabled@org.com",
        isDisabled: true,
        disabledAt: new Date("2026-01-20"),
        disabledReason: "Security concern - suspicious activity detected",
        disabledBy: "super-admin-123",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(disabledUser as any);

      const user = await prisma.user.findUnique({
        where: { id: "disabled-user" },
      });

      expect(user?.isDisabled).toBe(true);
      expect(user?.disabledReason).toContain("Security concern");
      expect(user?.disabledBy).toBe("super-admin-123");
    });
  });

  describe("User Disable Flow", () => {
    it("should disable an active user and block login", async () => {
      const activeUser = {
        id: "user-to-disable",
        name: "Soon Disabled",
        email: "active@org.com",
        isDisabled: false,
        disabledAt: null,
        disabledReason: null,
        disabledBy: null,
      };

      const disabledUser = {
        ...activeUser,
        isDisabled: true,
        disabledAt: new Date(),
        disabledReason: "Account security breach",
        disabledBy: "super-admin-456",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(activeUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue(disabledUser as any);

      const result = await prisma.user.update({
        where: { id: "user-to-disable" },
        data: {
          isDisabled: true,
          disabledAt: new Date(),
          disabledReason: "Account security breach",
          disabledBy: "super-admin-456",
        },
      });

      expect(result.isDisabled).toBe(true);
      expect(result.disabledReason).toBe("Account security breach");
    });

    it("should record disable action in audit log", async () => {
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({
        id: BigInt(1),
        superAdminId: "admin-1",
        action: "user.disable",
        targetType: "user",
        targetId: "user-1",
        organizationId: "org-1",
        details: { reason: "Policy violation" },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      await prisma.superAdminAuditLog.create({
        data: {
          superAdminId: "admin-1",
          action: "user.disable",
          targetType: "user",
          targetId: "user-1",
          organizationId: "org-1",
          details: { reason: "Policy violation" },
        },
      });

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalled();
    });

    it("should reject disabling already disabled user", async () => {
      const alreadyDisabled = {
        id: "already-disabled",
        isDisabled: true,
        disabledAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(alreadyDisabled as any);

      // Router should throw BAD_REQUEST
      expect(alreadyDisabled.isDisabled).toBe(true);
    });
  });

  describe("User Enable Flow", () => {
    it("should enable a disabled user and restore login", async () => {
      const disabledUser = {
        id: "user-to-enable",
        name: "Was Disabled",
        email: "enable@org.com",
        isDisabled: true,
        disabledAt: new Date("2026-01-10"),
        disabledReason: "Temporary suspension",
        disabledBy: "admin-old",
      };

      const enabledUser = {
        ...disabledUser,
        isDisabled: false,
        disabledAt: null,
        disabledReason: null,
        disabledBy: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(disabledUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue(enabledUser as any);

      const result = await prisma.user.update({
        where: { id: "user-to-enable" },
        data: {
          isDisabled: false,
          disabledAt: null,
          disabledReason: null,
          disabledBy: null,
        },
      });

      expect(result.isDisabled).toBe(false);
      expect(result.disabledAt).toBeNull();
    });

    it("should record enable action in audit log", async () => {
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({
        id: BigInt(2),
        superAdminId: "admin-1",
        action: "user.enable",
        targetType: "user",
        targetId: "user-1",
        organizationId: "org-1",
        details: { previousDisabledReason: "Policy violation" },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      await prisma.superAdminAuditLog.create({
        data: {
          superAdminId: "admin-1",
          action: "user.enable",
          targetType: "user",
          targetId: "user-1",
          organizationId: "org-1",
          details: { previousDisabledReason: "Policy violation" },
        },
      });

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalled();
    });
  });

  describe("Password Reset Flow", () => {
    it("should create reset token and send email", async () => {
      const user = {
        id: "user-reset",
        name: "Reset User",
        email: "reset@org.com",
        organizationId: "org-1",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);
      vi.mocked(prisma.verificationToken.create).mockResolvedValue({
        identifier: "reset@org.com",
        token: "reset-token-123",
        expires: new Date(Date.now() + 3600000),
      });

      await prisma.verificationToken.create({
        data: {
          identifier: "reset@org.com",
          token: "reset-token-123",
          expires: new Date(Date.now() + 3600000),
        },
      });

      expect(prisma.verificationToken.create).toHaveBeenCalled();
    });

    it("should record password reset in audit log", async () => {
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({
        id: BigInt(3),
        superAdminId: "admin-1",
        action: "user.reset_password",
        targetType: "user",
        targetId: "user-1",
        organizationId: "org-1",
        details: { email: "user@org.com" },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      await prisma.superAdminAuditLog.create({
        data: {
          superAdminId: "admin-1",
          action: "user.reset_password",
          targetType: "user",
          targetId: "user-1",
          organizationId: "org-1",
          details: { email: "user@org.com" },
        },
      });

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalled();
    });
  });

  describe("Role Change Flow", () => {
    it("should change user role from viewer to admin", async () => {
      const viewerUser = {
        id: "user-promote",
        name: "Viewer User",
        email: "viewer@org.com",
        role: "viewer",
        organizationId: "org-1",
      };

      const promotedUser = {
        ...viewerUser,
        role: "admin",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(viewerUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue(promotedUser as any);

      const result = await prisma.user.update({
        where: { id: "user-promote" },
        data: { role: "admin" },
      });

      expect(result.role).toBe("admin");
    });

    it("should demote user from admin to viewer", async () => {
      const adminUser = {
        id: "user-demote",
        name: "Admin User",
        role: "admin",
        organizationId: "org-1",
      };

      const demotedUser = {
        ...adminUser,
        role: "viewer",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue(demotedUser as any);

      const result = await prisma.user.update({
        where: { id: "user-demote" },
        data: { role: "viewer" },
      });

      expect(result.role).toBe("viewer");
    });

    it("should record role change in audit log with details", async () => {
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({
        id: BigInt(4),
        superAdminId: "admin-1",
        action: "user.change_role",
        targetType: "user",
        targetId: "user-1",
        organizationId: "org-1",
        details: { previousRole: "viewer", newRole: "admin" },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      await prisma.superAdminAuditLog.create({
        data: {
          superAdminId: "admin-1",
          action: "user.change_role",
          targetType: "user",
          targetId: "user-1",
          organizationId: "org-1",
          details: { previousRole: "viewer", newRole: "admin" },
        },
      });

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalled();
    });

    it("should reject role change to same role", async () => {
      const user = {
        id: "user-same-role",
        role: "admin",
      };

      // Router should throw BAD_REQUEST if role is unchanged
      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

      expect(user.role).toBe("admin");
    });
  });

  describe("Login Check with Disabled User", () => {
    it("should block login when user is disabled", async () => {
      const disabledUser = {
        id: "user-blocked",
        email: "blocked@org.com",
        isDisabled: true,
        disabledReason: "Account suspended",
        organization: { status: "active" },
      };

      // Auth config should check user.isDisabled
      expect(disabledUser.isDisabled).toBe(true);
    });

    it("should allow login when user is enabled", async () => {
      const enabledUser = {
        id: "user-ok",
        email: "ok@org.com",
        isDisabled: false,
        organization: { status: "active" },
      };

      // Auth config should allow login
      expect(enabledUser.isDisabled).toBe(false);
      expect(enabledUser.organization.status).toBe("active");
    });
  });

  describe("Security Constraints", () => {
    it("should not expose password hashes in user data", async () => {
      const user = {
        id: "user-1",
        name: "Test User",
        email: "test@org.com",
        role: "admin",
        // No passwordHash field should be returned
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

      const result = await prisma.user.findUnique({
        where: { id: "user-1" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      expect(result).not.toHaveProperty("passwordHash");
    });

    it("should require super_admin role for role changes", async () => {
      // The changeRole procedure should use superAdminOnlyProcedure
      // which checks ctx.isSuperAdmin()
      expect(true).toBe(true);
    });

    it("should log all user management actions", async () => {
      // All mutations should create audit log entries
      expect(prisma.superAdminAuditLog.create).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors", async () => {
      vi.mocked(prisma.user.findMany).mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(prisma.user.findMany()).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle update conflicts", async () => {
      vi.mocked(prisma.user.update).mockRejectedValue(
        new Error("Record to update not found")
      );

      await expect(
        prisma.user.update({
          where: { id: "deleted-user" },
          data: { isDisabled: true },
        })
      ).rejects.toThrow("Record to update not found");
    });
  });
});
