# Tasks: Super Admin Dashboard

**Input**: Design documents from `/specs/001-super-admin-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required per constitution (TDD mandatory - Test-First Development)

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and admin dashboard structure

- [X] T001 Add environment variables for admin auth in `.env.example` (ADMIN_AUTH_SECRET, ADMIN_AUTH_URL)
- [X] T002 [P] Create admin directory structure at `src/app/admin/`
- [X] T003 [P] Create admin components directory at `src/components/admin/`
- [X] T004 [P] Create admin routers directory at `src/server/routers/superAdmin/`
- [X] T005 [P] Create admin test directories at `tests/unit/admin/` and `tests/integration/admin/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, authentication, and core infrastructure that MUST be complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

### Database Schema

- [X] T006 Add SuperAdminRole and OrgStatus enums to `prisma/schema.prisma`
- [X] T007 Add SuperAdmin model to `prisma/schema.prisma` (per data-model.md)
- [X] T008 Add SuperAdminAuditLog model to `prisma/schema.prisma`
- [X] T009 Add ImpersonationSession model to `prisma/schema.prisma`
- [X] T010 Add FeatureFlag and FeatureFlagOverride models to `prisma/schema.prisma`
- [X] T011 Modify Organization model: add status, suspendedAt, suspendedReason, deletedAt, usageLimits fields in `prisma/schema.prisma`
- [X] T012 Modify User model: add isDisabled, disabledAt, disabledReason, disabledBy fields in `prisma/schema.prisma`
- [ ] T013 Run Prisma migration: `pnpm db:migrate` (requires DATABASE_URL - run manually)
- [X] T014 Create seed script for initial super admin at `prisma/seed-admin.ts`
- [ ] T015 Run seed script to create initial super_admin account (requires DATABASE_URL - run manually)

### Admin Authentication Infrastructure

- [X] T016 [P] Create admin NextAuth config at `src/lib/auth/admin-config.ts` (separate JWT secret, 8-hour session)
- [X] T017 [P] Create admin middleware at `src/lib/auth/admin-middleware.ts` (route protection, session validation)
- [X] T018 Create admin auth API route at `src/app/api/admin/auth/[...nextauth]/route.ts`
- [X] T019 Modify main middleware at `src/middleware.ts` to handle `/admin/*` routes separately
- [X] T020 Create admin tRPC context at `src/server/trpc/admin-context.ts` (super admin session, audit logging helpers)

### Super Admin Audit Logging Service

- [X] T021 Create super admin audit service at `src/server/services/audit/super-admin-audit.ts` (logAdminAction, getAdminAuditLogs)

### Shared UI Components

- [X] T022 [P] Create StatusBadge component at `src/components/admin/shared/StatusBadge.tsx`
- [X] T023 [P] Create ConfirmDialog component at `src/components/admin/shared/ConfirmDialog.tsx`
- [X] T024 [P] Create DataTable component at `src/components/admin/shared/DataTable.tsx` (pagination, search, filters)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 3 - Super Admin Authentication (Priority: P1) MVP

**Goal**: Separate authentication system for platform administrators with login lockout and session management

**Independent Test**: Navigate to /admin/login, authenticate with valid credentials, verify 8-hour session and lockout after 5 failures

**Note**: Implementing US3 first because authentication is a prerequisite for US1 and US2

### Tests for User Story 3 (TDD - write first, ensure they FAIL)

- [X] T025 [P] [US3] Unit test for admin auth validation at `tests/unit/admin/auth.test.ts`
- [X] T026 [P] [US3] Unit test for login lockout logic at `tests/unit/admin/auth.test.ts`
- [X] T027 [P] [US3] Integration test for admin login flow at `tests/integration/admin/auth.test.ts`

### Implementation for User Story 3

- [X] T028 [US3] Implement superAdmin.auth router at `src/server/routers/superAdmin/auth.ts` (login, logout, me procedures)
- [X] T029 [US3] Implement login lockout logic in auth router (5 failures → 15 min lockout per FR-004a)
- [X] T030 [US3] Create admin login page at `src/app/admin/login/page.tsx`
- [X] T031 [US3] Create admin layout with session check at `src/app/admin/layout.tsx`
- [X] T032 [P] [US3] Create AdminHeader component at `src/components/admin/layout/AdminHeader.tsx`
- [X] T033 [P] [US3] Create AdminSidebar component at `src/components/admin/layout/AdminSidebar.tsx`
- [X] T034 [US3] Create admin dashboard overview page at `src/app/admin/page.tsx`
- [X] T035 [US3] Compose superAdmin router with auth at `src/server/routers/superAdmin/index.ts`
- [X] T036 [US3] Register superAdmin router in root app router at `src/server/routers/_app.ts`

**Checkpoint**: Super admin can log in, see dashboard, session expires after 8 hours, lockout works

---

## Phase 4: User Story 1 - View and Manage Organizations (Priority: P1)

**Goal**: View paginated list of all organizations with search, filter, sort, and detail view with tabs

**Independent Test**: Log in as super admin, navigate to Organizations, search/filter, click into org detail and view tabs

### Tests for User Story 1 (TDD - write first, ensure they FAIL)

- [X] T037 [P] [US1] Unit test for organizations router at `tests/unit/admin/organizations.test.ts`
- [X] T038 [P] [US1] Integration test for org list/detail at `tests/integration/admin/organization-crud.test.ts`

### Implementation for User Story 1

- [X] T039 [US1] Implement superAdmin.organizations.list procedure at `src/server/routers/superAdmin/organizations.ts`
- [X] T040 [US1] Implement superAdmin.organizations.get procedure at `src/server/routers/superAdmin/organizations.ts`
- [X] T041 [US1] Implement superAdmin.organizations.update procedure at `src/server/routers/superAdmin/organizations.ts`
- [X] T042 [P] [US1] Create OrganizationTable component at `src/components/admin/organizations/OrganizationTable.tsx`
- [X] T043 [P] [US1] Create OrganizationDetailTabs component at `src/components/admin/organizations/OrganizationDetailTabs.tsx`
- [X] T044 [US1] Create organizations list page at `src/app/admin/organizations/page.tsx`
- [X] T045 [US1] Create organization detail page at `src/app/admin/organizations/[id]/page.tsx`
- [X] T046 [US1] Update superAdmin router composition at `src/server/routers/superAdmin/index.ts`

**Checkpoint**: Can view org list, search/filter, view org details with tabs, update org settings

---

## Phase 5: User Story 2 - Create and Suspend Organizations (Priority: P1)

**Goal**: Create new organizations with optional initial admin, suspend/reactivate organizations

**Independent Test**: Create org with initial admin email, verify user created, suspend org, verify login blocked, reactivate

### Tests for User Story 2 (TDD - write first, ensure they FAIL)

- [X] T047 [P] [US2] Unit test for org create/suspend at `tests/unit/admin/organizations.test.ts`
- [X] T048 [P] [US2] Integration test for org lifecycle at `tests/integration/admin/organization-crud.test.ts`

### Implementation for User Story 2

- [X] T049 [US2] Implement superAdmin.organizations.create procedure at `src/server/routers/superAdmin/organizations.ts`
- [X] T050 [US2] Implement initial admin user creation logic (send invitation email) in create procedure
- [X] T051 [US2] Implement superAdmin.organizations.suspend procedure at `src/server/routers/superAdmin/organizations.ts`
- [X] T052 [US2] Implement superAdmin.organizations.reactivate procedure at `src/server/routers/superAdmin/organizations.ts`
- [X] T053 [US2] Modify tenant auth to check organization.status on login at `src/lib/auth/config.ts`
- [X] T054 [P] [US2] Create OrganizationForm component at `src/components/admin/organizations/OrganizationForm.tsx`
- [X] T055 [US2] Create new organization page at `src/app/admin/organizations/new/page.tsx`
- [X] T056 [US2] Add suspend/reactivate actions to organization detail page

**Checkpoint**: Can create orgs, suspended org users blocked, reactivation restores access

---

## Phase 6: User Story 4 - View and Manage Users Across Organizations (Priority: P2)

**Goal**: View all users across organizations, disable/enable accounts, trigger password resets, change roles

**Independent Test**: View global user list, search by email, disable user, verify login blocked, reset password

### Tests for User Story 4 (TDD - write first, ensure they FAIL)

- [X] T057 [P] [US4] Unit test for users router at `tests/unit/admin/users.test.ts`
- [X] T058 [P] [US4] Integration test for user management at `tests/integration/admin/user-management.test.ts`

### Implementation for User Story 4

- [X] T059 [US4] Implement superAdmin.users.list procedure at `src/server/routers/superAdmin/users.ts`
- [X] T060 [US4] Implement superAdmin.users.get procedure at `src/server/routers/superAdmin/users.ts`
- [X] T061 [US4] Implement superAdmin.users.disable procedure at `src/server/routers/superAdmin/users.ts`
- [X] T062 [US4] Implement superAdmin.users.enable procedure at `src/server/routers/superAdmin/users.ts`
- [X] T063 [US4] Implement superAdmin.users.resetPassword procedure at `src/server/routers/superAdmin/users.ts`
- [X] T064 [US4] Implement superAdmin.users.changeRole procedure (super_admin only) at `src/server/routers/superAdmin/users.ts`
- [X] T065 [US4] Modify tenant auth to check user.isDisabled on login at `src/lib/auth/config.ts`
- [X] T066 [P] [US4] Create UserTable component at `src/components/admin/users/UserTable.tsx`
- [X] T067 [P] [US4] Create UserDetailCard component at `src/components/admin/users/UserDetailCard.tsx`
- [X] T068 [US4] Create users list page at `src/app/admin/users/page.tsx`
- [X] T069 [US4] Create user detail page at `src/app/admin/users/[id]/page.tsx`
- [X] T070 [US4] Update superAdmin router composition at `src/server/routers/superAdmin/index.ts`

**Checkpoint**: Can view all users, disable/enable, reset passwords, change roles

---

## Phase 7: User Story 5 - Impersonate Users for Support (Priority: P2)

**Goal**: Super_admin role can impersonate tenant users with audit logging and prominent banner

**Independent Test**: Start impersonation, see banner, perform action as user, end session, verify audit log

### Tests for User Story 5 (TDD - write first, ensure they FAIL)

- [X] T071 [P] [US5] Unit test for impersonation router at `tests/unit/admin/impersonation.test.ts`
- [X] T072 [P] [US5] Integration test for impersonation flow at `tests/integration/admin/impersonation.test.ts`

### Implementation for User Story 5

- [X] T073 [US5] Implement superAdmin.impersonation.start procedure (super_admin only) at `src/server/routers/superAdmin/impersonation.ts`
- [X] T074 [US5] Implement superAdmin.impersonation.end procedure at `src/server/routers/superAdmin/impersonation.ts`
- [X] T075 [US5] Implement superAdmin.impersonation.current procedure at `src/server/routers/superAdmin/impersonation.ts`
- [X] T076 [US5] Implement superAdmin.impersonation.list procedure at `src/server/routers/superAdmin/impersonation.ts`
- [X] T077 [US5] Implement impersonation cookie management (set/clear encrypted cookie)
- [X] T078 [US5] Create ImpersonationBanner component at `src/components/admin/layout/ImpersonationBanner.tsx`
- [X] T079 [US5] Integrate ImpersonationBanner into tenant app layout at `src/app/(dashboard)/layout.tsx`
- [X] T080 [US5] Add impersonate button to user detail page (super_admin role only)
- [X] T081 [US5] Implement 1-hour impersonation timeout check in middleware
- [X] T082 [US5] Update superAdmin router composition at `src/server/routers/superAdmin/index.ts`

**Checkpoint**: Can impersonate users, see banner, actions logged with context, session ends properly

---

## Phase 8: User Story 6 - Platform Analytics Dashboard (Priority: P2)

**Goal**: Aggregated platform metrics, growth charts, engagement metrics, system health status

**Independent Test**: View analytics page, see total orgs/users/constituents, view growth charts, check health status

### Tests for User Story 6 (TDD - write first, ensure they FAIL)

- [X] T083 [P] [US6] Unit test for analytics router at `tests/unit/admin/analytics.test.ts`

### Implementation for User Story 6

- [X] T084 [US6] Implement superAdmin.analytics.overview procedure at `src/server/routers/superAdmin/analytics.ts`
- [X] T085 [US6] Implement superAdmin.analytics.growth procedure at `src/server/routers/superAdmin/analytics.ts`
- [X] T086 [US6] Implement superAdmin.analytics.engagement procedure at `src/server/routers/superAdmin/analytics.ts`
- [X] T087 [US6] Implement superAdmin.analytics.health procedure at `src/server/routers/superAdmin/analytics.ts`
- [X] T088 [P] [US6] Create MetricCard component at `src/components/admin/analytics/MetricCard.tsx`
- [X] T089 [P] [US6] Create GrowthChart component at `src/components/admin/analytics/GrowthChart.tsx`
- [X] T090 [P] [US6] Create HealthStatus component at `src/components/admin/analytics/HealthStatus.tsx`
- [X] T091 [US6] Create analytics page at `src/app/admin/analytics/page.tsx`
- [X] T092 [US6] Update superAdmin router composition at `src/server/routers/superAdmin/index.ts`

**Checkpoint**: Can view platform metrics, growth trends, engagement data, system health

---

## Phase 9: User Story 7 - Audit Log Access (Priority: P2)

**Goal**: View and filter audit logs across organizations, export to CSV

**Independent Test**: View audit logs, filter by org/action/date, view super admin audit tab, export to CSV

### Tests for User Story 7 (TDD - write first, ensure they FAIL)

- [X] T093 [P] [US7] Unit test for audit router at `tests/unit/admin/audit.test.ts`

### Implementation for User Story 7

- [X] T094 [US7] Implement superAdmin.audit.list procedure at `src/server/routers/superAdmin/audit.ts`
- [X] T095 [US7] Implement superAdmin.audit.superAdminLogs procedure at `src/server/routers/superAdmin/audit.ts`
- [X] T096 [US7] Implement superAdmin.audit.actionTypes procedure at `src/server/routers/superAdmin/audit.ts`
- [X] T097 [US7] Implement superAdmin.audit.export procedure (CSV generation) at `src/server/routers/superAdmin/audit.ts`
- [X] T098 [US7] Create audit log viewer page at `src/app/admin/audit/page.tsx` (with tabs for tenant/admin logs)
- [X] T099 [US7] Update superAdmin router composition at `src/server/routers/superAdmin/index.ts`

**Checkpoint**: Can view all audit logs, filter, see super admin actions, export to CSV

---

## Phase 10: User Story 8 - Feature Flag Management (Priority: P3)

**Goal**: Define feature flags, set defaults, create per-organization overrides

**Independent Test**: Create flag, set default, add override for org, verify org sees override state

### Tests for User Story 8 (TDD - write first, ensure they FAIL)

- [X] T100 [P] [US8] Unit test for feature flags router at `tests/unit/admin/feature-flags.test.ts`

### Implementation for User Story 8

- [X] T101 [US8] Implement superAdmin.featureFlags.list procedure at `src/server/routers/superAdmin/featureFlags.ts`
- [X] T102 [US8] Implement superAdmin.featureFlags.get procedure at `src/server/routers/superAdmin/featureFlags.ts`
- [X] T103 [US8] Implement superAdmin.featureFlags.create procedure at `src/server/routers/superAdmin/featureFlags.ts`
- [X] T104 [US8] Implement superAdmin.featureFlags.update procedure at `src/server/routers/superAdmin/featureFlags.ts`
- [X] T105 [US8] Implement superAdmin.featureFlags.setOverride procedure at `src/server/routers/superAdmin/featureFlags.ts`
- [X] T106 [US8] Implement superAdmin.featureFlags.removeOverride procedure at `src/server/routers/superAdmin/featureFlags.ts`
- [X] T107 [US8] Create helper function to check feature flag for organization at `src/lib/feature-flags.ts`
- [X] T108 [US8] Create feature flags management page at `src/app/admin/feature-flags/page.tsx`
- [X] T109 [US8] Update superAdmin router composition at `src/server/routers/superAdmin/index.ts`

**Checkpoint**: Can manage feature flags, set overrides, organizations see correct flag states

---

## Phase 11: User Story 9 - Delete Organization (Priority: P3)

**Goal**: Soft delete with 30-day retention, hard delete for super_admin role, confirmation required

**Independent Test**: Delete org (type name to confirm), verify pending_deletion status, test hard delete

### Tests for User Story 9 (TDD - write first, ensure they FAIL)

- [ ] T110 [P] [US9] Unit test for org delete at `tests/unit/admin/organizations.test.ts`

### Implementation for User Story 9

- [ ] T111 [US9] Implement superAdmin.organizations.delete procedure (soft delete) at `src/server/routers/superAdmin/organizations.ts`
- [ ] T112 [US9] Implement superAdmin.organizations.hardDelete procedure (super_admin only) at `src/server/routers/superAdmin/organizations.ts`
- [ ] T113 [US9] Add delete confirmation dialog to organization detail page
- [ ] T114 [US9] Create scheduled job for 30-day hard delete at `src/server/jobs/cleanup-deleted-orgs.ts`
- [ ] T115 [US9] Invalidate user sessions when org is deleted

**Checkpoint**: Can soft delete orgs, hard delete available for super_admin, 30-day retention works

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T116 [P] Create scheduled job for 2-year audit log retention at `src/server/jobs/cleanup-old-audit-logs.ts`
- [ ] T117 [P] Create admin settings page at `src/app/admin/settings/page.tsx`
- [ ] T118 Run all admin tests: `pnpm test tests/unit/admin && pnpm test tests/integration/admin`
- [ ] T119 Run quickstart.md validation (manual verification)
- [ ] T120 Security review: verify all admin routes protected, audit logging complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 3 (Phase 3)**: First priority - auth required for all other stories
- **User Stories 1, 2 (Phase 4, 5)**: Depend on US3 (auth) - Core org management
- **User Stories 4, 5, 6, 7 (Phase 6-9)**: Can proceed in parallel after US3
- **User Stories 8, 9 (Phase 10-11)**: Lower priority, proceed after P2 stories
- **Polish (Phase 12)**: After all desired user stories complete

### User Story Dependencies

| Story | Priority | Depends On | Can Start After |
|-------|----------|------------|-----------------|
| US3 (Auth) | P1 | Foundation | Phase 2 complete |
| US1 (View Orgs) | P1 | US3 | Phase 3 complete |
| US2 (Create/Suspend) | P1 | US3, partially US1 | Phase 3 complete |
| US4 (Users) | P2 | US3 | Phase 3 complete |
| US5 (Impersonation) | P2 | US3, US4 | Phase 6 complete |
| US6 (Analytics) | P2 | US3 | Phase 3 complete |
| US7 (Audit) | P2 | US3 | Phase 3 complete |
| US8 (Feature Flags) | P3 | US3, US1 | Phase 4 complete |
| US9 (Delete Org) | P3 | US3, US1, US2 | Phase 5 complete |

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Router procedures before UI components
3. Components before pages
4. Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (all [P] tasks):**
- T002, T003, T004, T005 can run in parallel

**Phase 2 (after T006):**
- T016, T017 can run in parallel
- T022, T023, T024 can run in parallel

**Phase 3:**
- T025, T026, T027 (tests) can run in parallel
- T032, T033 (components) can run in parallel

**Phase 4:**
- T037, T038 (tests) can run in parallel
- T042, T043 (components) can run in parallel

**After Phase 3 (US3) is complete, these can run in parallel:**
- US1 + US2 (both P1, related to orgs)
- US4 (P2, users)
- US6 (P2, analytics)
- US7 (P2, audit)

---

## Parallel Example: Foundation Phase

```bash
# After T006 (enums), launch model tasks:
T007: Add SuperAdmin model
T008: Add SuperAdminAuditLog model
T009: Add ImpersonationSession model
T010: Add FeatureFlag models
T011: Modify Organization model
T012: Modify User model

# After T015 (seed), launch auth infrastructure:
T016: Admin NextAuth config
T017: Admin middleware

# Launch shared components:
T022: StatusBadge component
T023: ConfirmDialog component
T024: DataTable component
```

---

## Implementation Strategy

### MVP First (Auth + Org View + Create)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: US3 (Super Admin Auth)
4. Complete Phase 4: US1 (View Organizations)
5. Complete Phase 5: US2 (Create/Suspend Organizations)
6. **STOP and VALIDATE**: Admin can log in, view orgs, create orgs, suspend orgs
7. Deploy/demo MVP

### Incremental Delivery After MVP

1. Add US4 (User Management) → Test → Deploy
2. Add US5 (Impersonation) → Test → Deploy
3. Add US6 (Analytics) → Test → Deploy
4. Add US7 (Audit Logs) → Test → Deploy
5. Add US8 (Feature Flags) → Test → Deploy
6. Add US9 (Delete Org) → Test → Deploy

### Recommended MVP Scope

- **Phases 1-5 (T001-T056)**: 56 tasks
- Delivers: Auth, Org List/Detail, Org Create/Suspend/Reactivate
- Satisfies: SC-001, SC-002, SC-004, SC-005, SC-006

---

## Summary

| Phase | User Story | Priority | Task Count |
|-------|------------|----------|------------|
| 1 | Setup | - | 5 |
| 2 | Foundational | - | 19 |
| 3 | US3: Auth | P1 | 12 |
| 4 | US1: View Orgs | P1 | 10 |
| 5 | US2: Create/Suspend | P1 | 10 |
| 6 | US4: Users | P2 | 14 |
| 7 | US5: Impersonation | P2 | 12 |
| 8 | US6: Analytics | P2 | 10 |
| 9 | US7: Audit | P2 | 7 |
| 10 | US8: Feature Flags | P3 | 10 |
| 11 | US9: Delete Org | P3 | 6 |
| 12 | Polish | - | 5 |
| **Total** | | | **120** |

**Parallel Opportunities**: 38 tasks marked [P]
**MVP Scope**: Phases 1-5 (56 tasks)
