# Quickstart: Super Admin Dashboard

**Feature**: 001-super-admin-dashboard
**Date**: 2026-01-27

## Prerequisites

- Node.js 20 LTS
- pnpm package manager
- Access to PostgreSQL database (shared dev instance)
- Environment variables configured (see below)

## Environment Setup

Add to `.env.local`:

```bash
# Super Admin Auth (separate from tenant auth)
ADMIN_AUTH_SECRET="generate-a-separate-32-char-secret"
ADMIN_AUTH_URL="http://localhost:3000/admin"

# Initial super admin (for seeding)
INITIAL_ADMIN_EMAIL="admin@givemetry.com"
INITIAL_ADMIN_PASSWORD="change-this-secure-password"
```

Generate secrets:
```bash
openssl rand -base64 32
```

## Database Setup

### 1. Generate Migration

```bash
pnpm db:generate
```

### 2. Run Migration

```bash
pnpm db:migrate
```

### 3. Seed Initial Super Admin

```bash
pnpm db:seed:admin
```

Or manually via Prisma Studio:
```bash
pnpm db:studio
```

## Development

### Start Development Server

```bash
pnpm dev
```

### Access Points

| URL | Description |
|-----|-------------|
| `http://localhost:3000/admin/login` | Super admin login |
| `http://localhost:3000/admin` | Admin dashboard (requires auth) |
| `http://localhost:3000/admin/organizations` | Organization management |
| `http://localhost:3000/admin/users` | User management |
| `http://localhost:3000/admin/analytics` | Platform analytics |
| `http://localhost:3000/admin/audit` | Audit logs |
| `http://localhost:3000/admin/feature-flags` | Feature flag management |

## Testing

### Run All Admin Tests

```bash
pnpm test tests/unit/admin
pnpm test tests/integration/admin
```

### Run Specific Test File

```bash
pnpm vitest run tests/unit/admin/auth.test.ts
pnpm vitest run tests/unit/admin/organizations.test.ts
```

### Watch Mode

```bash
pnpm vitest watch tests/unit/admin
```

### Test Coverage

```bash
pnpm test:coverage -- --include="src/server/routers/superAdmin/**"
```

## Key Files

### Authentication

| File | Purpose |
|------|---------|
| `src/lib/auth/admin-config.ts` | NextAuth config for super admins |
| `src/app/api/admin/auth/[...nextauth]/route.ts` | Auth API handler |
| `src/lib/auth/admin-middleware.ts` | Route protection middleware |

### tRPC Routers

| File | Purpose |
|------|---------|
| `src/server/routers/superAdmin/index.ts` | Router composition |
| `src/server/routers/superAdmin/auth.ts` | Login/logout/session |
| `src/server/routers/superAdmin/organizations.ts` | Org CRUD |
| `src/server/routers/superAdmin/users.ts` | User management |
| `src/server/routers/superAdmin/impersonation.ts` | User impersonation |
| `src/server/routers/superAdmin/analytics.ts` | Platform metrics |
| `src/server/routers/superAdmin/audit.ts` | Audit log queries |
| `src/server/routers/superAdmin/featureFlags.ts` | Feature flags |

### UI Components

| Directory | Purpose |
|-----------|---------|
| `src/components/admin/layout/` | Sidebar, header, impersonation banner |
| `src/components/admin/organizations/` | Org table, forms, detail tabs |
| `src/components/admin/users/` | User table, detail cards |
| `src/components/admin/analytics/` | Metric cards, charts |
| `src/components/admin/shared/` | Reusable data table, badges, dialogs |

### Pages

| File | Route |
|------|-------|
| `src/app/admin/layout.tsx` | Admin layout wrapper |
| `src/app/admin/page.tsx` | Dashboard overview |
| `src/app/admin/login/page.tsx` | Login form |
| `src/app/admin/organizations/page.tsx` | Org list |
| `src/app/admin/organizations/[id]/page.tsx` | Org detail |
| `src/app/admin/users/page.tsx` | User list |
| `src/app/admin/users/[id]/page.tsx` | User detail |

## Test Data

### Creating Test Organizations

```typescript
// Via tRPC (in tests or scripts)
const org = await trpc.superAdmin.organizations.create({
  name: 'Test University',
  slug: 'test-university',
  plan: 'professional',
  initialAdminEmail: 'admin@test-university.edu',
});
```

### Creating Test Super Admins

```typescript
// Via Prisma (in seed script)
await prisma.superAdmin.create({
  data: {
    email: 'support@givemetry.com',
    name: 'Support User',
    passwordHash: await bcrypt.hash('test-password', 12),
    role: 'support',
  },
});
```

## Debugging

### Check Super Admin Session

```typescript
// In browser console (on admin pages)
const session = await fetch('/api/admin/auth/session').then(r => r.json());
console.log(session);
```

### Check Impersonation Status

```typescript
// In browser console
const status = await trpc.superAdmin.impersonation.current.query();
console.log(status);
```

### View Audit Logs

```bash
# Recent super admin actions
pnpm prisma studio
# Navigate to SuperAdminAuditLog table
```

## Common Issues

### "Unauthorized" on Admin Routes

1. Check `admin-auth.session-token` cookie exists
2. Verify session hasn't expired (8-hour max)
3. Check middleware is correctly routing `/admin/*` paths

### "Account Locked" on Login

1. Wait 15 minutes for automatic unlock
2. Or manually clear lockout:
   ```sql
   UPDATE "SuperAdmin"
   SET "failedLoginAttempts" = 0, "lockedUntil" = NULL
   WHERE email = 'your-email@givemetry.com';
   ```

### Impersonation Cookie Not Set

1. Ensure super admin has `super_admin` role (not `support`)
2. Check `impersonation-context` cookie in browser dev tools
3. Verify ImpersonationSession record was created in database

## Security Checklist

Before deploying:

- [ ] `ADMIN_AUTH_SECRET` is unique and not shared with `AUTH_SECRET`
- [ ] Initial admin password changed from seed value
- [ ] All admin routes protected by middleware
- [ ] Audit logging enabled for all mutations
- [ ] Rate limiting active on login endpoint
- [ ] HTTPS enforced in production
