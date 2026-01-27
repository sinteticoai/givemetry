# Data Model: Super Admin Dashboard

**Feature**: 001-super-admin-dashboard
**Date**: 2026-01-27

## Overview

This document defines the Prisma schema additions and modifications required for the Super Admin Dashboard feature.

## New Models

### SuperAdmin

Platform-level administrator account, completely separate from tenant users.

```prisma
model SuperAdmin {
  id                  String    @id @default(uuid()) @db.Uuid
  email               String    @unique @db.VarChar(255)
  passwordHash        String    @db.VarChar(255)
  name                String    @db.VarChar(255)
  role                SuperAdminRole @default(support)
  isActive            Boolean   @default(true)
  lastLoginAt         DateTime?
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Relations
  auditLogs           SuperAdminAuditLog[]
  impersonationSessions ImpersonationSession[]

  @@index([email])
  @@index([isActive])
}

enum SuperAdminRole {
  super_admin  // Full access: CRUD orgs, users, impersonate, delete
  support      // Read-only + password reset, disable user (no impersonate/delete)
}
```

**Validation Rules:**
- `email`: Valid email format, unique across all super admins
- `name`: 1-255 characters
- `passwordHash`: bcrypt hash (12 rounds minimum)
- `failedLoginAttempts`: Reset to 0 on successful login
- `lockedUntil`: Set to now + 15 minutes when `failedLoginAttempts` reaches 5

---

### SuperAdminAuditLog

Audit trail for all super admin actions.

```prisma
model SuperAdminAuditLog {
  id              BigInt    @id @default(autoincrement())
  superAdminId    String    @db.Uuid
  action          String    @db.VarChar(100)
  targetType      String    @db.VarChar(50)   // 'organization', 'user', 'feature_flag', 'super_admin'
  targetId        String?   @db.VarChar(100)
  organizationId  String?   @db.Uuid          // If action was on/within an org
  details         Json?                        // Additional context (before/after values)
  ipAddress       String?   @db.VarChar(45)   // IPv4 or IPv6
  userAgent       String?   @db.Text
  createdAt       DateTime  @default(now())

  // Relations
  superAdmin      SuperAdmin @relation(fields: [superAdminId], references: [id])

  @@index([superAdminId])
  @@index([organizationId])
  @@index([action])
  @@index([targetType, targetId])
  @@index([createdAt])
}
```

**Action Types:**
- `organization.create`, `organization.update`, `organization.suspend`, `organization.reactivate`, `organization.delete`, `organization.hard_delete`
- `user.disable`, `user.enable`, `user.reset_password`, `user.change_role`
- `impersonation.start`, `impersonation.end`, `impersonation.timeout`
- `feature_flag.create`, `feature_flag.update`, `feature_flag.delete`
- `feature_flag_override.set`, `feature_flag_override.remove`
- `super_admin.login`, `super_admin.logout`, `super_admin.login_failed`, `super_admin.locked`
- `audit.export`

---

### ImpersonationSession

Tracks active and historical impersonation sessions.

```prisma
model ImpersonationSession {
  id              String    @id @default(uuid()) @db.Uuid
  superAdminId    String    @db.Uuid
  userId          String    @db.Uuid
  organizationId  String    @db.Uuid
  reason          String    @db.Text
  startedAt       DateTime  @default(now())
  endedAt         DateTime?
  endReason       String?   @db.VarChar(50)  // 'manual', 'timeout', 'admin_logout'

  // Relations
  superAdmin      SuperAdmin   @relation(fields: [superAdminId], references: [id])
  user            User         @relation(fields: [userId], references: [id])
  organization    Organization @relation(fields: [organizationId], references: [id])

  @@index([superAdminId])
  @@index([userId])
  @@index([organizationId])
  @@index([startedAt])
}
```

**State Transitions:**
- Created: `startedAt` set, `endedAt` null
- Ended manually: `endedAt` set, `endReason` = 'manual'
- Ended by timeout: `endedAt` set, `endReason` = 'timeout'
- Ended by admin logout: `endedAt` set, `endReason` = 'admin_logout'

---

### FeatureFlag

Platform-wide feature toggle definitions.

```prisma
model FeatureFlag {
  id              String    @id @default(uuid()) @db.Uuid
  key             String    @unique @db.VarChar(100)  // e.g., 'ai_briefings', 'bulk_export'
  name            String    @db.VarChar(255)
  description     String?   @db.Text
  defaultEnabled  Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  overrides       FeatureFlagOverride[]

  @@index([key])
}
```

**Validation Rules:**
- `key`: Lowercase alphanumeric with underscores, unique
- `name`: Human-readable name for UI display

---

### FeatureFlagOverride

Per-organization feature flag state.

```prisma
model FeatureFlagOverride {
  id              String    @id @default(uuid()) @db.Uuid
  featureFlagId   String    @db.Uuid
  organizationId  String    @db.Uuid
  enabled         Boolean
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  featureFlag     FeatureFlag  @relation(fields: [featureFlagId], references: [id], onDelete: Cascade)
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([featureFlagId, organizationId])
  @@index([organizationId])
}
```

---

## Modified Models

### Organization

Add status management and soft delete fields.

```prisma
model Organization {
  // ... existing fields ...

  // NEW: Status management
  status          OrgStatus   @default(active)
  suspendedAt     DateTime?
  suspendedReason String?     @db.Text
  deletedAt       DateTime?                    // Soft delete timestamp
  usageLimits     Json        @default("{}")   // { maxUsers: 50, maxConstituents: 10000, ... }

  // NEW: Relations
  featureFlagOverrides FeatureFlagOverride[]
  impersonationSessions ImpersonationSession[]

  // ... existing relations ...
}

enum OrgStatus {
  active
  suspended
  pending_deletion
}
```

**State Transitions:**
- `active` → `suspended`: Set `suspendedAt`, `suspendedReason`
- `suspended` → `active`: Clear `suspendedAt`, `suspendedReason`
- `active`/`suspended` → `pending_deletion`: Set `status`, `deletedAt`
- `pending_deletion` → hard delete: After 30 days, remove record entirely

**Usage Limits Schema:**
```json
{
  "maxUsers": 50,
  "maxConstituents": 10000,
  "maxStorageMb": 5000,
  "maxAiQueriesPerMonth": 1000
}
```

---

### User

Add disable functionality for individual user blocking.

```prisma
model User {
  // ... existing fields ...

  // NEW: Disable functionality
  isDisabled      Boolean     @default(false)
  disabledAt      DateTime?
  disabledReason  String?     @db.Text
  disabledBy      String?     @db.Uuid  // SuperAdmin ID who disabled

  // NEW: Relations
  impersonationSessions ImpersonationSession[]

  // ... existing relations ...
}
```

**Login Check Logic:**
1. Check `organization.status` != 'suspended' AND != 'pending_deletion'
2. Check `user.isDisabled` != true
3. Proceed with normal authentication

---

## Index Strategy

### Query Patterns and Indexes

| Query Pattern | Index |
|--------------|-------|
| Super admin login | `SuperAdmin(email)` |
| Active super admins | `SuperAdmin(isActive)` |
| Audit logs by date | `SuperAdminAuditLog(createdAt)` |
| Audit logs by org | `SuperAdminAuditLog(organizationId)` |
| Audit logs by action | `SuperAdminAuditLog(action)` |
| Audit logs by target | `SuperAdminAuditLog(targetType, targetId)` |
| Active impersonations | `ImpersonationSession(superAdminId)` where `endedAt IS NULL` |
| Feature flag lookup | `FeatureFlag(key)` |
| Org feature overrides | `FeatureFlagOverride(organizationId)` |

---

## Migration Strategy

### Migration Order

1. **Create enums**: `SuperAdminRole`, `OrgStatus`
2. **Create new tables**: `SuperAdmin`, `SuperAdminAuditLog`, `ImpersonationSession`, `FeatureFlag`, `FeatureFlagOverride`
3. **Modify Organization**: Add `status`, `suspendedAt`, `suspendedReason`, `deletedAt`, `usageLimits`
4. **Modify User**: Add `isDisabled`, `disabledAt`, `disabledReason`, `disabledBy`
5. **Add relations**: Foreign keys and indexes
6. **Seed initial super admin**: Create first super_admin account for bootstrap

### Seed Data

```typescript
// prisma/seed-admin.ts
async function seedSuperAdmin() {
  const hashedPassword = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD!, 12);

  await prisma.superAdmin.upsert({
    where: { email: 'admin@givemetry.com' },
    update: {},
    create: {
      email: 'admin@givemetry.com',
      name: 'Initial Admin',
      passwordHash: hashedPassword,
      role: 'super_admin',
      isActive: true,
    },
  });
}
```

---

## Data Retention

### Audit Log Retention (2 Years)

Scheduled job runs monthly to purge old audit logs:

```typescript
async function purgeOldAuditLogs() {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);

  const deleted = await prisma.superAdminAuditLog.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });

  console.log(`Purged ${deleted.count} audit logs older than ${cutoff.toISOString()}`);
}
```

### Organization Soft Delete (30 Days)

Scheduled job runs daily to hard-delete expired organizations:

```typescript
async function purgeDeletedOrganizations() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get orgs to delete for logging
  const toDelete = await prisma.organization.findMany({
    where: { status: 'pending_deletion', deletedAt: { lt: cutoff } },
    select: { id: true, name: true, deletedAt: true }
  });

  if (toDelete.length === 0) return;

  // Cascade delete (Prisma handles related records)
  await prisma.organization.deleteMany({
    where: { id: { in: toDelete.map(o => o.id) } }
  });

  console.log(`Hard-deleted ${toDelete.length} organizations:`, toDelete.map(o => o.name));
}
```
