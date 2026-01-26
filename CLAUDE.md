# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is GiveMetry

AI-powered donor analytics platform for nonprofit gift officers. Multi-tenant SaaS that analyzes constituent data to predict lapse risk, prioritize outreach, and generate AI briefings.

## Commands

```bash
pnpm dev              # Start development server
pnpm build            # Production build
pnpm test             # Run all tests (vitest)
pnpm test:unit        # Unit tests only
pnpm test:watch       # Watch mode
pnpm lint             # ESLint
pnpm typecheck        # TypeScript check

# Database
pnpm db:migrate       # Run migrations (dev)
pnpm db:generate      # Regenerate Prisma client
pnpm db:seed          # Seed test data
pnpm db:studio        # Open Prisma Studio
```

Run a single test file:
```bash
pnpm vitest run tests/unit/auth/tokens.test.ts
```

## Architecture

### Multi-Tenancy

Every data model has `organizationId`. Tenant isolation enforced at two levels:

1. **tRPC Context** (`src/server/trpc/context.ts`): Provides `withOrgFilter()` and `withOrgCreate()` helpers that auto-inject organizationId
2. **Prisma Tenant Extension** (`src/lib/prisma/tenant.ts`): Optional RLS via `getTenantPrisma(orgId)` for PostgreSQL row-level security

When writing queries, always use the context helpers:
```typescript
const constituents = await ctx.prisma.constituent.findMany({
  where: ctx.withOrgFilter({ isActive: true }),
});
```

### Authentication

NextAuth v5 with JWT strategy (`src/lib/auth/config.ts`). Session includes extended user fields: `organizationId` and `role`.

Roles: `admin`, `manager`, `gift_officer`, `viewer`

Portfolio-based access: Gift officers only see their assigned constituents via `getPortfolioFilter(ctx)` in `context.ts:46`.

### tRPC Router Structure

Root router at `src/server/routers/_app.ts` combines domain routers:
- `auth` - signup, password reset, email verification
- `constituent` - donor records
- `gift` - donation history
- `contact` - interaction logs
- `analysis` - lapse risk, priority scoring
- `ai` - Claude API for briefings
- `alert` - at-risk notifications
- `upload` - CSV imports

### Key Paths

```
src/
  app/                  # Next.js App Router
    (auth)/             # Login, signup, password reset
    (dashboard)/        # Protected routes
    api/trpc/           # tRPC HTTP handler
  server/
    routers/            # tRPC routers (business logic)
    services/           # Email, audit, data services
    trpc/               # tRPC init and context
  lib/
    auth/               # NextAuth config, permissions
    prisma/             # DB client and tenant isolation
    storage/            # S3/local file storage
  components/
    ui/                 # shadcn/ui components
    layout/             # App shell (header, sidebar)
    shared/             # Reusable domain components
```

## Database

Remote PostgreSQL on VPS - shared between local dev and server environments.

Before running migrations, ensure you understand impact on shared data.

## Tech Stack

- TypeScript 5.x, Node.js 20 LTS
- Next.js 14 (App Router)
- tRPC 11 + React Query
- Prisma 5 + PostgreSQL
- NextAuth v5 (beta)
- Zod 4 for validation
- Vitest + Playwright for testing
- shadcn/ui + Tailwind CSS
