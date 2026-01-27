# Implementation Plan: Super Admin Dashboard

**Branch**: `001-super-admin-dashboard` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-super-admin-dashboard/spec.md`

## Summary

Build a platform-level administrative dashboard accessible at `/admin/*` for GiveMetry operations staff. The dashboard enables organization lifecycle management, cross-tenant user administration, platform analytics, audit log access, and feature flag management. Implements separate authentication for super admins with role-based access control (super_admin vs support roles).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS
**Primary Dependencies**: Next.js 14 (App Router), tRPC 11, React Query, Prisma 5, NextAuth v5, Zod 4, shadcn/ui, Tailwind CSS
**Storage**: PostgreSQL (shared remote instance)
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Web application (same deployment as main app)
**Project Type**: Web application - extends existing monolithic Next.js app
**Performance Goals**: Dashboard loads in <3 seconds, pagination queries <500ms, audit log exports handle 100k+ records
**Constraints**: Must not impact tenant-facing application performance; super admin auth isolated from tenant auth
**Scale/Scope**: Initial: <10 super admins, <1000 organizations; Design for: 100+ orgs, 10k+ users across tenants

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. CRM-Agnostic | PASS | Super admin dashboard is internal tooling, no CRM coupling |
| II. Explainable AI | N/A | No AI features in this dashboard |
| III. Test-First Development | REQUIRED | Tests must be written before implementation for all routers and middleware |
| IV. Multi-Tenancy First | PASS | Dashboard provides cross-tenant visibility while maintaining data isolation |
| V. Security & Compliance | REQUIRED | Separate auth flow, audit logging, 2-year retention, login lockout |
| VI. Simplicity Over Cleverness | PASS | Uses existing patterns (tRPC, Prisma, shadcn); no new frameworks |
| VII. Documentation Separation | PASS | Spec contains WHAT/WHY; this plan contains HOW |

**Pre-Research Gate**: PASS

### Post-Design Re-Check

| Principle | Status | Verification |
|-----------|--------|--------------|
| I. CRM-Agnostic | PASS | No CRM integrations in design; standalone admin tooling |
| II. Explainable AI | N/A | No AI components in super admin dashboard |
| III. Test-First Development | ENFORCED | Test files defined in project structure; TDD workflow in quickstart |
| IV. Multi-Tenancy First | PASS | Cross-tenant queries use explicit joins; no data leakage vectors |
| V. Security & Compliance | PASS | Separate auth (research.md §1), 2-year retention (§4), lockout (§5), audit logging (data-model.md) |
| VI. Simplicity Over Cleverness | PASS | All patterns from existing codebase; no new dependencies added |
| VII. Documentation Separation | PASS | Spec unchanged; all technical details in plan artifacts |

**Post-Design Gate**: PASS - Design complies with all constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-super-admin-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (tRPC router specs)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── admin/                        # NEW: Super admin routes
│   │   ├── layout.tsx                # Admin layout with sidebar
│   │   ├── page.tsx                  # Dashboard overview
│   │   ├── login/
│   │   │   └── page.tsx              # Super admin login
│   │   ├── organizations/
│   │   │   ├── page.tsx              # Organization list
│   │   │   ├── new/page.tsx          # Create organization
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Organization detail (tabs)
│   │   │       └── users/page.tsx    # Org users tab
│   │   ├── users/
│   │   │   ├── page.tsx              # Global user list
│   │   │   └── [id]/page.tsx         # User detail
│   │   ├── analytics/
│   │   │   └── page.tsx              # Platform analytics
│   │   ├── audit/
│   │   │   └── page.tsx              # Audit log viewer
│   │   ├── feature-flags/
│   │   │   └── page.tsx              # Feature flag management
│   │   └── settings/
│   │       └── page.tsx              # Global settings
│   └── api/
│       └── admin/                    # NEW: Admin API routes
│           └── auth/[...nextauth]/
│               └── route.ts          # Separate NextAuth for super admins
├── lib/
│   └── auth/
│       ├── admin-config.ts           # NEW: Super admin NextAuth config
│       └── admin-middleware.ts       # NEW: Admin route protection
├── server/
│   ├── routers/
│   │   └── superAdmin/               # NEW: Super admin tRPC routers
│   │       ├── index.ts              # Router composition
│   │       ├── auth.ts               # Super admin auth
│   │       ├── organizations.ts      # Organization CRUD
│   │       ├── users.ts              # Cross-org user management
│   │       ├── analytics.ts          # Platform metrics
│   │       ├── audit.ts              # Audit log queries
│   │       ├── featureFlags.ts       # Feature flag management
│   │       └── impersonation.ts      # User impersonation
│   └── trpc/
│       └── admin-context.ts          # NEW: Super admin tRPC context
├── components/
│   └── admin/                        # NEW: Admin-specific components
│       ├── layout/
│       │   ├── AdminSidebar.tsx
│       │   ├── AdminHeader.tsx
│       │   └── ImpersonationBanner.tsx
│       ├── organizations/
│       │   ├── OrganizationTable.tsx
│       │   ├── OrganizationForm.tsx
│       │   └── OrganizationDetailTabs.tsx
│       ├── users/
│       │   ├── UserTable.tsx
│       │   └── UserDetailCard.tsx
│       ├── analytics/
│       │   ├── MetricCard.tsx
│       │   ├── GrowthChart.tsx
│       │   └── HealthStatus.tsx
│       └── shared/
│           ├── DataTable.tsx
│           ├── StatusBadge.tsx
│           └── ConfirmDialog.tsx
└── middleware.ts                     # MODIFY: Add /admin/* handling

prisma/
├── schema.prisma                     # MODIFY: Add new models
└── migrations/                       # NEW: Migration files

tests/
├── unit/
│   └── admin/                        # NEW: Admin unit tests
│       ├── auth.test.ts
│       ├── organizations.test.ts
│       ├── users.test.ts
│       └── permissions.test.ts
└── integration/
    └── admin/                        # NEW: Admin integration tests
        ├── organization-crud.test.ts
        ├── user-management.test.ts
        └── impersonation.test.ts
```

**Structure Decision**: Extends existing Next.js App Router structure. All super admin functionality contained under `/admin/*` path with dedicated tRPC routers in `src/server/routers/superAdmin/`. Uses existing component patterns (shadcn/ui) but with admin-specific components in `src/components/admin/`.

## Complexity Tracking

No constitution violations requiring justification. Implementation uses existing patterns and technology stack.

---

## Phase 0: Research

### Research Tasks

1. **NextAuth Multi-Provider Pattern**: How to run separate NextAuth instances for tenant users vs super admins
2. **Prisma Soft Delete Pattern**: Best practices for soft delete with retention period and scheduled hard delete
3. **Session Impersonation**: Secure patterns for user impersonation with session switching
4. **Audit Log Retention**: PostgreSQL strategies for 2-year retention with efficient querying
5. **Login Lockout**: Rate limiting and account lockout implementation patterns

See [research.md](./research.md) for detailed findings.

---

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for complete Prisma schema additions.

### API Contracts

See [contracts/](./contracts/) directory for tRPC router specifications.

### Quickstart

See [quickstart.md](./quickstart.md) for development setup and testing guide.
