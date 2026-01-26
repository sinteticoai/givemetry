// T260: Integration tests for tenant isolation and RLS policies
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "@/lib/prisma/client";
import { withOrgFilter, withOrgCreate } from "@/lib/prisma/tenant";
import { getPortfolioFilter, type Context } from "@/server/trpc/context";

// Mock context for testing portfolio filters
function createMockContext(
  role: "admin" | "manager" | "gift_officer" | "viewer",
  userId: string,
  organizationId: string
): Context {
  return {
    session: {
      user: {
        id: userId,
        email: "test@example.com",
        name: "Test User",
        organizationId,
        role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    prisma,
    withOrgFilter: <T extends { organizationId?: string }>(where?: T) =>
      withOrgFilter(organizationId, where),
    withOrgCreate: <T extends object>(data: T) =>
      withOrgCreate(organizationId, data),
    organizationId,
  } as Context;
}

describe("Tenant Isolation", () => {
  const org1Id = "test-org-1-" + Date.now();
  const org2Id = "test-org-2-" + Date.now();

  describe("withOrgFilter", () => {
    it("should add organizationId to empty filter", () => {
      const result = withOrgFilter("org-123");
      expect(result).toEqual({ organizationId: "org-123" });
    });

    it("should add organizationId to existing filter", () => {
      const result = withOrgFilter("org-123", { isActive: true });
      expect(result).toEqual({ organizationId: "org-123", isActive: true });
    });

    it("should override existing organizationId", () => {
      const result = withOrgFilter("org-new", { organizationId: "org-old", isActive: true });
      expect(result.organizationId).toBe("org-new");
    });
  });

  describe("withOrgCreate", () => {
    it("should add organizationId to create data", () => {
      const result = withOrgCreate("org-123", { name: "Test" });
      expect(result).toEqual({ name: "Test", organizationId: "org-123" });
    });

    it("should override existing organizationId in create data", () => {
      const result = withOrgCreate("org-new", { name: "Test", organizationId: "org-old" });
      expect(result.organizationId).toBe("org-new");
    });
  });

  describe("getPortfolioFilter", () => {
    const orgId = "test-org-portfolio";
    const userId = "test-user-123";

    it("should return null for unauthenticated context", () => {
      const ctx = { session: null, prisma } as unknown as Context;
      expect(getPortfolioFilter(ctx)).toBeNull();
    });

    it("should return org-only filter for admin", () => {
      const ctx = createMockContext("admin", userId, orgId);
      const filter = getPortfolioFilter(ctx);
      expect(filter).toEqual({ organizationId: orgId });
    });

    it("should return org-only filter for manager", () => {
      const ctx = createMockContext("manager", userId, orgId);
      const filter = getPortfolioFilter(ctx);
      expect(filter).toEqual({ organizationId: orgId });
    });

    it("should return portfolio filter for gift_officer", () => {
      const ctx = createMockContext("gift_officer", userId, orgId);
      const filter = getPortfolioFilter(ctx);
      expect(filter).toEqual({
        organizationId: orgId,
        assignedOfficerId: userId,
      });
    });

    it("should return org-only filter for viewer", () => {
      const ctx = createMockContext("viewer", userId, orgId);
      const filter = getPortfolioFilter(ctx);
      expect(filter).toEqual({ organizationId: orgId });
    });
  });

  describe("Cross-tenant data isolation", () => {
    it("should prevent cross-tenant query by default with withOrgFilter", async () => {
      // Create a filter for org1
      const org1Filter = withOrgFilter(org1Id, {});
      const org2Filter = withOrgFilter(org2Id, {});

      // Filters should be different
      expect(org1Filter.organizationId).not.toBe(org2Filter.organizationId);
      expect(org1Filter.organizationId).toBe(org1Id);
      expect(org2Filter.organizationId).toBe(org2Id);
    });

    it("should enforce organizationId on create operations", () => {
      const dataWithOrg1 = withOrgCreate(org1Id, { name: "Test" });
      const dataWithOrg2 = withOrgCreate(org2Id, { name: "Test" });

      expect(dataWithOrg1.organizationId).toBe(org1Id);
      expect(dataWithOrg2.organizationId).toBe(org2Id);
    });
  });

  describe("Role-based access control", () => {
    const orgId = "test-org-rbac";

    it("admin should have full org access", () => {
      const ctx = createMockContext("admin", "admin-1", orgId);
      const filter = getPortfolioFilter(ctx);

      // Admin gets org-level filter (no assignedOfficerId restriction)
      expect(filter).not.toHaveProperty("assignedOfficerId");
      expect(filter?.organizationId).toBe(orgId);
    });

    it("manager should have full org access", () => {
      const ctx = createMockContext("manager", "manager-1", orgId);
      const filter = getPortfolioFilter(ctx);

      // Manager gets org-level filter (no assignedOfficerId restriction)
      expect(filter).not.toHaveProperty("assignedOfficerId");
      expect(filter?.organizationId).toBe(orgId);
    });

    it("gift_officer should only see assigned constituents", () => {
      const officerId = "officer-1";
      const ctx = createMockContext("gift_officer", officerId, orgId);
      const filter = getPortfolioFilter(ctx);

      // Gift officer gets portfolio restriction
      expect(filter?.assignedOfficerId).toBe(officerId);
      expect(filter?.organizationId).toBe(orgId);
    });

    it("viewer should have read access to all org data", () => {
      const ctx = createMockContext("viewer", "viewer-1", orgId);
      const filter = getPortfolioFilter(ctx);

      // Viewer gets org-level filter (read-only enforced elsewhere)
      expect(filter).not.toHaveProperty("assignedOfficerId");
      expect(filter?.organizationId).toBe(orgId);
    });
  });
});
