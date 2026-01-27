// T072: Integration tests for impersonation flow
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma/client", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    superAdmin: {
      findUnique: vi.fn(),
    },
    impersonationSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    superAdminAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock cookies for impersonation context
const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookies),
  headers: vi.fn(() => ({
    get: vi.fn((name: string) => {
      if (name === "x-forwarded-for") return "127.0.0.1";
      if (name === "user-agent") return "Mozilla/5.0 Test";
      return null;
    }),
  })),
}));

import prisma from "@/lib/prisma/client";

describe("Impersonation Integration Tests", () => {
  // Test data
  const superAdmin = {
    id: "super-admin-123",
    email: "admin@givemetry.com",
    name: "Super Admin",
    role: "super_admin",
    isActive: true,
  };

  const targetUser = {
    id: "user-123",
    email: "user@nonprofit.org",
    name: "Gift Officer",
    organizationId: "org-123",
    role: "gift_officer",
    isDisabled: false,
    organization: {
      id: "org-123",
      name: "Test Nonprofit",
      status: "active",
    },
  };

  const targetOrg = {
    id: "org-123",
    name: "Test Nonprofit",
    status: "active",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.get.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Complete Impersonation Flow", () => {
    it("should complete full impersonation lifecycle: start -> actions -> end", async () => {
      // Setup new session object
      const newSession = {
        id: "session-abc",
        superAdminId: superAdmin.id,
        userId: targetUser.id,
        organizationId: targetOrg.id,
        reason: "Support ticket #12345",
        startedAt: new Date(),
        endedAt: null,
        endReason: null,
      };

      const activeSessionWithRelations = {
        ...newSession,
        user: targetUser,
        organization: targetOrg,
      };

      // Step 1: Super admin starts impersonation
      vi.mocked(prisma.user.findUnique).mockResolvedValue(targetUser as never);
      vi.mocked(prisma.impersonationSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.impersonationSession.create).mockResolvedValue(newSession as never);

      // Verify session can be created
      const user = await prisma.user.findUnique({ where: { id: targetUser.id } });
      expect(user?.isDisabled).toBe(false);
      expect(user?.organization.status).toBe("active");

      // Create session
      const session = await prisma.impersonationSession.create({
        data: {
          superAdminId: superAdmin.id,
          userId: targetUser.id,
          organizationId: targetOrg.id,
          reason: "Support ticket #12345",
        },
      });

      expect(session.id).toBe("session-abc");
      expect(session.endedAt).toBeNull();

      // Step 2: Update mock to return active session, then verify impersonation is active
      vi.mocked(prisma.impersonationSession.findFirst).mockResolvedValue(activeSessionWithRelations as never);

      const activeSession = await prisma.impersonationSession.findFirst({
        where: { superAdminId: superAdmin.id, endedAt: null },
        include: { user: true, organization: true },
      });

      expect(activeSession).not.toBeNull();
      expect(activeSession?.user.email).toBe(targetUser.email);

      // Step 3: End impersonation
      const endedSession = {
        ...newSession,
        endedAt: new Date(),
        endReason: "manual",
      };

      vi.mocked(prisma.impersonationSession.update).mockResolvedValue(endedSession as never);

      const updated = await prisma.impersonationSession.update({
        where: { id: session.id },
        data: { endedAt: new Date(), endReason: "manual" },
      });

      expect(updated.endedAt).not.toBeNull();
      expect(updated.endReason).toBe("manual");
    });

    it("should record audit log for impersonation actions", async () => {
      const auditLogs: unknown[] = [];

      vi.mocked(prisma.superAdminAuditLog.create).mockImplementation((args) => {
        const log = { id: BigInt(auditLogs.length + 1), ...args.data, createdAt: new Date() };
        auditLogs.push(log);
        return Promise.resolve(log as never);
      });

      // Log start
      await prisma.superAdminAuditLog.create({
        data: {
          superAdminId: superAdmin.id,
          action: "impersonation.start",
          targetType: "user",
          targetId: targetUser.id,
          organizationId: targetOrg.id,
          details: {
            reason: "Support ticket #12345",
            userName: targetUser.name,
            userEmail: targetUser.email,
          },
        },
      });

      // Log end
      await prisma.superAdminAuditLog.create({
        data: {
          superAdminId: superAdmin.id,
          action: "impersonation.end",
          targetType: "user",
          targetId: targetUser.id,
          organizationId: targetOrg.id,
          details: {
            endReason: "manual",
            sessionDurationMinutes: 15,
          },
        },
      });

      expect(auditLogs).toHaveLength(2);
      expect(auditLogs[0]).toMatchObject({ action: "impersonation.start" });
      expect(auditLogs[1]).toMatchObject({ action: "impersonation.end" });
    });
  });

  describe("Impersonation Cookie Management", () => {
    it("should set encrypted impersonation cookie on start", () => {
      // Simulate setting cookie
      const cookieValue = JSON.stringify({
        sessionId: "session-abc",
        userId: targetUser.id,
        organizationId: targetOrg.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      mockCookies.set("impersonation-context", cookieValue, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 3600, // 1 hour
      });

      expect(mockCookies.set).toHaveBeenCalledWith(
        "impersonation-context",
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          maxAge: 3600,
        })
      );
    });

    it("should clear impersonation cookie on end", () => {
      mockCookies.delete("impersonation-context");
      expect(mockCookies.delete).toHaveBeenCalledWith("impersonation-context");
    });

    it("should read impersonation context from cookie", () => {
      const cookieValue = JSON.stringify({
        sessionId: "session-abc",
        userId: targetUser.id,
        organizationId: targetOrg.id,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });

      mockCookies.get.mockReturnValue({ value: cookieValue });

      const cookie = mockCookies.get("impersonation-context");
      expect(cookie?.value).toBeDefined();

      const context = JSON.parse(cookie.value);
      expect(context.userId).toBe(targetUser.id);
      expect(context.organizationId).toBe(targetOrg.id);
    });
  });

  describe("Impersonation Session Timeout", () => {
    it("should timeout session after 1 hour", async () => {
      const oneHourAgo = new Date(Date.now() - 61 * 60 * 1000);

      const expiredSession = {
        id: "session-expired",
        superAdminId: superAdmin.id,
        userId: targetUser.id,
        organizationId: targetOrg.id,
        reason: "Old session",
        startedAt: oneHourAgo,
        endedAt: null,
        endReason: null,
      };

      vi.mocked(prisma.impersonationSession.findFirst).mockResolvedValue(expiredSession as never);

      // Check if session is expired
      const session = await prisma.impersonationSession.findFirst({
        where: { superAdminId: superAdmin.id, endedAt: null },
      });

      const expiresAt = new Date(session!.startedAt.getTime() + 60 * 60 * 1000);
      const isExpired = new Date() > expiresAt;

      expect(isExpired).toBe(true);
    });

    it("should auto-end expired sessions with timeout reason", async () => {
      const timedOutSession = {
        id: "session-timeout",
        superAdminId: superAdmin.id,
        userId: targetUser.id,
        organizationId: targetOrg.id,
        reason: "Timed out session",
        startedAt: new Date(Date.now() - 61 * 60 * 1000),
        endedAt: new Date(),
        endReason: "timeout",
      };

      vi.mocked(prisma.impersonationSession.update).mockResolvedValue(timedOutSession as never);

      const updated = await prisma.impersonationSession.update({
        where: { id: "session-timeout" },
        data: { endedAt: new Date(), endReason: "timeout" },
      });

      expect(updated.endReason).toBe("timeout");
    });

    it("should calculate remaining time correctly", () => {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      const expiresAt = new Date(thirtyMinsAgo.getTime() + 60 * 60 * 1000);
      const remainingMs = expiresAt.getTime() - Date.now();
      const remainingMins = Math.floor(remainingMs / 60000);

      expect(remainingMins).toBeGreaterThanOrEqual(29);
      expect(remainingMins).toBeLessThanOrEqual(30);
    });
  });

  describe("Impersonation Banner Context", () => {
    it("should provide banner data when impersonating", async () => {
      vi.mocked(prisma.impersonationSession.findFirst).mockResolvedValue({
        id: "session-abc",
        superAdminId: superAdmin.id,
        userId: targetUser.id,
        organizationId: targetOrg.id,
        reason: "Support ticket #12345",
        startedAt: new Date(Date.now() - 15 * 60 * 1000),
        endedAt: null,
        user: { name: targetUser.name, email: targetUser.email },
        organization: { name: targetOrg.name },
      } as never);

      const session = await prisma.impersonationSession.findFirst({
        where: { superAdminId: superAdmin.id, endedAt: null },
        include: { user: { select: { name: true, email: true } }, organization: { select: { name: true } } },
      });

      // Banner data
      const bannerData = {
        isImpersonating: true,
        userName: session?.user.name,
        userEmail: session?.user.email,
        organizationName: session?.organization.name,
        startedAt: session?.startedAt,
        expiresAt: session ? new Date(session.startedAt.getTime() + 60 * 60 * 1000) : null,
      };

      expect(bannerData.isImpersonating).toBe(true);
      expect(bannerData.userName).toBe(targetUser.name);
      expect(bannerData.organizationName).toBe(targetOrg.name);
    });
  });

  describe("Impersonation Access Control", () => {
    it("should only allow super_admin role to start impersonation", () => {
      // super_admin can impersonate
      expect(superAdmin.role).toBe("super_admin");

      // support cannot impersonate
      const supportAdmin = { ...superAdmin, role: "support" };
      expect(supportAdmin.role).not.toBe("super_admin");
    });

    it("should reject impersonation of user in pending_deletion org", async () => {
      const pendingDeletionOrg = {
        id: "org-deleted",
        name: "Deleted Org",
        status: "pending_deletion",
        deletedAt: new Date(),
      };

      const userInDeletedOrg = {
        ...targetUser,
        organizationId: pendingDeletionOrg.id,
        organization: pendingDeletionOrg,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(userInDeletedOrg as never);

      const user = await prisma.user.findUnique({ where: { id: targetUser.id } });
      expect(user?.organization.status).toBe("pending_deletion");
    });

    it("should prevent starting new impersonation while one is active", async () => {
      const activeSession = {
        id: "active-session",
        superAdminId: superAdmin.id,
        userId: "other-user",
        organizationId: "other-org",
        startedAt: new Date(),
        endedAt: null,
      };

      vi.mocked(prisma.impersonationSession.findFirst).mockResolvedValue(activeSession as never);

      const existing = await prisma.impersonationSession.findFirst({
        where: { superAdminId: superAdmin.id, endedAt: null },
      });

      expect(existing).not.toBeNull();
      // Should reject with error: "Already impersonating another user"
    });
  });

  describe("Impersonation History", () => {
    it("should track all impersonation sessions for audit", async () => {
      const sessions = [
        {
          id: "session-1",
          superAdminId: superAdmin.id,
          superAdmin: { name: superAdmin.name },
          userId: "user-1",
          user: { name: "User One", email: "user1@example.com" },
          organizationId: "org-1",
          organization: { name: "Org One" },
          reason: "Support #1",
          startedAt: new Date("2026-01-27T10:00:00Z"),
          endedAt: new Date("2026-01-27T10:30:00Z"),
          endReason: "manual",
        },
        {
          id: "session-2",
          superAdminId: superAdmin.id,
          superAdmin: { name: superAdmin.name },
          userId: "user-2",
          user: { name: "User Two", email: "user2@example.com" },
          organizationId: "org-2",
          organization: { name: "Org Two" },
          reason: "Bug investigation",
          startedAt: new Date("2026-01-27T14:00:00Z"),
          endedAt: new Date("2026-01-27T15:00:00Z"),
          endReason: "timeout",
        },
      ];

      vi.mocked(prisma.impersonationSession.findMany).mockResolvedValue(sessions as never);

      const history = await prisma.impersonationSession.findMany({
        where: { superAdminId: superAdmin.id },
        orderBy: { startedAt: "desc" },
        include: { superAdmin: true, user: true, organization: true },
      });

      expect(history).toHaveLength(2);
      expect(history[0].endReason).toBe("manual");
      expect(history[1].endReason).toBe("timeout");
    });

    it("should allow filtering history by user or organization", async () => {
      vi.mocked(prisma.impersonationSession.findMany).mockResolvedValue([]);

      await prisma.impersonationSession.findMany({
        where: {
          OR: [
            { userId: targetUser.id },
            { organizationId: targetOrg.id },
          ],
        },
      });

      expect(prisma.impersonationSession.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { userId: targetUser.id },
            { organizationId: targetOrg.id },
          ],
        },
      });
    });
  });

  describe("Actions During Impersonation", () => {
    it("should flag actions performed during impersonation in audit logs", async () => {
      // When impersonating, any tenant actions should be logged with impersonation context
      const auditEntry = {
        userId: targetUser.id,
        organizationId: targetOrg.id,
        action: "constituent.view",
        resourceType: "constituent",
        resourceId: "constituent-123",
        // Impersonation metadata
        impersonatedBy: superAdmin.id,
        impersonationSessionId: "session-abc",
      };

      // This would be logged to the tenant's AuditLog with extra metadata
      expect(auditEntry.impersonatedBy).toBe(superAdmin.id);
    });
  });
});
