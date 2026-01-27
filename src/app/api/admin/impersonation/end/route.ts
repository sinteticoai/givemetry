// T079: End impersonation API route
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma/client";

const IMPERSONATION_COOKIE_NAME = "impersonation-context";

interface ImpersonationContext {
  sessionId: string;
  userId: string;
  organizationId: string;
  expiresAt: string;
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const cookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);

    if (!cookie?.value) {
      return NextResponse.json({ success: false, message: "No active impersonation session" });
    }

    const context: ImpersonationContext = JSON.parse(cookie.value);

    // Get admin token to verify the request is from an admin
    const adminToken = await getToken({
      req: {
        cookies: {
          get: (name: string) => cookieStore.get(name),
        },
        headers: headerStore,
      } as Parameters<typeof getToken>[0]["req"],
      secret: process.env.ADMIN_AUTH_SECRET,
      cookieName: "admin-auth.session-token",
    });

    if (!adminToken) {
      // Clear cookie anyway for security
      cookieStore.delete(IMPERSONATION_COOKIE_NAME);
      return NextResponse.json({ success: true, message: "Cookie cleared" });
    }

    // End the session in database
    try {
      const session = await prisma.impersonationSession.findUnique({
        where: { id: context.sessionId },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          userId: true,
          organizationId: true,
          user: { select: { name: true, email: true } },
        },
      });

      if (session && !session.endedAt) {
        const durationMs = Date.now() - session.startedAt.getTime();
        const durationMinutes = Math.round(durationMs / 60000);

        // Update session
        await prisma.impersonationSession.update({
          where: { id: context.sessionId },
          data: {
            endedAt: new Date(),
            endReason: "manual",
          },
        });

        // Log audit action
        const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0] || headerStore.get("x-real-ip") || null;
        const userAgent = headerStore.get("user-agent") || null;

        await prisma.superAdminAuditLog.create({
          data: {
            superAdminId: adminToken.id as string,
            action: "impersonation.end",
            targetType: "user",
            targetId: session.userId,
            organizationId: session.organizationId,
            details: {
              endReason: "manual",
              sessionDurationMinutes: durationMinutes,
              userName: session.user.name,
              userEmail: session.user.email,
            },
            ipAddress,
            userAgent,
          },
        });
      }
    } catch (dbError) {
      console.error("Failed to update impersonation session in database:", dbError);
      // Continue to clear cookie even if DB update fails
    }

    // Clear the cookie
    cookieStore.delete(IMPERSONATION_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to end impersonation:", error);
    return NextResponse.json({ success: false, message: "Failed to end impersonation" }, { status: 500 });
  }
}
