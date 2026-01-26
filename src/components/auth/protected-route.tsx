// T064: Protected route wrapper for role-based access control
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { UserRole } from "@prisma/client";
import { hasPermission, isAtLeastRole, type Permission } from "@/lib/auth/permissions";
import { Loader2, ShieldX } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
}

function DefaultLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function DefaultForbiddenFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
      <ShieldX className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground">
        You don&apos;t have permission to view this content.
      </p>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Loading state
  if (status === "loading") {
    return <>{fallback ?? <DefaultLoadingFallback />}</>;
  }

  // Redirect to login if unauthenticated
  if (status === "unauthenticated") {
    return <>{fallback ?? <DefaultLoadingFallback />}</>;
  }

  // Check if user exists in session
  const user = session?.user as { role?: UserRole } | undefined;
  if (!user?.role) {
    return <>{fallback ?? <DefaultForbiddenFallback />}</>;
  }

  // Check role requirement
  if (requiredRole && !isAtLeastRole(user.role, requiredRole)) {
    return <>{fallback ?? <DefaultForbiddenFallback />}</>;
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return <>{fallback ?? <DefaultForbiddenFallback />}</>;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
