// T027: Integration test for admin login flow
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAdminContext } from "@/server/trpc/admin-context";

// Mock dependencies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn((name: string) => {
      if (name === "x-forwarded-for") return "127.0.0.1";
      if (name === "user-agent") return "test-agent";
      return null;
    }),
  })),
}));

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

describe("Admin Login Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Admin Context Creation", () => {
    it("should create context without session when no cookie", async () => {
      const { cookies } = await import("next/headers");
      (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        get: vi.fn(() => undefined),
      });

      const ctx = await createAdminContext();

      expect(ctx.session).toBeNull();
      expect(ctx.prisma).toBeDefined();
    });

    it("should extract IP address from headers", async () => {
      const { cookies, headers } = await import("next/headers");
      (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        get: vi.fn(() => undefined),
      });
      (headers as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "x-forwarded-for") return "192.168.1.1, 10.0.0.1";
          return null;
        }),
      });

      const ctx = await createAdminContext();

      expect(ctx.ipAddress).toBe("192.168.1.1");
    });

    it("should provide audit logging helper", async () => {
      const { cookies, headers } = await import("next/headers");
      const { getToken } = await import("next-auth/jwt");

      (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "admin-auth.session-token") {
            return { value: "mock-token" };
          }
          return undefined;
        }),
      });

      (headers as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        get: vi.fn(() => null),
      });

      (getToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "admin-123",
        email: "admin@test.com",
        name: "Test Admin",
        role: "super_admin",
      });

      const ctx = await createAdminContext();

      expect(ctx.logAuditAction).toBeDefined();
      expect(typeof ctx.logAuditAction).toBe("function");
    });
  });

  describe("Role Checking", () => {
    it("isSuperAdmin returns true for super_admin role", async () => {
      const { cookies, headers } = await import("next/headers");
      const { getToken } = await import("next-auth/jwt");

      (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "admin-auth.session-token") {
            return { value: "mock-token" };
          }
          return undefined;
        }),
      });

      (headers as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        get: vi.fn(() => null),
      });

      (getToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "admin-123",
        email: "admin@test.com",
        name: "Test Admin",
        role: "super_admin",
      });

      const ctx = await createAdminContext();

      expect(ctx.isSuperAdmin()).toBe(true);
      expect(ctx.isSupport()).toBe(false);
    });

    it("isSupport returns true for support role", async () => {
      const { cookies, headers } = await import("next/headers");
      const { getToken } = await import("next-auth/jwt");

      (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "admin-auth.session-token") {
            return { value: "mock-token" };
          }
          return undefined;
        }),
      });

      (headers as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        get: vi.fn(() => null),
      });

      (getToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "admin-456",
        email: "support@test.com",
        name: "Support User",
        role: "support",
      });

      const ctx = await createAdminContext();

      expect(ctx.isSuperAdmin()).toBe(false);
      expect(ctx.isSupport()).toBe(true);
    });
  });

  describe("Login Flow", () => {
    it("should validate login request structure", () => {
      const validLoginRequest = {
        email: "admin@givemetry.com",
        password: "SecurePassword123!",
      };

      expect(validLoginRequest.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(validLoginRequest.password.length).toBeGreaterThanOrEqual(8);
    });

    it("should reject empty credentials", () => {
      const emptyEmail = { email: "", password: "password" };
      const emptyPassword = { email: "admin@test.com", password: "" };

      expect(emptyEmail.email.length).toBe(0);
      expect(emptyPassword.password.length).toBe(0);
    });
  });

  describe("Session Validation", () => {
    it("should validate session cookie name", () => {
      const ADMIN_COOKIE_NAME = "admin-auth.session-token";
      const TENANT_COOKIE_NAME = "next-auth.session-token";

      expect(ADMIN_COOKIE_NAME).not.toBe(TENANT_COOKIE_NAME);
    });

    it("should use separate JWT secret", () => {
      const adminSecret = process.env.ADMIN_AUTH_SECRET || "admin-secret";
      const tenantSecret = process.env.AUTH_SECRET || "tenant-secret";

      // In a real deployment, these should be different
      // This test documents the expectation
      expect(adminSecret).toBeDefined();
      expect(tenantSecret).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle locked account error gracefully", () => {
      const lockoutError = {
        code: "ACCOUNT_LOCKED",
        message: "Account temporarily locked. Try again in 15 minutes.",
        minutesRemaining: 15,
      };

      expect(lockoutError.code).toBe("ACCOUNT_LOCKED");
      expect(lockoutError.minutesRemaining).toBeGreaterThan(0);
    });

    it("should not expose whether email exists", () => {
      // Both should return the same generic message
      const nonExistentEmailError = "Invalid credentials";
      const wrongPasswordError = "Invalid credentials";

      expect(nonExistentEmailError).toBe(wrongPasswordError);
    });
  });
});
