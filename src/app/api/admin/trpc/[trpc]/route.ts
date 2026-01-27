/**
 * Admin tRPC API route handler
 *
 * Handles super admin tRPC requests at /api/admin/trpc/*
 * Uses admin context with super admin session
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { superAdminRouter } from "@/server/routers/superAdmin";
import { createAdminContext } from "@/server/trpc/admin-context";

const handler = (request: Request) =>
  fetchRequestHandler({
    endpoint: "/api/admin/trpc",
    req: request,
    router: superAdminRouter,
    createContext: createAdminContext,
    onError: ({ error, path }) => {
      console.error(`[Admin tRPC] Error on ${path}:`, error.message);
    },
  });

export { handler as GET, handler as POST };
