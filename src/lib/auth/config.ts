// T020: NextAuth v5 configuration with Credentials provider
import type { NextAuthConfig, Session, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma/client";
import type { UserRole } from "@prisma/client";

export interface ExtendedUser extends User {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  role: UserRole;
}

export interface ExtendedSession extends Session {
  user: ExtendedUser;
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
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

        const user = await prisma.user.findUnique({
          where: { email },
          include: { organization: true },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // T053: Check if organization is suspended or pending deletion
        if (user.organization.status === "suspended") {
          throw new Error("ORGANIZATION_SUSPENDED");
        }

        if (user.organization.status === "pending_deletion") {
          throw new Error("ORGANIZATION_DELETED");
        }

        // Check if user is disabled
        if (user.isDisabled) {
          throw new Error("USER_DISABLED");
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          return null;
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: "user.login",
            resourceType: "user",
            resourceId: user.id,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const extUser = user as ExtendedUser;
        token.id = extUser.id;
        token.email = extUser.email;
        token.name = extUser.name;
        token.organizationId = extUser.organizationId;
        token.role = extUser.role;
        token.lastActivity = Date.now();
      }

      // Update last activity on each request
      if (!user) {
        token.lastActivity = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as unknown as ExtendedUser) = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string | null,
          organizationId: token.organizationId as string,
          role: token.role as UserRole,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export default authConfig;
