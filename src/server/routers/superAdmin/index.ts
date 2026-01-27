// T035, T046, T070, T082, T092, T099: Super Admin Router Composition
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { AdminContext } from "@/server/trpc/admin-context";
import { authRouter } from "./auth";
import { organizationsRouter } from "./organizations";
import { usersRouter } from "./users";
import { impersonationRouter } from "./impersonation";
import { analyticsRouter } from "./analytics";
import { auditRouter } from "./audit";

// Initialize tRPC for admin context
const t = initTRPC.context<AdminContext>().create({
  transformer: superjson,
});

// Compose all super admin routers
export const superAdminRouter = t.router({
  auth: authRouter,
  organizations: organizationsRouter,
  users: usersRouter,
  impersonation: impersonationRouter,
  analytics: analyticsRouter,
  audit: auditRouter,
  // Future routers will be added here:
  // featureFlags: featureFlagsRouter,
});

export type SuperAdminRouter = typeof superAdminRouter;
