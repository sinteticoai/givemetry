/**
 * Admin route protection middleware utilities
 *
 * Provides functions to validate super admin sessions
 * and protect admin routes from unauthorized access.
 */

import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import type { SuperAdminRole } from "@prisma/client";

export interface AdminToken {
  id: string;
  email: string;
  name: string;
  role: SuperAdminRole;
}

/**
 * Get the admin token from request
 * Uses separate secret from tenant auth
 */
export async function getAdminToken(request: NextRequest): Promise<AdminToken | null> {
  const token = await getToken({
    req: request,
    secret: process.env.ADMIN_AUTH_SECRET,
    cookieName: "admin-auth.session-token",
  });

  if (!token || !token.id || !token.role) {
    return null;
  }

  return {
    id: token.id as string,
    email: token.email as string,
    name: token.name as string,
    role: token.role as SuperAdminRole,
  };
}

/**
 * Check if admin has super_admin role (full access)
 */
export function isSuperAdminRole(token: AdminToken): boolean {
  return token.role === "super_admin";
}

/**
 * Check if admin has support role (limited access)
 */
export function isSupportRole(token: AdminToken): boolean {
  return token.role === "support";
}

/**
 * Check if the request path is an admin route
 */
export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

/**
 * Check if the request path is the admin login page
 */
export function isAdminLoginRoute(pathname: string): boolean {
  return pathname === "/admin/login";
}

/**
 * Check if the request path is an admin API route
 */
export function isAdminApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/admin");
}

/**
 * Routes that super_admin role can access but support role cannot
 */
const superAdminOnlyRoutes = [
  "/admin/organizations/new", // Create organizations
  "/api/admin/auth", // Admin auth is accessible to all admin roles
];

/**
 * Actions that require super_admin role
 */
export const superAdminOnlyActions = [
  "organization.create",
  "organization.delete",
  "organization.hard_delete",
  "user.change_role",
  "impersonation.start",
  "impersonation.end",
];

/**
 * Check if a route requires super_admin role
 */
export function requiresSuperAdminRole(pathname: string): boolean {
  return superAdminOnlyRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Validate admin session and permissions for a route
 */
export function validateAdminAccess(
  token: AdminToken | null,
  pathname: string
): { valid: boolean; redirect?: string; error?: string } {
  // No token = redirect to login
  if (!token) {
    return {
      valid: false,
      redirect: `/admin/login?callbackUrl=${encodeURIComponent(pathname)}`,
    };
  }

  // Check role-restricted routes
  if (requiresSuperAdminRole(pathname) && !isSuperAdminRole(token)) {
    return {
      valid: false,
      redirect: "/admin?error=unauthorized",
      error: "This action requires super_admin role",
    };
  }

  return { valid: true };
}
