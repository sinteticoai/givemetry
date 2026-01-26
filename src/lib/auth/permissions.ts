// T022: RBAC permission helpers
import type { UserRole } from "@prisma/client";

// Define all permissions
export const PERMISSIONS = {
  // User management
  "user.invite": ["admin"],
  "user.list": ["admin", "manager"],
  "user.update": ["admin"],
  "user.delete": ["admin"],
  "user.change_role": ["admin"],

  // Organization management
  "org.settings": ["admin"],
  "org.delete": ["admin"],
  "org.billing": ["admin"],

  // Upload management
  "upload.create": ["admin", "manager"],
  "upload.list": ["admin", "manager", "gift_officer", "viewer"],
  "upload.delete": ["admin"],

  // Constituent management
  "constituent.list": ["admin", "manager", "gift_officer", "viewer"],
  "constituent.view": ["admin", "manager", "gift_officer", "viewer"],
  "constituent.update": ["admin", "manager", "gift_officer"],
  "constituent.assign": ["admin", "manager"],

  // Gift data
  "gift.list": ["admin", "manager", "gift_officer", "viewer"],
  "gift.view": ["admin", "manager", "gift_officer", "viewer"],

  // Contact management
  "contact.list": ["admin", "manager", "gift_officer", "viewer"],
  "contact.create": ["admin", "manager", "gift_officer"],
  "contact.update": ["admin", "manager", "gift_officer"],

  // Analysis & Predictions
  "analysis.view": ["admin", "manager", "gift_officer", "viewer"],
  "analysis.refresh": ["admin", "manager"],

  // AI Features
  "ai.brief": ["admin", "manager", "gift_officer"],
  "ai.query": ["admin", "manager", "gift_officer", "viewer"],
  "ai.recommendation": ["admin", "manager", "gift_officer"],

  // Alerts
  "alert.list": ["admin", "manager", "gift_officer", "viewer"],
  "alert.dismiss": ["admin", "manager", "gift_officer"],

  // Reports
  "report.generate": ["admin", "manager"],
  "report.view": ["admin", "manager", "gift_officer", "viewer"],
  "report.schedule": ["admin", "manager"],

  // Audit
  "audit.view": ["admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((permission) =>
    hasPermission(role, permission)
  );
}

/**
 * Check if a user can access another user's data based on portfolio
 */
export function canAccessPortfolio(
  userRole: UserRole,
  userId: string,
  targetOfficerId: string | null
): boolean {
  // Admins and managers can access all portfolios
  if (userRole === "admin" || userRole === "manager") {
    return true;
  }

  // Gift officers can only access their own portfolio
  if (userRole === "gift_officer") {
    return targetOfficerId === userId;
  }

  // Viewers can view all portfolios (read-only)
  if (userRole === "viewer") {
    return true;
  }

  return false;
}

/**
 * Role hierarchy for comparison
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  manager: 3,
  gift_officer: 2,
  viewer: 1,
};

/**
 * Check if one role is higher than another in the hierarchy
 */
export function isHigherRole(role: UserRole, thanRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] > ROLE_HIERARCHY[thanRole];
}

/**
 * Check if one role is at least as high as another
 */
export function isAtLeastRole(role: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}
