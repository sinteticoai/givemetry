/**
 * NextAuth API route for super admin authentication
 *
 * Separate from tenant auth at /api/auth/[...nextauth]
 * Uses different:
 * - JWT secret (ADMIN_AUTH_SECRET)
 * - Cookie name (admin-auth.session-token)
 * - Session duration (8 hours)
 */

import NextAuth from "next-auth";
import { adminAuthConfig } from "@/lib/auth/admin-config";

const handler = NextAuth(adminAuthConfig);

export { handler as GET, handler as POST };
