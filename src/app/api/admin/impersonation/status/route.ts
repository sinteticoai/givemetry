// T079: Impersonation status API route
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const IMPERSONATION_COOKIE_NAME = "impersonation-context";
const IMPERSONATION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

interface ImpersonationContext {
  sessionId: string;
  userId: string;
  organizationId: string;
  expiresAt: string;
  targetUserName?: string;
  targetUserEmail?: string;
  organizationName?: string;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);

    if (!cookie?.value) {
      return NextResponse.json({ isImpersonating: false });
    }

    const context: ImpersonationContext = JSON.parse(cookie.value);

    // Check if expired
    const expiresAt = new Date(context.expiresAt);
    if (expiresAt < new Date()) {
      // Cookie expired, clear it
      cookieStore.delete(IMPERSONATION_COOKIE_NAME);
      return NextResponse.json({ isImpersonating: false });
    }

    // Calculate started time from expires (1 hour before)
    const startedAt = new Date(expiresAt.getTime() - IMPERSONATION_TIMEOUT_MS);

    return NextResponse.json({
      isImpersonating: true,
      sessionId: context.sessionId,
      targetUserId: context.userId,
      targetUserName: context.targetUserName,
      targetUserEmail: context.targetUserEmail,
      organizationId: context.organizationId,
      organizationName: context.organizationName,
      startedAt: startedAt.toISOString(),
      expiresAt: context.expiresAt,
    });
  } catch (error) {
    console.error("Failed to get impersonation status:", error);
    return NextResponse.json({ isImpersonating: false });
  }
}
