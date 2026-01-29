/**
 * NextAuth API route for super admin authentication
 *
 * Separate from tenant auth at /api/auth/[...nextauth]
 * Uses different:
 * - JWT secret (ADMIN_AUTH_SECRET)
 * - Cookie name (admin-auth.session-token)
 * - Session duration (8 hours)
 */

export { GET, POST } from "@/lib/auth/admin";
