# Feature Specification: Super Admin Dashboard

**Feature Branch**: `001-super-admin-dashboard`
**Created**: 2026-01-27
**Status**: Draft
**Input**: Platform-level administrative dashboard for managing organizations, users, and platform health across all tenants

## Clarifications

### Session 2026-01-27

- Q: What happens after repeated failed super admin login attempts? → A: Temporary lockout (15 min) after 5 failed attempts
- Q: How long must audit logs be retained? → A: 2 years retention (common compliance standard)
- Q: Should admin dashboard use path-based routing or separate subdomain? → A: Path-based (`/admin/*`) with strict middleware protection

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Manage Organizations (Priority: P1)

As a platform administrator, I need to view all customer organizations and their key metrics so I can monitor platform adoption and manage customer lifecycles.

**Why this priority**: Organization management is the core function of platform administration. Without visibility into organizations, no other administrative tasks are possible.

**Independent Test**: Can be fully tested by logging in as super admin, viewing the organization list, filtering/searching, and accessing organization details. Delivers immediate operational value for customer oversight.

**Acceptance Scenarios**:

1. **Given** a super admin is logged in, **When** they navigate to the Organizations page, **Then** they see a paginated list of all organizations with name, plan, status, user count, constituent count, and last activity date
2. **Given** the organization list is displayed, **When** the super admin searches by organization name, **Then** only matching organizations are shown
3. **Given** the organization list is displayed, **When** the super admin filters by status (active/suspended/trial), **Then** only organizations matching that status are shown
4. **Given** a super admin clicks on an organization, **When** the detail page loads, **Then** they see overview metrics, user list, settings, and activity tabs
5. **Given** a super admin is viewing an organization, **When** they change the organization's plan tier, **Then** the change is saved and reflected immediately

---

### User Story 2 - Create and Suspend Organizations (Priority: P1)

As a platform administrator, I need to create new customer organizations during onboarding and suspend organizations when necessary so I can manage the customer lifecycle without direct database access.

**Why this priority**: Creating organizations is essential for customer onboarding; suspension is critical for handling problematic accounts or billing issues.

**Independent Test**: Can be fully tested by creating a new organization with required fields, verifying it appears in the list, then suspending and reactivating it.

**Acceptance Scenarios**:

1. **Given** a super admin is on the organization list, **When** they click "Create Organization" and provide name and slug, **Then** a new organization is created with active status
2. **Given** a super admin is creating an organization, **When** they provide an initial admin email, **Then** an admin user is created for that organization and sent an invitation email
3. **Given** a super admin views an active organization, **When** they click "Suspend" and confirm, **Then** the organization status changes to suspended and all users in that organization are blocked from logging in
4. **Given** an organization is suspended, **When** the org admins attempt to log in, **Then** they see a message indicating their organization has been suspended
5. **Given** a super admin views a suspended organization, **When** they click "Reactivate", **Then** the organization status returns to active and users can log in again

---

### User Story 3 - Super Admin Authentication (Priority: P1)

As a platform administrator, I need a separate authentication system from regular users so that platform credentials are isolated and secured with appropriate access controls.

**Why this priority**: Authentication is a prerequisite for all other functionality. Without secure admin login, no administrative actions are possible.

**Independent Test**: Can be fully tested by navigating to admin login, authenticating with valid credentials, and verifying session management works correctly.

**Acceptance Scenarios**:

1. **Given** a visitor navigates to the admin login page, **When** they enter valid super admin credentials, **Then** they are authenticated and redirected to the admin dashboard
2. **Given** a visitor enters invalid credentials, **When** they submit the login form, **Then** they see an error message and are not authenticated
3. **Given** a super admin is logged in, **When** they remain inactive for more than 8 hours, **Then** their session expires and they must re-authenticate
4. **Given** a regular user attempts to access admin routes, **When** the request is processed, **Then** they receive an access denied response

---

### User Story 4 - View and Manage Users Across Organizations (Priority: P2)

As a platform administrator, I need to view all users across all organizations and perform user management actions so I can support customers and handle security incidents.

**Why this priority**: User management supports ongoing operations and customer support but is less critical than organization-level management.

**Independent Test**: Can be fully tested by viewing the global user list, searching for a specific user, and performing actions like password reset or disable.

**Acceptance Scenarios**:

1. **Given** a super admin navigates to the Users page, **When** the page loads, **Then** they see a paginated list of all users across all organizations with name, email, organization, role, and last login
2. **Given** the user list is displayed, **When** the super admin searches by email, **Then** only matching users are shown
3. **Given** a super admin views a user detail page, **When** they click "Reset Password", **Then** a password reset email is sent to the user
4. **Given** a super admin views an active user, **When** they click "Disable", **Then** the user can no longer log in until re-enabled
5. **Given** a super admin with super_admin role views a user, **When** they click "Change Role", **Then** they can modify the user's role within their organization

---

### User Story 5 - Impersonate Users for Support (Priority: P2)

As a platform administrator with super_admin role, I need to temporarily log in as a customer user so I can debug issues, verify configurations, and provide better support.

**Why this priority**: Impersonation significantly improves support efficiency but requires careful security controls and is not needed for basic operations.

**Independent Test**: Can be fully tested by starting an impersonation session, verifying the banner appears, performing actions as the impersonated user, and ending the session.

**Acceptance Scenarios**:

1. **Given** a super admin with super_admin role views a user, **When** they click "Impersonate" and provide a reason, **Then** they are logged in as that user in a new session
2. **Given** a super admin is impersonating a user, **When** any page loads, **Then** a prominent red warning banner is displayed showing who is being impersonated
3. **Given** a super admin is impersonating a user, **When** they perform any action, **Then** the action is logged with impersonation context
4. **Given** a super admin is impersonating a user, **When** they click "End Session" in the banner, **Then** they return to the admin dashboard
5. **Given** a support role super admin views a user, **When** they look for the impersonate option, **Then** the option is not available (support role cannot impersonate)
6. **Given** a super admin is impersonating, **When** they remain inactive for 1 hour, **Then** the impersonation session automatically ends

---

### User Story 6 - Platform Analytics Dashboard (Priority: P2)

As a platform administrator, I need to see aggregated metrics and trends across the entire platform so I can monitor business health and make informed decisions.

**Why this priority**: Analytics provide operational insights but are not required for day-to-day customer management.

**Independent Test**: Can be fully tested by viewing the analytics dashboard and verifying metrics are displayed correctly with data from multiple organizations.

**Acceptance Scenarios**:

1. **Given** a super admin navigates to Analytics, **When** the page loads, **Then** they see overview metrics including total organizations, total users, total constituents, and total gifts
2. **Given** the analytics page is displayed, **When** viewing the growth charts, **Then** they see time-series data for new organizations, user signups, and data growth
3. **Given** the analytics page is displayed, **When** viewing engagement metrics, **Then** they see daily/weekly/monthly active users and feature usage breakdown
4. **Given** the analytics page is displayed, **When** viewing system health, **Then** they see current status indicators for API performance and service availability

---

### User Story 7 - Audit Log Access (Priority: P2)

As a platform administrator, I need to view and export audit logs across all organizations so I can investigate issues, ensure compliance, and track administrative actions.

**Why this priority**: Audit logging is critical for security and compliance but can function passively while other features are prioritized.

**Independent Test**: Can be fully tested by viewing audit logs, applying filters, searching for specific events, and exporting to CSV.

**Acceptance Scenarios**:

1. **Given** a super admin navigates to Audit Log, **When** the page loads, **Then** they see a filterable list of all audit events across organizations
2. **Given** the audit log is displayed, **When** the super admin filters by organization, **Then** only events for that organization are shown
3. **Given** the audit log is displayed, **When** the super admin filters by action type, **Then** only matching events are shown
4. **Given** a super admin views the super admin audit log tab, **When** viewing the entries, **Then** they see all actions taken by super admins including impersonation sessions
5. **Given** a super admin applies filters to the audit log, **When** they click "Export CSV", **Then** a CSV file is downloaded containing the filtered audit events

---

### User Story 8 - Feature Flag Management (Priority: P3)

As a platform administrator, I need to manage feature flags and control which features are available to specific organizations so I can enable gradual rollouts and custom configurations.

**Why this priority**: Feature flags are a platform maturity feature that enhances flexibility but is not required for basic operations.

**Independent Test**: Can be fully tested by creating a feature flag, setting its default state, and overriding it for a specific organization.

**Acceptance Scenarios**:

1. **Given** a super admin navigates to Feature Flags, **When** the page loads, **Then** they see a list of all defined feature flags with their default states and override counts
2. **Given** a super admin clicks "Create Flag", **When** they provide key, name, and description, **Then** a new feature flag is created with the specified default state
3. **Given** a super admin views a feature flag, **When** they click "Add Override" for an organization, **Then** they can enable or disable the flag specifically for that organization
4. **Given** a feature flag has an override for an organization, **When** the super admin removes the override, **Then** the organization reverts to the flag's default state

---

### User Story 9 - Delete Organization (Priority: P3)

As a platform administrator with super_admin role, I need to delete customer organizations with appropriate safeguards so I can handle account closures while preventing accidental data loss.

**Why this priority**: Deletion is a rare operation that requires careful handling; most lifecycle management uses suspension instead.

**Independent Test**: Can be fully tested by initiating organization deletion, verifying confirmation requirements, and checking the soft-delete retention period behavior.

**Acceptance Scenarios**:

1. **Given** a super admin views an organization, **When** they click "Delete", **Then** they must type the organization name to confirm
2. **Given** a super admin confirms deletion, **When** the deletion is processed, **Then** the organization is soft-deleted and marked as pending_deletion
3. **Given** an organization is pending deletion, **When** 30 days pass, **Then** the organization and all associated data are permanently deleted
4. **Given** an organization is pending deletion, **When** a super_admin role user initiates hard delete, **Then** the organization is immediately permanently deleted (bypassing retention period)
5. **Given** a support role super admin views an organization, **When** they look for the delete option, **Then** the option is not available (support role cannot delete)

---

### Edge Cases

- What happens when a super admin tries to suspend an organization that has already been suspended? (Show current status, no action taken)
- What happens when an organization is deleted while users are actively logged in? (Sessions are invalidated immediately)
- What happens when impersonation session exceeds the 1-hour timeout? (Session ends automatically, audit log records the timeout)
- How does the system handle creating an organization with a slug that already exists? (Validation error shown, slug must be unique)
- What happens when a super admin disables themselves? (Action is prevented with error message)
- What happens when trying to impersonate a user in a suspended organization? (Action is allowed but the impersonated user sees suspended organization message)

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Authorization**
- **FR-001**: System MUST provide a separate authentication flow for super admins at `/admin/login`
- **FR-001a**: System MUST serve all super admin functionality under the `/admin/*` path with middleware-enforced access control
- **FR-002**: System MUST support two super admin roles: super_admin (full access) and support (read-only with limited actions)
- **FR-003**: System MUST enforce 8-hour maximum session duration for super admins
- **FR-004**: System MUST prevent regular users from accessing super admin routes
- **FR-004a**: System MUST temporarily lock super admin accounts for 15 minutes after 5 consecutive failed login attempts

**Organization Management**
- **FR-005**: System MUST display a paginated list of all organizations with search, filter, and sort capabilities
- **FR-006**: System MUST allow super admins to create new organizations with name, slug, and optional initial admin email
- **FR-007**: System MUST auto-generate a URL-safe slug from organization name (editable before creation)
- **FR-008**: System MUST allow super admins to update organization name, plan, expiration date, and usage limits
- **FR-009**: System MUST allow super admins to suspend organizations, blocking all user logins and sending notification emails
- **FR-010**: System MUST allow super admins to reactivate suspended organizations
- **FR-011**: System MUST implement soft delete with 30-day retention period for organizations
- **FR-012**: System MUST require typing organization name to confirm deletion
- **FR-013**: System MUST restrict hard delete (bypassing retention) to super_admin role only

**User Management**
- **FR-014**: System MUST display all users across all organizations in a paginated, filterable list
- **FR-015**: System MUST allow super admins to disable/enable user accounts
- **FR-016**: System MUST allow super admins to trigger password reset emails
- **FR-017**: System MUST allow super admins to change user roles within their organization
- **FR-018**: System MUST restrict impersonation to super_admin role only
- **FR-019**: System MUST require a reason when starting an impersonation session
- **FR-020**: System MUST display a prominent warning banner during impersonation sessions
- **FR-021**: System MUST automatically end impersonation sessions after 1 hour of inactivity

**Analytics**
- **FR-022**: System MUST display platform overview metrics (total orgs, users, constituents, gifts)
- **FR-023**: System MUST display growth trends over time (organizations, users, data volume)
- **FR-024**: System MUST display engagement metrics (active users, feature usage)
- **FR-025**: System MUST display system health status (API response times, error rates)

**Audit & Compliance**
- **FR-026**: System MUST log all super admin actions with IP address, user agent, and timestamp
- **FR-027**: System MUST maintain a separate audit log for super admin actions
- **FR-028**: System MUST allow filtering and searching audit logs by organization, user, action type, and date range
- **FR-029**: System MUST allow exporting filtered audit logs to CSV format
- **FR-030**: System MUST record impersonation sessions with start time, end time, target user, and reason
- **FR-030a**: System MUST retain all audit logs for a minimum of 2 years before automatic purging

**Feature Flags**
- **FR-031**: System MUST allow super admins to define feature flags with key, name, description, and default state
- **FR-032**: System MUST allow super admins to set organization-specific feature flag overrides
- **FR-033**: System MUST apply feature flag defaults when no organization override exists

### Key Entities

- **SuperAdmin**: Platform-level administrator account separate from tenant users. Has email, name, role (super_admin or support), and activity tracking. Cannot be part of any customer organization.

- **Organization (extended)**: Customer tenant with new status field (active, suspended, pending_deletion), suspension metadata, soft delete timestamp, and usage limits configuration.

- **User (extended)**: Tenant user with new disabled flag and disable metadata to support account-level blocks independent of organization status.

- **SuperAdminAuditLog**: Record of all actions performed by super admins, including target type/ID, organization context, and request metadata.

- **ImpersonationSession**: Record of super admin impersonation sessions with target user, organization, reason, and duration tracking.

- **FeatureFlag**: Platform-wide feature toggle definition with key, name, description, and default enabled state.

- **FeatureFlagOverride**: Organization-specific feature flag state that overrides the platform default.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Platform administrators can onboard a new customer organization in under 5 minutes from start to finish
- **SC-002**: Platform administrators can locate and view details for any organization or user in under 30 seconds
- **SC-003**: Support investigations (finding user activity, checking configurations) can be completed in under 10 minutes
- **SC-004**: Suspending or reactivating an organization can be completed in under 1 minute
- **SC-005**: 100% of super admin actions are captured in audit logs with full context
- **SC-006**: Zero customer onboarding operations require direct database access
- **SC-007**: Zero support investigations require direct database queries
- **SC-008**: All administrative operations maintain less than 1% error rate
- **SC-009**: Platform dashboard loads overview metrics in under 3 seconds
- **SC-010**: Impersonation sessions are 100% logged with start/end times and reason

## Assumptions

- Super admin accounts will be created manually or via seeding initially (no self-registration)
- The existing AuditLog model captures tenant-level actions and will be queryable by super admins
- Email notification for organization suspension/reactivation uses existing email service infrastructure
- MFA for super admins is deferred to a later phase
- IP allowlisting for super admin access is deferred to a later phase
- Billing integration (Stripe) is out of scope; plan changes are manual configuration
- API access for automation is out of scope; this is UI-only initially
- External helpdesk integration is out of scope; no ticket/case management built in
- Multi-region data residency considerations are deferred to a later phase

## Non-Goals

- Customer-facing self-service billing portal
- Automated provisioning APIs for external systems
- White-labeling or reseller management
- Direct database manipulation UI
- MFA for super admins (future phase)
- IP allowlisting (future phase)
- External helpdesk integration (Zendesk, Intercom, etc.)
