// T024, T064, T262: Auth middleware with session validation, role-based protection, and security headers
// T019: Super admin route handling
// T081: Impersonation timeout handling
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getAdminToken,
  isAdminRoute,
  isAdminLoginRoute,
  isAdminApiRoute,
  validateAdminAccess,
} from "@/lib/auth/admin-middleware";

// T081: Impersonation constants
const IMPERSONATION_COOKIE_NAME = "impersonation-context";
// Note: IMPERSONATION_TIMEOUT_MS is not needed here as the cookie stores the actual expiresAt

// T262: Security headers configuration
const securityHeaders = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  // Enable XSS filter (legacy browsers)
  "X-XSS-Protection": "1; mode=block",
  // Control referrer information
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Prevent DNS prefetching for privacy
  "X-DNS-Prefetch-Control": "off",
  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'", // Required for styled components
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com https://api.openai.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  // Permissions Policy (disable unnecessary features)
  "Permissions-Policy": [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "interest-cohort=()", // Disable FLoC
  ].join(", "),
};

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

  // T081: Check for impersonation session and timeout
  const impersonationCheck = await checkImpersonationTimeout(request);
  if (impersonationCheck.expired) {
    // Clear impersonation cookie and redirect to admin
    const response = NextResponse.redirect(new URL("/admin", request.url));
    response.cookies.delete(IMPERSONATION_COOKIE_NAME);
    return response;
  }

  // T019: Handle admin routes separately
  if (isAdminRoute(pathname) || isAdminApiRoute(pathname)) {
    return handleAdminRoutes(request, pathname);
  }

  // Allow public routes with security headers
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const response = NextResponse.next();
    // T262: Apply security headers to public routes as well
    for (const [header, value] of Object.entries(securityHeaders)) {
      response.headers.set(header, value);
    }
    return response;
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

  // Add security headers for all routes
  const response = NextResponse.next();

  // T262: Apply security headers
  for (const [header, value] of Object.entries(securityHeaders)) {
    response.headers.set(header, value);
  }

  // T066: Add request metadata for audit logging (available via headers in API routes)
  response.headers.set("x-user-id", token.sub || "");
  response.headers.set("x-organization-id", (token.organizationId as string) || "");
  response.headers.set("x-user-role", userRole || "");

  return response;
}

/**
 * T019: Handle admin route authentication
 */
async function handleAdminRoutes(request: NextRequest, pathname: string) {
  // Allow admin auth API routes without token check
  if (pathname.startsWith("/api/admin/auth")) {
    const response = NextResponse.next();
    for (const [header, value] of Object.entries(securityHeaders)) {
      response.headers.set(header, value);
    }
    return response;
  }

  // Allow admin login page without auth
  if (isAdminLoginRoute(pathname)) {
    const response = NextResponse.next();
    for (const [header, value] of Object.entries(securityHeaders)) {
      response.headers.set(header, value);
    }
    return response;
  }

  // Check admin token
  const adminToken = await getAdminToken(request);
  const validation = validateAdminAccess(adminToken, pathname);

  if (!validation.valid && validation.redirect) {
    return NextResponse.redirect(new URL(validation.redirect, request.url));
  }

  // Add admin context to response headers
  const response = NextResponse.next();
  for (const [header, value] of Object.entries(securityHeaders)) {
    response.headers.set(header, value);
  }

  if (adminToken) {
    response.headers.set("x-admin-id", adminToken.id);
    response.headers.set("x-admin-role", adminToken.role);
  }

  return response;
}

/**
 * T081: Check impersonation session timeout
 * Returns { expired: true } if the impersonation session has timed out
 */
async function checkImpersonationTimeout(request: NextRequest): Promise<{ expired: boolean }> {
  const impersonationCookie = request.cookies.get(IMPERSONATION_COOKIE_NAME);

  if (!impersonationCookie?.value) {
    return { expired: false };
  }

  try {
    const context = JSON.parse(impersonationCookie.value);
    const expiresAt = new Date(context.expiresAt);

    if (expiresAt < new Date()) {
      // Session has expired
      return { expired: true };
    }

    return { expired: false };
  } catch {
    // Invalid cookie format, treat as expired to clear it
    return { expired: true };
  }
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
