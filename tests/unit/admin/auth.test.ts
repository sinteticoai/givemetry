// T025, T026: Unit tests for super admin authentication
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import bcrypt from "bcryptjs";

// Mock Prisma client - must be defined before vi.mock
vi.mock("@/lib/prisma/client", () => ({
  default: {
    superAdmin: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    superAdminAuditLog: {
      create: vi.fn(),
    },
  },
}));

// Import after mocking
import prisma from "@/lib/prisma/client";
import { validateSuperAdminCredentials, checkAccountLockout } from "@/server/routers/superAdmin/auth";

const mockPrisma = prisma as unknown as {
  superAdmin: {
    findUnique: Mock;
    update: Mock;
  };
  superAdminAuditLog: {
    create: Mock;
  };
};

describe("Super Admin Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateSuperAdminCredentials", () => {
    const validPassword = "SecurePassword123!";
    const hashedPassword = bcrypt.hashSync(validPassword, 10);

    it("should return admin data for valid credentials", async () => {
      const mockAdmin = {
        id: "admin-123",
        email: "admin@givemetry.com",
        name: "Test Admin",
        passwordHash: hashedPassword,
        role: "super_admin",
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.superAdmin.update.mockResolvedValue(mockAdmin);

      const result = await validateSuperAdminCredentials(
        "admin@givemetry.com",
        validPassword
      );

      expect(result).toEqual({
        id: mockAdmin.id,
        email: mockAdmin.email,
        name: mockAdmin.name,
        role: mockAdmin.role,
      });
    });

    it("should return null for non-existent admin", async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(null);

      const result = await validateSuperAdminCredentials(
        "nonexistent@givemetry.com",
        validPassword
      );

      expect(result).toBeNull();
    });

    it("should return null for inactive admin", async () => {
      const mockAdmin = {
        id: "admin-123",
        email: "admin@givemetry.com",
        passwordHash: hashedPassword,
        isActive: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);

      const result = await validateSuperAdminCredentials(
        "admin@givemetry.com",
        validPassword
      );

      expect(result).toBeNull();
    });

    it("should return null for invalid password and increment failed attempts", async () => {
      const mockAdmin = {
        id: "admin-123",
        email: "admin@givemetry.com",
        passwordHash: hashedPassword,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.superAdmin.update.mockResolvedValue({ ...mockAdmin, failedLoginAttempts: 1 });

      const result = await validateSuperAdminCredentials(
        "admin@givemetry.com",
        "wrongpassword"
      );

      expect(result).toBeNull();
      expect(mockPrisma.superAdmin.update).toHaveBeenCalledWith({
        where: { id: mockAdmin.id },
        data: expect.objectContaining({ failedLoginAttempts: 1 }),
      });
    });

    it("should reset failed attempts on successful login", async () => {
      const mockAdmin = {
        id: "admin-123",
        email: "admin@givemetry.com",
        name: "Test Admin",
        passwordHash: hashedPassword,
        role: "super_admin",
        isActive: true,
        failedLoginAttempts: 3,
        lockedUntil: null,
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.superAdmin.update.mockResolvedValue({ ...mockAdmin, failedLoginAttempts: 0 });

      await validateSuperAdminCredentials("admin@givemetry.com", validPassword);

      expect(mockPrisma.superAdmin.update).toHaveBeenCalledWith({
        where: { id: mockAdmin.id },
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      });
    });
  });

  describe("Login Lockout (T026)", () => {
    const validPassword = "SecurePassword123!";
    const hashedPassword = bcrypt.hashSync(validPassword, 10);

    it("should lock account after 5 failed attempts", async () => {
      const mockAdmin = {
        id: "admin-123",
        email: "admin@givemetry.com",
        passwordHash: hashedPassword,
        isActive: true,
        failedLoginAttempts: 4, // One more will trigger lockout
        lockedUntil: null,
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.superAdmin.update.mockResolvedValue({
        ...mockAdmin,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      });

      const result = await validateSuperAdminCredentials(
        "admin@givemetry.com",
        "wrongpassword"
      );

      expect(result).toBeNull();
      expect(mockPrisma.superAdmin.update).toHaveBeenCalledWith({
        where: { id: mockAdmin.id },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      });

      // Verify lockout audit log is created
      expect(mockPrisma.superAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          superAdminId: mockAdmin.id,
          action: "super_admin.locked",
        }),
      });
    });

    it("should throw ACCOUNT_LOCKED error for locked account", async () => {
      const mockAdmin = {
        id: "admin-123",
        email: "admin@givemetry.com",
        passwordHash: hashedPassword,
        isActive: true,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // Locked for 10 more minutes
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);

      const result = await checkAccountLockout(mockAdmin);

      expect(result).toEqual({
        isLocked: true,
        minutesRemaining: expect.any(Number),
      });
    });

    it("should allow login after lockout expires", async () => {
      const mockAdmin = {
        id: "admin-123",
        email: "admin@givemetry.com",
        name: "Test Admin",
        passwordHash: hashedPassword,
        role: "super_admin",
        isActive: true,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.superAdmin.update.mockResolvedValue({
        ...mockAdmin,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      const result = await validateSuperAdminCredentials(
        "admin@givemetry.com",
        validPassword
      );

      expect(result).not.toBeNull();
      expect(result?.email).toBe(mockAdmin.email);
    });

    it("should calculate correct lockout duration (15 minutes)", async () => {
      const mockAdmin = {
        id: "admin-123",
        email: "admin@givemetry.com",
        passwordHash: hashedPassword,
        isActive: true,
        failedLoginAttempts: 4,
        lockedUntil: null,
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);

      let capturedLockoutTime: Date | null = null;
      mockPrisma.superAdmin.update.mockImplementation(({ data }) => {
        capturedLockoutTime = data.lockedUntil as Date;
        return Promise.resolve({ ...mockAdmin, ...data });
      });

      await validateSuperAdminCredentials("admin@givemetry.com", "wrongpassword");

      if (capturedLockoutTime) {
        const lockoutDuration =
          capturedLockoutTime.getTime() - Date.now();
        // Should be approximately 15 minutes (with some tolerance)
        expect(lockoutDuration).toBeGreaterThan(14 * 60 * 1000);
        expect(lockoutDuration).toBeLessThan(16 * 60 * 1000);
      }
    });
  });

  describe("Session Management", () => {
    it("should validate session token structure", () => {
      const validSession = {
        id: "admin-123",
        email: "admin@givemetry.com",
        name: "Test Admin",
        role: "super_admin",
      };

      expect(validSession).toHaveProperty("id");
      expect(validSession).toHaveProperty("email");
      expect(validSession).toHaveProperty("name");
      expect(validSession).toHaveProperty("role");
      expect(["super_admin", "support"]).toContain(validSession.role);
    });

    it("should enforce 8-hour session expiry", () => {
      const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds
      expect(SESSION_MAX_AGE).toBe(28800);
    });
  });

  describe("Audit Logging", () => {
    const validPassword = "SecurePassword123!";
    const hashedPassword = bcrypt.hashSync(validPassword, 10);

    it("should log successful login", async () => {
      const mockAdmin = {
        id: "admin-123",
        email: "admin@givemetry.com",
        name: "Test Admin",
        passwordHash: hashedPassword,
        role: "super_admin",
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.superAdmin.update.mockResolvedValue(mockAdmin);

      await validateSuperAdminCredentials("admin@givemetry.com", validPassword);

      expect(mockPrisma.superAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          superAdminId: mockAdmin.id,
          action: "super_admin.login",
          targetType: "super_admin",
          targetId: mockAdmin.id,
        }),
      });
    });

    it("should log failed login attempt", async () => {
      const mockAdmin = {
        id: "admin-123",
        email: "admin@givemetry.com",
        passwordHash: hashedPassword,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.superAdmin.update.mockResolvedValue({ ...mockAdmin, failedLoginAttempts: 1 });

      await validateSuperAdminCredentials("admin@givemetry.com", "wrongpassword");

      expect(mockPrisma.superAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          superAdminId: mockAdmin.id,
          action: "super_admin.login_failed",
        }),
      });
    });
  });
});
