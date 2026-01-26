// T043: Unit tests for RBAC permissions
import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  canAccessPortfolio,
  isHigherRole,
  isAtLeastRole,
} from "@/lib/auth/permissions";

describe("RBAC Permissions", () => {
  describe("PERMISSIONS constant", () => {
    it("defines permissions for user management", () => {
      expect(PERMISSIONS["user.invite"]).toContain("admin");
      expect(PERMISSIONS["user.list"]).toContain("admin");
      expect(PERMISSIONS["user.list"]).toContain("manager");
    });

    it("defines permissions for organization management", () => {
      expect(PERMISSIONS["org.settings"]).toContain("admin");
      expect(PERMISSIONS["org.delete"]).toContain("admin");
    });

    it("defines permissions for constituent management", () => {
      expect(PERMISSIONS["constituent.list"]).toHaveLength(4); // all roles
      expect(PERMISSIONS["constituent.update"]).not.toContain("viewer");
    });
  });

  describe("hasPermission", () => {
    it("admin has all permissions", () => {
      expect(hasPermission("admin", "user.invite")).toBe(true);
      expect(hasPermission("admin", "org.delete")).toBe(true);
      expect(hasPermission("admin", "audit.view")).toBe(true);
    });

    it("manager has management permissions but not admin-only", () => {
      expect(hasPermission("manager", "user.list")).toBe(true);
      expect(hasPermission("manager", "upload.create")).toBe(true);
      expect(hasPermission("manager", "user.invite")).toBe(false);
      expect(hasPermission("manager", "org.delete")).toBe(false);
    });

    it("gift_officer has operational permissions", () => {
      expect(hasPermission("gift_officer", "constituent.list")).toBe(true);
      expect(hasPermission("gift_officer", "constituent.update")).toBe(true);
      expect(hasPermission("gift_officer", "ai.brief")).toBe(true);
      expect(hasPermission("gift_officer", "upload.create")).toBe(false);
    });

    it("viewer has read-only permissions", () => {
      expect(hasPermission("viewer", "constituent.list")).toBe(true);
      expect(hasPermission("viewer", "gift.view")).toBe(true);
      expect(hasPermission("viewer", "ai.query")).toBe(true);
      expect(hasPermission("viewer", "constituent.update")).toBe(false);
      expect(hasPermission("viewer", "contact.create")).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("returns true if role has at least one permission", () => {
      expect(
        hasAnyPermission("viewer", ["user.invite", "constituent.list"])
      ).toBe(true);
    });

    it("returns false if role has none of the permissions", () => {
      expect(
        hasAnyPermission("viewer", ["user.invite", "org.delete"])
      ).toBe(false);
    });

    it("returns false for empty permission list", () => {
      expect(hasAnyPermission("admin", [])).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("returns true if role has all permissions", () => {
      expect(
        hasAllPermissions("admin", ["user.invite", "org.delete"])
      ).toBe(true);
    });

    it("returns false if role is missing any permission", () => {
      expect(
        hasAllPermissions("manager", ["user.list", "user.invite"])
      ).toBe(false);
    });

    it("returns true for empty permission list", () => {
      expect(hasAllPermissions("viewer", [])).toBe(true);
    });
  });

  describe("getRolePermissions", () => {
    it("returns all permissions for admin", () => {
      const adminPerms = getRolePermissions("admin");
      expect(adminPerms).toContain("user.invite");
      expect(adminPerms).toContain("org.delete");
      expect(adminPerms).toContain("audit.view");
    });

    it("returns subset of permissions for viewer", () => {
      const viewerPerms = getRolePermissions("viewer");
      expect(viewerPerms).toContain("constituent.list");
      expect(viewerPerms).not.toContain("user.invite");
      expect(viewerPerms).not.toContain("org.delete");
    });

    it("manager has more permissions than gift_officer", () => {
      const managerPerms = getRolePermissions("manager");
      const officerPerms = getRolePermissions("gift_officer");
      expect(managerPerms.length).toBeGreaterThan(officerPerms.length);
    });
  });

  describe("canAccessPortfolio", () => {
    const userId = "user-123";
    const otherUserId = "user-456";

    it("admin can access any portfolio", () => {
      expect(canAccessPortfolio("admin", userId, otherUserId)).toBe(true);
      expect(canAccessPortfolio("admin", userId, null)).toBe(true);
    });

    it("manager can access any portfolio", () => {
      expect(canAccessPortfolio("manager", userId, otherUserId)).toBe(true);
      expect(canAccessPortfolio("manager", userId, null)).toBe(true);
    });

    it("gift_officer can only access their own portfolio", () => {
      expect(canAccessPortfolio("gift_officer", userId, userId)).toBe(true);
      expect(canAccessPortfolio("gift_officer", userId, otherUserId)).toBe(false);
      expect(canAccessPortfolio("gift_officer", userId, null)).toBe(false);
    });

    it("viewer can view all portfolios (read-only)", () => {
      expect(canAccessPortfolio("viewer", userId, otherUserId)).toBe(true);
      expect(canAccessPortfolio("viewer", userId, null)).toBe(true);
    });
  });

  describe("isHigherRole", () => {
    it("admin is higher than all other roles", () => {
      expect(isHigherRole("admin", "manager")).toBe(true);
      expect(isHigherRole("admin", "gift_officer")).toBe(true);
      expect(isHigherRole("admin", "viewer")).toBe(true);
    });

    it("manager is higher than gift_officer and viewer", () => {
      expect(isHigherRole("manager", "gift_officer")).toBe(true);
      expect(isHigherRole("manager", "viewer")).toBe(true);
      expect(isHigherRole("manager", "admin")).toBe(false);
    });

    it("same role is not higher", () => {
      expect(isHigherRole("admin", "admin")).toBe(false);
      expect(isHigherRole("viewer", "viewer")).toBe(false);
    });

    it("viewer is not higher than any role", () => {
      expect(isHigherRole("viewer", "admin")).toBe(false);
      expect(isHigherRole("viewer", "manager")).toBe(false);
      expect(isHigherRole("viewer", "gift_officer")).toBe(false);
    });
  });

  describe("isAtLeastRole", () => {
    it("admin is at least any role", () => {
      expect(isAtLeastRole("admin", "admin")).toBe(true);
      expect(isAtLeastRole("admin", "manager")).toBe(true);
      expect(isAtLeastRole("admin", "gift_officer")).toBe(true);
      expect(isAtLeastRole("admin", "viewer")).toBe(true);
    });

    it("manager is at least manager or below", () => {
      expect(isAtLeastRole("manager", "admin")).toBe(false);
      expect(isAtLeastRole("manager", "manager")).toBe(true);
      expect(isAtLeastRole("manager", "gift_officer")).toBe(true);
      expect(isAtLeastRole("manager", "viewer")).toBe(true);
    });

    it("viewer is only at least viewer", () => {
      expect(isAtLeastRole("viewer", "viewer")).toBe(true);
      expect(isAtLeastRole("viewer", "gift_officer")).toBe(false);
      expect(isAtLeastRole("viewer", "manager")).toBe(false);
      expect(isAtLeastRole("viewer", "admin")).toBe(false);
    });
  });
});
