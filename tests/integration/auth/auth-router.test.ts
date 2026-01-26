// T044: Integration tests for auth router
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn().mockImplementation((password, hash) => {
      return Promise.resolve(password === "ValidPass1" && hash === "existing_hash");
    }),
  },
}));

// Mock email service
vi.mock("@/server/services/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ id: "email-id" }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ id: "email-id" }),
}));

// Mock token generation
vi.mock("@/lib/auth/tokens", () => ({
  generateVerificationToken: vi.fn().mockReturnValue({
    token: "test-token",
    hashedToken: "hashed-test-token",
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }),
  generatePasswordResetToken: vi.fn().mockReturnValue({
    token: "reset-token",
    hashedToken: "hashed-reset-token",
    expires: new Date(Date.now() + 60 * 60 * 1000),
  }),
  hashToken: vi.fn().mockImplementation((token) => `hashed-${token}`),
  generateSlug: vi.fn().mockImplementation((name) =>
    name.toLowerCase().replace(/\s+/g, "-")
  ),
}));

import { authRouter } from "@/server/routers/auth";
import { createCallerFactory } from "@/server/trpc/init";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/server/services/email";

// Create mock Prisma client
function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    verificationToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    passwordResetToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((fn) => fn({
      user: {
        findUnique: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: "user-id", organizationId: "org-id" }),
        update: vi.fn().mockResolvedValue({ id: "user-id", organizationId: "org-id" }),
      },
      organization: {
        create: vi.fn().mockResolvedValue({ id: "org-id", name: "Test Org", slug: "test-org" }),
      },
      verificationToken: {
        create: vi.fn(),
        delete: vi.fn(),
      },
      passwordResetToken: {
        delete: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    })),
  } as unknown as PrismaClient;
}

// Create test context
function createMockContext(options: { authenticated?: boolean } = {}) {
  const prisma = createMockPrisma();
  const orgId = options.authenticated ? "org-id" : undefined;
  return {
    prisma,
    session: options.authenticated
      ? {
          user: {
            id: "user-id",
            email: "test@example.com",
            name: "Test User",
            organizationId: "org-id",
            role: "admin" as const,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }
      : null,
    // Multi-tenant context fields
    withOrgFilter: orgId
      ? <T extends { organizationId?: string }>(where?: T) => ({ ...where, organizationId: orgId } as T & { organizationId: string })
      : undefined,
    withOrgCreate: orgId
      ? <T extends object>(data: T) => ({ ...data, organizationId: orgId } as T & { organizationId: string })
      : undefined,
    organizationId: orgId,
  };
}

const createCaller = createCallerFactory(authRouter);

describe("Auth Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signup", () => {
    it("creates a new user and organization", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      // Mock: no existing user
      (ctx.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      // Mock: no existing org with slug
      (ctx.prisma.organization.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await caller.signup({
        email: "new@example.com",
        password: "ValidPass1",
        name: "New User",
        organizationName: "New Org",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("check your email");
      expect(sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "new@example.com",
          name: "New User",
        })
      );
    });

    it("rejects duplicate email", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      // Mock: user exists
      (ctx.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
      });

      await expect(
        caller.signup({
          email: "existing@example.com",
          password: "ValidPass1",
          name: "Test",
          organizationName: "Test Org",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("validates password requirements", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      // Missing uppercase
      await expect(
        caller.signup({
          email: "test@example.com",
          password: "nouppercasepass1",
          name: "Test",
          organizationName: "Test Org",
        })
      ).rejects.toThrow();

      // Missing number
      await expect(
        caller.signup({
          email: "test@example.com",
          password: "NoNumberPass",
          name: "Test",
          organizationName: "Test Org",
        })
      ).rejects.toThrow();

      // Too short
      await expect(
        caller.signup({
          email: "test@example.com",
          password: "Short1",
          name: "Test",
          organizationName: "Test Org",
        })
      ).rejects.toThrow();
    });
  });

  describe("verifyEmail", () => {
    it("verifies a valid token", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      // Mock: valid token found
      (ctx.prisma.verificationToken.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        identifier: "user@example.com",
        token: "hashed-valid-token",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const result = await caller.verifyEmail({ token: "valid-token" });

      expect(result.success).toBe(true);
      expect(result.message).toContain("verified successfully");
    });

    it("rejects expired token", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      // Mock: no valid token (expired)
      (ctx.prisma.verificationToken.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.verifyEmail({ token: "expired-token" })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects invalid token", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      (ctx.prisma.verificationToken.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.verifyEmail({ token: "invalid-token" })
      ).rejects.toThrow("Invalid or expired verification link");
    });
  });

  describe("forgotPassword", () => {
    it("sends reset email for existing user", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      (ctx.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-id",
        email: "user@example.com",
        name: "Test User",
      });
      (ctx.prisma.passwordResetToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (ctx.prisma.passwordResetToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await caller.forgotPassword({ email: "user@example.com" });

      expect(result.success).toBe(true);
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });

    it("returns success even for non-existent user (prevents enumeration)", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      (ctx.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await caller.forgotPassword({ email: "nonexistent@example.com" });

      // Should still return success to prevent email enumeration
      expect(result.success).toBe(true);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("resets password with valid token", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      (ctx.prisma.passwordResetToken.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "token-id",
        email: "user@example.com",
        token: "hashed-reset-token",
        expires: new Date(Date.now() + 60 * 60 * 1000),
      });

      const result = await caller.resetPassword({
        token: "reset-token",
        password: "NewValidPass1",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("reset successfully");
    });

    it("rejects invalid token", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      (ctx.prisma.passwordResetToken.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.resetPassword({
          token: "invalid-token",
          password: "NewValidPass1",
        })
      ).rejects.toThrow("Invalid or expired reset link");
    });
  });

  describe("getSession", () => {
    it("returns session for authenticated user", async () => {
      const ctx = createMockContext({ authenticated: true });
      const caller = createCaller(ctx);

      const result = await caller.getSession();

      expect(result).toBeDefined();
      expect(result?.user.email).toBe("test@example.com");
    });

    it("throws for unauthenticated user", async () => {
      const ctx = createMockContext({ authenticated: false });
      const caller = createCaller(ctx);

      await expect(caller.getSession()).rejects.toThrow(TRPCError);
    });
  });

  describe("changePassword", () => {
    it("changes password with correct current password", async () => {
      const ctx = createMockContext({ authenticated: true });
      const caller = createCaller(ctx);

      (ctx.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-id",
        passwordHash: "existing_hash",
        organizationId: "org-id",
      });
      (ctx.prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (ctx.prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await caller.changePassword({
        currentPassword: "ValidPass1",
        newPassword: "NewValidPass2",
      });

      expect(result.success).toBe(true);
    });

    it("rejects incorrect current password", async () => {
      const ctx = createMockContext({ authenticated: true });
      const caller = createCaller(ctx);

      (ctx.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-id",
        passwordHash: "existing_hash",
        organizationId: "org-id",
      });

      await expect(
        caller.changePassword({
          currentPassword: "WrongPassword1",
          newPassword: "NewValidPass2",
        })
      ).rejects.toThrow("Current password is incorrect");
    });
  });

  describe("updateProfile", () => {
    it("updates user profile", async () => {
      const ctx = createMockContext({ authenticated: true });
      const caller = createCaller(ctx);

      (ctx.prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-id",
        name: "Updated Name",
      });

      const result = await caller.updateProfile({ name: "Updated Name" });

      expect(result.success).toBe(true);
      expect(ctx.prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-id" },
          data: expect.objectContaining({ name: "Updated Name" }),
        })
      );
    });

    it("requires authentication", async () => {
      const ctx = createMockContext({ authenticated: false });
      const caller = createCaller(ctx);

      await expect(
        caller.updateProfile({ name: "Test" })
      ).rejects.toThrow(TRPCError);
    });
  });
});
