# Feature Specification: Super Admin Dashboard

## Overview

### Problem Statement

GiveMetry currently has tenant-level administration (users with `admin` role manage their organization), but lacks platform-level administrative capabilities. As the platform grows, we need operational tooling to:

- Onboard and manage customer organizations
- Monitor platform health and usage across all tenants
- Handle support escalations and debugging
- Control feature access and billing status per organization

### Solution

Build a **Super Admin Dashboard** — a separate administrative interface accessible only to platform operators (Anthropic/GiveMetry staff). This dashboard provides cross-tenant visibility and management capabilities while maintaining strict security boundaries.

---

## Goals

1. **Organization Lifecycle Management** — Create, configure, suspend, and delete customer organizations
2. **User Management** — View and manage users across all organizations; support impersonation for debugging
3. **Platform Observability** — Real-time metrics, usage analytics, and health monitoring
4. **Support Operations** — Tools to investigate issues, view audit logs, and assist customers
5. **Feature & Billing Control** — Manage plans, feature flags, and usage limits per organization

## Non-Goals

- Customer-facing self-service billing portal (future feature)
- Automated provisioning APIs for external systems
- White-labeling or reseller management
- Direct database manipulation UI

---

## User Personas

### Platform Administrator (Super Admin)

- **Who**: GiveMetry operations staff, support engineers, founders
- **Needs**: Full visibility into all organizations, ability to assist customers, platform health monitoring
- **Access Level**: Can view/modify any organization, impersonate users, access all audit logs

### Support Engineer

- **Who**: Customer support staff
- **Needs**: Read-only access to investigate issues, view user activity, check configurations
- **Access Level**: Can view organizations and users, read audit logs, but cannot modify or impersonate

---

## Functional Requirements

### 1. Organization Management

#### 1.1 Organization List View
- Paginated list of all organizations
- Columns: Name, Slug, Plan, Status, Users Count, Constituents Count, Created Date, Last Activity
- Filters: Plan type, Status (active/suspended/trial), Date range
- Search: By name, slug, or admin email
- Sort: By any column

#### 1.2 Organization Detail View
- **Overview Tab**
  - Basic info (name, slug, created date)
  - Current plan and expiration
  - Feature flags enabled
  - Usage statistics (users, constituents, gifts, storage)
- **Users Tab**
  - List of all users in organization
  - Role distribution
  - Last login dates
  - Actions: Reset password, disable user
- **Settings Tab**
  - Edit organization name
  - Change plan/tier
  - Set plan expiration date
  - Toggle feature flags
  - Configure usage limits
- **Activity Tab**
  - Recent audit logs for this organization
  - Upload history
  - AI usage (briefs generated, queries made)

#### 1.3 Organization Actions
- **Create Organization**
  - Required: Name, slug (auto-generated from name, editable)
  - Optional: Plan, initial admin email
  - Auto-creates first admin user if email provided
- **Suspend Organization**
  - Blocks all user logins
  - Preserves data
  - Sends notification email to org admins
- **Reactivate Organization**
  - Restores login access
  - Sends notification email
- **Delete Organization**
  - Requires confirmation (type org name)
  - Soft delete with 30-day retention
  - Hard delete after retention period

### 2. User Management

#### 2.1 Global User List
- All users across all organizations
- Columns: Name, Email, Organization, Role, Last Login, Status
- Filters: Organization, Role, Status, Login recency
- Search: By name or email

#### 2.2 User Detail View
- Profile information
- Organization membership
- Role and permissions
- Login history
- Actions performed (from audit log)

#### 2.3 User Actions
- **Reset Password** — Sends password reset email
- **Disable User** — Blocks login without deleting
- **Enable User** — Restores login access
- **Change Role** — Modify user's role within their organization
- **Impersonate User** — Login as this user for debugging (creates audit log entry)

### 3. Platform Analytics Dashboard

#### 3.1 Overview Metrics
- Total organizations (by plan type)
- Total users (active in last 30 days)
- Total constituents across platform
- Total gifts tracked
- AI usage (briefs, queries, tokens consumed)

#### 3.2 Growth Charts
- New organizations over time
- User signups over time
- Data growth (constituents, gifts)

#### 3.3 Engagement Metrics
- Daily/Weekly/Monthly active users
- Feature usage breakdown
- Most active organizations

#### 3.4 System Health
- API response times
- Error rates
- Upload processing queue status
- AI service availability

### 4. Audit & Compliance

#### 4.1 Global Audit Log
- All actions across all organizations
- Filters: Organization, User, Action type, Date range
- Search: By resource ID or user email
- Export: CSV download for compliance

#### 4.2 Super Admin Audit Log
- All actions taken by super admins
- Impersonation sessions
- Organization modifications
- User management actions

### 5. Feature Flags & Configuration

#### 5.1 Feature Flag Management
- Define available feature flags
- Set default state (enabled/disabled)
- Override per organization
- Feature flag usage analytics

#### 5.2 Global Configuration
- Default plan settings
- Email templates
- System-wide limits
- API rate limits

---

## Data Model Changes

### New Models

```prisma
// Platform-level administrator (separate from tenant users)
model SuperAdmin {
  id            String          @id @default(uuid()) @db.Uuid
  email         String          @unique @db.VarChar(255)
  passwordHash  String          @db.VarChar(255)
  name          String          @db.VarChar(255)
  role          SuperAdminRole  @default(support)
  isActive      Boolean         @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  // Relations
  auditLogs     SuperAdminAuditLog[]

  @@index([email])
}

enum SuperAdminRole {
  super_admin    // Full access
  support        // Read-only + limited actions
}

// Audit log specifically for super admin actions
model SuperAdminAuditLog {
  id              BigInt    @id @default(autoincrement())
  superAdminId    String    @db.Uuid
  action          String    @db.VarChar(100)
  targetType      String    @db.VarChar(50)  // 'organization', 'user', 'feature_flag'
  targetId        String?   @db.VarChar(100)
  organizationId  String?   @db.Uuid         // If action was on/within an org
  details         Json?
  ipAddress       String?   @db.VarChar(45)
  userAgent       String?   @db.Text
  createdAt       DateTime  @default(now())

  // Relations
  superAdmin      SuperAdmin @relation(fields: [superAdminId], references: [id])

  @@index([superAdminId])
  @@index([organizationId])
  @@index([action])
  @@index([createdAt])
}

// Track impersonation sessions
model ImpersonationSession {
  id              String    @id @default(uuid()) @db.Uuid
  superAdminId    String    @db.Uuid
  userId          String    @db.Uuid
  organizationId  String    @db.Uuid
  reason          String?   @db.Text
  startedAt       DateTime  @default(now())
  endedAt         DateTime?

  @@index([superAdminId])
  @@index([userId])
}

// Feature flag definitions
model FeatureFlag {
  id              String    @id @default(uuid()) @db.Uuid
  key             String    @unique @db.VarChar(100)
  name            String    @db.VarChar(255)
  description     String?   @db.Text
  defaultEnabled  Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  overrides       FeatureFlagOverride[]

  @@index([key])
}

// Per-organization feature flag overrides
model FeatureFlagOverride {
  id              String    @id @default(uuid()) @db.Uuid
  featureFlagId   String    @db.Uuid
  organizationId  String    @db.Uuid
  enabled         Boolean
  createdAt       DateTime  @default(now())

  // Relations
  featureFlag     FeatureFlag @relation(fields: [featureFlagId], references: [id], onDelete: Cascade)

  @@unique([featureFlagId, organizationId])
  @@index([organizationId])
}
```

### Modifications to Existing Models

```prisma
model Organization {
  // ... existing fields ...

  // Add these fields
  status          OrgStatus   @default(active)
  suspendedAt     DateTime?
  suspendedReason String?     @db.Text
  deletedAt       DateTime?   // Soft delete
  usageLimits     Json        @default("{}")  // { maxUsers: 50, maxConstituents: 10000, etc. }

  // Relations
  featureFlagOverrides FeatureFlagOverride[]
}

enum OrgStatus {
  active
  suspended
  pending_deletion
}

model User {
  // ... existing fields ...

  // Add these fields
  isDisabled      Boolean     @default(false)
  disabledAt      DateTime?
  disabledReason  String?     @db.Text
}
```

---

## API Design

### New tRPC Router: `superAdmin`

Located at `src/server/routers/superAdmin/`

```
superAdmin/
├── index.ts           # Router composition
├── auth.ts            # Super admin authentication
├── organizations.ts   # Organization CRUD
├── users.ts           # Cross-org user management
├── analytics.ts       # Platform metrics
├── audit.ts           # Audit log access
├── featureFlags.ts    # Feature flag management
└── impersonation.ts   # User impersonation
```

### Key Procedures

#### Authentication
- `superAdmin.auth.login` — Super admin login (separate from regular auth)
- `superAdmin.auth.logout` — End session
- `superAdmin.auth.me` — Get current super admin

#### Organizations
- `superAdmin.organizations.list` — Paginated list with filters
- `superAdmin.organizations.get` — Single org details with stats
- `superAdmin.organizations.create` — Create new organization
- `superAdmin.organizations.update` — Update org settings
- `superAdmin.organizations.suspend` — Suspend organization
- `superAdmin.organizations.reactivate` — Reactivate organization
- `superAdmin.organizations.delete` — Soft delete organization
- `superAdmin.organizations.hardDelete` — Permanent deletion (admin only)

#### Users
- `superAdmin.users.list` — All users, paginated
- `superAdmin.users.get` — User details with activity
- `superAdmin.users.disable` — Disable user login
- `superAdmin.users.enable` — Enable user login
- `superAdmin.users.resetPassword` — Trigger password reset
- `superAdmin.users.changeRole` — Modify user role

#### Impersonation
- `superAdmin.impersonation.start` — Begin impersonation session
- `superAdmin.impersonation.end` — End impersonation session
- `superAdmin.impersonation.list` — View impersonation history

#### Analytics
- `superAdmin.analytics.overview` — Platform summary metrics
- `superAdmin.analytics.growth` — Time-series growth data
- `superAdmin.analytics.engagement` — Usage metrics
- `superAdmin.analytics.health` — System health status

#### Audit
- `superAdmin.audit.list` — Global audit log
- `superAdmin.audit.superAdminLogs` — Super admin action log
- `superAdmin.audit.export` — CSV export

#### Feature Flags
- `superAdmin.featureFlags.list` — All flags with override counts
- `superAdmin.featureFlags.create` — Define new flag
- `superAdmin.featureFlags.update` — Modify flag
- `superAdmin.featureFlags.setOverride` — Set org-specific override
- `superAdmin.featureFlags.removeOverride` — Remove override

---

## UI/UX Design

### Route Structure

```
/admin/                     # Dashboard overview
/admin/organizations        # Organization list
/admin/organizations/new    # Create organization
/admin/organizations/[id]   # Organization detail
/admin/users                # Global user list
/admin/users/[id]           # User detail
/admin/analytics            # Platform analytics
/admin/audit                # Audit log viewer
/admin/feature-flags        # Feature flag management
/admin/settings             # Global configuration
/admin/super-admins         # Manage super admin accounts (super_admin role only)
```

### Navigation

Sidebar navigation with sections:
1. **Dashboard** — Overview metrics
2. **Organizations** — Customer management
3. **Users** — User management
4. **Analytics** — Charts and metrics
5. **Audit Log** — Activity tracking
6. **Feature Flags** — Flag management
7. **Settings** — Configuration

### Key UI Components

- **DataTable** — Reusable paginated table with filters/search
- **MetricCard** — Display single metric with trend
- **StatusBadge** — Visual status indicators (active/suspended/trial)
- **ConfirmDialog** — Destructive action confirmation
- **ImpersonationBanner** — Warning banner when impersonating

### Impersonation UX

When impersonating a user:
1. Red banner at top of screen: "You are impersonating [User Name] ([Org Name]). [End Session]"
2. All actions are logged with impersonation context
3. Clicking "End Session" returns to admin dashboard
4. Auto-end after 1 hour of inactivity

---

## Security Considerations

### Authentication

1. **Separate Auth Flow** — Super admins use `/admin/login`, completely separate from customer auth
2. **MFA Required** — All super admin accounts must have 2FA enabled (future enhancement)
3. **IP Allowlisting** — Optional restriction to specific IP ranges
4. **Session Duration** — 8-hour maximum session, re-auth required

### Authorization

1. **Role-Based Access**
   - `super_admin`: Full access to all operations
   - `support`: Read-only access, can trigger password resets, cannot impersonate or delete

2. **Impersonation Controls**
   - Requires `super_admin` role
   - Must provide reason (logged)
   - Creates audit trail
   - Cannot impersonate other super admins
   - Session recorded with start/end times

### Data Protection

1. **Audit Everything** — All super admin actions logged with IP, user agent, timestamp
2. **No Direct DB Access** — All operations through API (auditable)
3. **Soft Deletes** — Organizations are soft-deleted with retention period
4. **Sensitive Data Masking** — Password hashes never exposed, PII masked in logs

### Network Security

1. **Separate Subdomain** — Admin dashboard at `admin.givemetry.com` (or `/admin` path with strict middleware)
2. **Rate Limiting** — Aggressive rate limits on admin endpoints
3. **CORS Restrictions** — Admin API only accepts requests from admin domain

---

## Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] SuperAdmin model and authentication
- [ ] Organization list/detail views
- [ ] Basic organization CRUD (create, update, suspend)
- [ ] Super admin audit logging
- [ ] Basic dashboard metrics

### Phase 2: User Management
- [ ] Global user list
- [ ] User disable/enable
- [ ] Password reset trigger
- [ ] Role management
- [ ] Impersonation (super_admin only)

### Phase 3: Analytics & Monitoring
- [ ] Platform overview dashboard
- [ ] Growth charts
- [ ] Engagement metrics
- [ ] System health monitoring

### Phase 4: Advanced Features
- [ ] Feature flag management
- [ ] Usage limits enforcement
- [ ] Audit log export
- [ ] Global configuration UI

### Phase 5: Polish & Security
- [ ] MFA for super admins
- [ ] IP allowlisting
- [ ] Advanced search/filters
- [ ] Bulk operations

---

## Success Metrics

### Operational Efficiency
- Time to onboard new organization: < 5 minutes
- Time to investigate support issue: < 10 minutes
- Time to suspend problematic account: < 1 minute

### Platform Health
- 100% audit coverage of admin actions
- Zero unauthorized data access
- < 1% error rate on admin operations

### Adoption
- All customer onboarding done through admin dashboard (no direct DB)
- All support investigations use admin tools (no direct DB queries)

---

## Open Questions

1. **Billing Integration** — Should this phase include Stripe integration for plan management, or handle billing manually initially?

2. **Multi-Region** — Any considerations for data residency if organizations are in different regions?

3. **API Access** — Should we expose admin APIs for automation/scripting, or UI-only initially?

4. **Notification Preferences** — How should super admins be notified of critical events (Slack, email, in-app)?

5. **Support Handoff** — Should we build ticket/case management, or integrate with external helpdesk (Zendesk, Intercom)?

---

## Appendix

### Existing Schema Reference

The current `Organization` model already has these fields that support admin functionality:
- `plan` — Current subscription tier
- `planExpiresAt` — Trial/subscription expiration
- `settings` — JSON for org-specific configuration
- `features` — JSON for feature flags (to be migrated to FeatureFlagOverride)

The current `User` model has:
- `role` — Tenant-level role (admin, manager, gift_officer, viewer)
- `lastLoginAt` — For activity tracking

The `AuditLog` model already captures tenant-level actions and can be queried by super admins.

### Related Documentation
- [Data Model Specification](../data-model.md)
- [Authentication Architecture](../auth.md)
- [API Design Guidelines](../api-design.md)
