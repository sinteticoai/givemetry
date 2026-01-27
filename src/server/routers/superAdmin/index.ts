// T035, T046: Super Admin Router Composition
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { AdminContext } from "@/server/trpc/admin-context";
import { authRouter } from "./auth";
import { organizationsRouter } from "./organizations";

// Initialize tRPC for admin context
const t = initTRPC.context<AdminContext>().create({
  transformer: superjson,
});

// Compose all super admin routers
export const superAdminRouter = t.router({
  auth: authRouter,
  organizations: organizationsRouter,
  // Future routers will be added here:
  // users: usersRouter,
  // analytics: analyticsRouter,
  // audit: auditRouter,
  // featureFlags: featureFlagsRouter,
  // impersonation: impersonationRouter,
});

export type SuperAdminRouter = typeof superAdminRouter;
