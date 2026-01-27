# Research: Super Admin Dashboard

**Feature**: 001-super-admin-dashboard
**Date**: 2026-01-27

## 1. NextAuth Multi-Provider Pattern

### Decision
Use a **separate NextAuth configuration** at `/api/admin/auth/[...nextauth]` with its own JWT secret and session cookie name.

### Rationale
- NextAuth v5 supports multiple configurations by mounting handlers at different paths
- Separate JWT secrets ensure super admin tokens cannot be used for tenant access and vice versa
- Different cookie names (`next-auth.session-token` vs `admin-auth.session-token`) prevent session confusion
- Middleware can distinguish admin vs tenant routes by checking the appropriate cookie

### Alternatives Considered
1. **Single NextAuth with role flag**: Rejected - tokens could be manipulated; harder to enforce separate session duration
2. **Completely separate auth system**: Rejected - unnecessary complexity; NextAuth patterns work well
3. **Custom JWT implementation**: Rejected - reinventing the wheel; security risk

### Implementation Notes
```typescript
// src/lib/auth/admin-config.ts
export const adminAuthConfig: NextAuthConfig = {
  providers: [Credentials({ /* super admin credentials */ })],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 hours
  cookies: {
    sessionToken: { name: 'admin-auth.session-token' }
  },
  jwt: { secret: process.env.ADMIN_AUTH_SECRET },
  pages: { signIn: '/admin/login' }
}
```

---

## 2. Prisma Soft Delete Pattern

### Decision
Add `deletedAt` timestamp field to Organization model with Prisma middleware to filter soft-deleted records by default.

### Rationale
- Prisma middleware can automatically exclude `deletedAt IS NOT NULL` from all queries
- 30-day retention implemented via scheduled job (cron) that hard-deletes expired records
- Explicit `includeDeleted: true` option for admin queries that need to see pending deletions
- Matches existing Prisma patterns in codebase

### Alternatives Considered
1. **Separate archive table**: Rejected - complex migrations; harder to restore
2. **Status enum only**: Rejected - doesn't capture deletion timestamp for retention calculation
3. **PostgreSQL partitioning**: Rejected - overkill for this scale; adds operational complexity

### Implementation Notes
```prisma
model Organization {
  // ... existing fields
  status        OrgStatus @default(active)
  deletedAt     DateTime?
  suspendedAt   DateTime?
  suspendedReason String?
}

enum OrgStatus {
  active
  suspended
  pending_deletion
}
```

Scheduled cleanup job:
```typescript
// Run daily via cron
async function cleanupDeletedOrganizations() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.organization.deleteMany({
    where: { status: 'pending_deletion', deletedAt: { lt: cutoff } }
  });
}
```

---

## 3. Session Impersonation

### Decision
Store impersonation context in a **separate cookie** alongside the admin session; use database-backed ImpersonationSession for audit trail.

### Rationale
- Admin session remains intact (can end impersonation without re-authenticating)
- ImpersonationSession record provides audit trail with start/end times
- Separate cookie (`impersonation-context`) contains encrypted target user ID + org ID
- All tenant API requests during impersonation check this cookie and log with impersonation flag
- 1-hour timeout enforced via cookie expiry + server-side validation

### Alternatives Considered
1. **JWT claim modification**: Rejected - would require token refresh; complex state management
2. **Session swap (replace admin session)**: Rejected - loses admin context; harder to end session
3. **Server-side session only**: Rejected - doesn't integrate with existing JWT-based auth

### Implementation Notes
```typescript
// Start impersonation
async function startImpersonation(adminId: string, userId: string, reason: string) {
  const session = await prisma.impersonationSession.create({
    data: { superAdminId: adminId, userId, reason, organizationId: user.organizationId }
  });

  // Set encrypted cookie with 1-hour expiry
  const context = encrypt({ sessionId: session.id, userId, orgId: user.organizationId });
  cookies().set('impersonation-context', context, { maxAge: 3600, httpOnly: true });

  return session;
}

// End impersonation
async function endImpersonation(sessionId: string) {
  await prisma.impersonationSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date() }
  });
  cookies().delete('impersonation-context');
}
```

---

## 4. Audit Log Retention

### Decision
Use **PostgreSQL table partitioning by month** for SuperAdminAuditLog with automatic partition management.

### Rationale
- 2-year retention = 24 partitions; dropping old partitions is O(1) operation
- Queries within date ranges only scan relevant partitions
- BigInt ID with timestamp indexing provides efficient cursor-based pagination
- Existing AuditLog model pattern extended for super admin actions

### Alternatives Considered
1. **Single table with index**: Rejected - DELETE operations on large tables cause locks
2. **Archive to S3/cold storage**: Rejected - complicates queries; export feature needs live data
3. **Separate time-series DB**: Rejected - operational complexity; overkill for this volume

### Implementation Notes
```sql
-- Partition by month
CREATE TABLE super_admin_audit_log (
  id BIGSERIAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- ... other columns
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions (automated monthly)
CREATE TABLE super_admin_audit_log_2026_01
  PARTITION OF super_admin_audit_log
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Drop partitions older than 2 years (monthly cron)
DROP TABLE IF EXISTS super_admin_audit_log_2024_01;
```

For simplicity in Phase 1, start with a single table + index; add partitioning when data volume warrants.

---

## 5. Login Lockout

### Decision
Implement **in-database lockout tracking** with `failedLoginAttempts` and `lockedUntil` fields on SuperAdmin model.

### Rationale
- Database-backed ensures lockout persists across server restarts
- Simple increment/reset logic in auth flow
- 15-minute lockout after 5 failures (per spec clarification)
- No external dependencies (Redis not required)
- Audit log entry created on lockout

### Alternatives Considered
1. **Redis-based rate limiting**: Rejected - adds infrastructure dependency; overkill for <10 admins
2. **IP-based blocking**: Rejected - doesn't protect against credential stuffing from multiple IPs
3. **CAPTCHA after failures**: Rejected - adds UX friction; lockout is simpler and sufficient

### Implementation Notes
```prisma
model SuperAdmin {
  // ... existing fields
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
}
```

```typescript
async function validateSuperAdminLogin(email: string, password: string) {
  const admin = await prisma.superAdmin.findUnique({ where: { email } });

  // Check lockout
  if (admin?.lockedUntil && admin.lockedUntil > new Date()) {
    throw new Error('Account temporarily locked. Try again later.');
  }

  // Validate password
  const valid = await bcrypt.compare(password, admin.passwordHash);

  if (!valid) {
    const attempts = (admin?.failedLoginAttempts ?? 0) + 1;
    const updates: Prisma.SuperAdminUpdateInput = { failedLoginAttempts: attempts };

    if (attempts >= 5) {
      updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      // Log lockout event
    }

    await prisma.superAdmin.update({ where: { email }, data: updates });
    throw new Error('Invalid credentials');
  }

  // Reset on success
  await prisma.superAdmin.update({
    where: { email },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }
  });

  return admin;
}
```

---

## Summary

| Topic | Decision | Key Benefit |
|-------|----------|-------------|
| Multi-auth | Separate NextAuth config at `/api/admin/auth` | Complete session isolation |
| Soft delete | `deletedAt` field + scheduled cleanup | Simple implementation; auditable |
| Impersonation | Separate cookie + DB session record | Audit trail; easy session control |
| Audit retention | Single table (partition later) | Simple start; scalable path |
| Login lockout | DB fields on SuperAdmin model | No external dependencies |

All NEEDS CLARIFICATION items resolved. Ready for Phase 1 design.
