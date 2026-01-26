// T024, T064: Auth middleware for session validation with idle timeout and role-based protection
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/auth",
  "/api/trpc/auth",
];

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/donors",
  "/priorities",
  "/lapse-risk",
  "/alerts",
  "/reports",
  "/uploads",
  "/settings",
];

// T064: Routes that require specific roles (beyond basic authentication)
// Format: { route: [allowedRoles] }
const roleRestrictedRoutes: Record<string, string[]> = {
  // Admin-only routes
  "/admin": ["admin"],
  // Manager and above routes
  "/uploads/new": ["admin", "manager"],
  "/reports/create": ["admin", "manager"],
};

// 30 minutes idle timeout in milliseconds
const IDLE_TIMEOUT = 30 * 60 * 1000;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for authentication token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  // Check for idle timeout
  const lastActivity = token.lastActivity as number | undefined;
  if (lastActivity && Date.now() - lastActivity > IDLE_TIMEOUT) {
    // Session expired due to inactivity
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "idle");
    return NextResponse.redirect(loginUrl);
  }

  // Check if route is protected and user is authenticated
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!token.organizationId) {
      // User doesn't have an organization - redirect to setup
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // T064: Check role-restricted routes
  const userRole = token.role as string | undefined;
  for (const [route, allowedRoles] of Object.entries(roleRestrictedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!userRole || !allowedRoles.includes(userRole)) {
        // User doesn't have required role - redirect to dashboard with error
        const dashboardUrl = new URL("/dashboard", request.url);
        dashboardUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  // Add security headers for all authenticated routes
  const response = NextResponse.next();

  // T066: Add request metadata for audit logging (available via headers in API routes)
  response.headers.set("x-user-id", token.sub || "");
  response.headers.set("x-organization-id", (token.organizationId as string) || "");
  response.headers.set("x-user-role", userRole || "");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)",
  ],
};
