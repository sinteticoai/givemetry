/**
 * Super Admin NextAuth configuration
 *
 * Separate authentication for platform administrators with:
 * - Separate JWT secret (ADMIN_AUTH_SECRET)
 * - 8-hour session duration
 * - Login lockout after 5 failed attempts (15 min)
 * - Separate cookie name (admin-auth.session-token)
 */

import type { NextAuthConfig, Session, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma/client";
import type { SuperAdminRole } from "@prisma/client";

export interface SuperAdminUser extends User {
  id: string;
  email: string;
  name: string;
  role: SuperAdminRole;
}

export interface SuperAdminSession extends Session {
  user: SuperAdminUser;
}

// Lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const adminAuthConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "admin-credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const admin = await prisma.superAdmin.findUnique({
          where: { email },
        });

        if (!admin || !admin.isActive) {
          return null;
        }

        // Check if account is locked
        if (admin.lockedUntil && admin.lockedUntil > new Date()) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const isValidPassword = await bcrypt.compare(password, admin.passwordHash);

        if (!isValidPassword) {
          // Increment failed login attempts
          const attempts = admin.failedLoginAttempts + 1;
          const updates: {
            failedLoginAttempts: number;
            lockedUntil?: Date;
          } = { failedLoginAttempts: attempts };

          // Lock account after MAX_FAILED_ATTEMPTS
          if (attempts >= MAX_FAILED_ATTEMPTS) {
            updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);

            // Log lockout event
            await prisma.superAdminAuditLog.create({
              data: {
                superAdminId: admin.id,
                action: "super_admin.locked",
                targetType: "super_admin",
                targetId: admin.id,
                details: { attempts, lockoutMinutes: LOCKOUT_DURATION_MS / 60000 },
              },
            });
          }

          await prisma.superAdmin.update({
            where: { id: admin.id },
            data: updates,
          });

          // Log failed login
          await prisma.superAdminAuditLog.create({
            data: {
              superAdminId: admin.id,
              action: "super_admin.login_failed",
              targetType: "super_admin",
              targetId: admin.id,
              details: { attempts },
            },
          });

          return null;
        }

        // Reset failed attempts on successful login
        await prisma.superAdmin.update({
          where: { id: admin.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        // Log successful login
        await prisma.superAdminAuditLog.create({
          data: {
            superAdminId: admin.id,
            action: "super_admin.login",
            targetType: "super_admin",
            targetId: admin.id,
          },
        });

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const adminUser = user as SuperAdminUser;
        token.id = adminUser.id;
        token.email = adminUser.email;
        token.name = adminUser.name;
        token.role = adminUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as unknown as SuperAdminUser) = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
          role: token.role as SuperAdminRole,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  cookies: {
    sessionToken: {
      name: "admin-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.ADMIN_AUTH_SECRET,
};

export default adminAuthConfig;
