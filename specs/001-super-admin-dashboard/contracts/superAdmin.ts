/**
 * Super Admin tRPC Router Contracts
 *
 * Feature: 001-super-admin-dashboard
 * Date: 2026-01-27
 *
 * This file defines the tRPC router structure, procedure signatures,
 * and Zod schemas for the Super Admin Dashboard API.
 */

import { z } from 'zod';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const SuperAdminRole = z.enum(['super_admin', 'support']);
export const OrgStatus = z.enum(['active', 'suspended', 'pending_deletion']);
export const TenantRole = z.enum(['admin', 'manager', 'gift_officer', 'viewer']);

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

export const PaginationInput = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const DateRangeInput = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

export const SortInput = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// AUTH ROUTER: superAdmin.auth
// ============================================================================

export const AuthRouter = {
  /**
   * Login as super admin
   * POST /api/admin/trpc/superAdmin.auth.login
   */
  login: {
    input: z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }),
    output: z.object({
      success: z.boolean(),
      superAdmin: z.object({
        id: z.string().uuid(),
        email: z.string(),
        name: z.string(),
        role: SuperAdminRole,
      }).optional(),
      error: z.string().optional(),
    }),
  },

  /**
   * Logout current super admin
   * POST /api/admin/trpc/superAdmin.auth.logout
   */
  logout: {
    input: z.void(),
    output: z.object({ success: z.boolean() }),
  },

  /**
   * Get current super admin session
   * GET /api/admin/trpc/superAdmin.auth.me
   */
  me: {
    input: z.void(),
    output: z.object({
      id: z.string().uuid(),
      email: z.string(),
      name: z.string(),
      role: SuperAdminRole,
      lastLoginAt: z.date().nullable(),
    }).nullable(),
  },
};

// ============================================================================
// ORGANIZATIONS ROUTER: superAdmin.organizations
// ============================================================================

export const OrganizationListInput = PaginationInput.extend({
  search: z.string().optional(),
  status: OrgStatus.optional(),
  plan: z.string().optional(),
  sort: SortInput.optional(),
});

export const OrganizationOutput = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  plan: z.string().nullable(),
  planExpiresAt: z.date().nullable(),
  status: OrgStatus,
  usersCount: z.number(),
  constituentsCount: z.number(),
  lastActivityAt: z.date().nullable(),
  createdAt: z.date(),
  suspendedAt: z.date().nullable(),
  suspendedReason: z.string().nullable(),
  deletedAt: z.date().nullable(),
});

export const OrganizationsRouter = {
  /**
   * List all organizations with pagination and filters
   * GET /api/admin/trpc/superAdmin.organizations.list
   */
  list: {
    input: OrganizationListInput,
    output: z.object({
      items: z.array(OrganizationOutput),
      nextCursor: z.string().uuid().optional(),
      totalCount: z.number(),
    }),
  },

  /**
   * Get single organization with full details
   * GET /api/admin/trpc/superAdmin.organizations.get
   */
  get: {
    input: z.object({ id: z.string().uuid() }),
    output: OrganizationOutput.extend({
      settings: z.record(z.unknown()),
      usageLimits: z.record(z.number()),
      features: z.record(z.boolean()),
      users: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string(),
        role: TenantRole,
        lastLoginAt: z.date().nullable(),
        isDisabled: z.boolean(),
      })),
      recentActivity: z.array(z.object({
        id: z.string(),
        action: z.string(),
        userId: z.string().uuid().nullable(),
        userName: z.string().nullable(),
        createdAt: z.date(),
      })),
    }),
  },

  /**
   * Create new organization
   * POST /api/admin/trpc/superAdmin.organizations.create
   * Requires: super_admin or support role
   */
  create: {
    input: z.object({
      name: z.string().min(1).max(255),
      slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
      plan: z.string().optional(),
      initialAdminEmail: z.string().email().optional(),
    }),
    output: OrganizationOutput,
  },

  /**
   * Update organization settings
   * POST /api/admin/trpc/superAdmin.organizations.update
   * Requires: super_admin or support role
   */
  update: {
    input: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      plan: z.string().optional(),
      planExpiresAt: z.date().optional(),
      usageLimits: z.record(z.number()).optional(),
    }),
    output: OrganizationOutput,
  },

  /**
   * Suspend organization (blocks all user logins)
   * POST /api/admin/trpc/superAdmin.organizations.suspend
   * Requires: super_admin or support role
   */
  suspend: {
    input: z.object({
      id: z.string().uuid(),
      reason: z.string().min(1).max(1000),
    }),
    output: OrganizationOutput,
  },

  /**
   * Reactivate suspended organization
   * POST /api/admin/trpc/superAdmin.organizations.reactivate
   * Requires: super_admin or support role
   */
  reactivate: {
    input: z.object({ id: z.string().uuid() }),
    output: OrganizationOutput,
  },

  /**
   * Soft delete organization (30-day retention)
   * POST /api/admin/trpc/superAdmin.organizations.delete
   * Requires: super_admin role only
   */
  delete: {
    input: z.object({
      id: z.string().uuid(),
      confirmName: z.string(), // Must match org name
    }),
    output: z.object({ success: z.boolean() }),
  },

  /**
   * Hard delete organization (bypasses retention)
   * POST /api/admin/trpc/superAdmin.organizations.hardDelete
   * Requires: super_admin role only
   */
  hardDelete: {
    input: z.object({
      id: z.string().uuid(),
      confirmName: z.string(),
    }),
    output: z.object({ success: z.boolean() }),
  },
};

// ============================================================================
// USERS ROUTER: superAdmin.users
// ============================================================================

export const UserListInput = PaginationInput.extend({
  search: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  role: TenantRole.optional(),
  status: z.enum(['active', 'disabled']).optional(),
  lastLoginDays: z.number().int().optional(), // Users who logged in within N days
  sort: SortInput.optional(),
});

export const UserOutput = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  organizationId: z.string().uuid(),
  organizationName: z.string(),
  role: TenantRole,
  lastLoginAt: z.date().nullable(),
  isDisabled: z.boolean(),
  disabledAt: z.date().nullable(),
  disabledReason: z.string().nullable(),
  createdAt: z.date(),
});

export const UsersRouter = {
  /**
   * List all users across organizations
   * GET /api/admin/trpc/superAdmin.users.list
   */
  list: {
    input: UserListInput,
    output: z.object({
      items: z.array(UserOutput),
      nextCursor: z.string().uuid().optional(),
      totalCount: z.number(),
    }),
  },

  /**
   * Get single user with activity history
   * GET /api/admin/trpc/superAdmin.users.get
   */
  get: {
    input: z.object({ id: z.string().uuid() }),
    output: UserOutput.extend({
      recentActions: z.array(z.object({
        id: z.string(),
        action: z.string(),
        resourceType: z.string().nullable(),
        createdAt: z.date(),
      })),
      loginHistory: z.array(z.object({
        timestamp: z.date(),
        ipAddress: z.string().nullable(),
        userAgent: z.string().nullable(),
      })),
    }),
  },

  /**
   * Disable user account
   * POST /api/admin/trpc/superAdmin.users.disable
   */
  disable: {
    input: z.object({
      id: z.string().uuid(),
      reason: z.string().min(1).max(1000),
    }),
    output: UserOutput,
  },

  /**
   * Enable previously disabled user
   * POST /api/admin/trpc/superAdmin.users.enable
   */
  enable: {
    input: z.object({ id: z.string().uuid() }),
    output: UserOutput,
  },

  /**
   * Trigger password reset email
   * POST /api/admin/trpc/superAdmin.users.resetPassword
   */
  resetPassword: {
    input: z.object({ id: z.string().uuid() }),
    output: z.object({ success: z.boolean() }),
  },

  /**
   * Change user's role within their organization
   * POST /api/admin/trpc/superAdmin.users.changeRole
   * Requires: super_admin role only
   */
  changeRole: {
    input: z.object({
      id: z.string().uuid(),
      role: TenantRole,
    }),
    output: UserOutput,
  },
};

// ============================================================================
// IMPERSONATION ROUTER: superAdmin.impersonation
// ============================================================================

export const ImpersonationRouter = {
  /**
   * Start impersonation session
   * POST /api/admin/trpc/superAdmin.impersonation.start
   * Requires: super_admin role only
   */
  start: {
    input: z.object({
      userId: z.string().uuid(),
      reason: z.string().min(1).max(1000),
    }),
    output: z.object({
      sessionId: z.string().uuid(),
      targetUser: z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string(),
        organizationName: z.string(),
      }),
      expiresAt: z.date(),
    }),
  },

  /**
   * End current impersonation session
   * POST /api/admin/trpc/superAdmin.impersonation.end
   */
  end: {
    input: z.void(),
    output: z.object({ success: z.boolean() }),
  },

  /**
   * Get current impersonation status
   * GET /api/admin/trpc/superAdmin.impersonation.current
   */
  current: {
    input: z.void(),
    output: z.object({
      isImpersonating: z.boolean(),
      session: z.object({
        id: z.string().uuid(),
        targetUserId: z.string().uuid(),
        targetUserName: z.string(),
        targetUserEmail: z.string(),
        organizationName: z.string(),
        startedAt: z.date(),
        expiresAt: z.date(),
      }).nullable(),
    }),
  },

  /**
   * List impersonation history
   * GET /api/admin/trpc/superAdmin.impersonation.list
   */
  list: {
    input: PaginationInput.extend({
      superAdminId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      organizationId: z.string().uuid().optional(),
      dateRange: DateRangeInput.optional(),
    }),
    output: z.object({
      items: z.array(z.object({
        id: z.string().uuid(),
        superAdminName: z.string(),
        targetUserName: z.string(),
        targetUserEmail: z.string(),
        organizationName: z.string(),
        reason: z.string(),
        startedAt: z.date(),
        endedAt: z.date().nullable(),
        endReason: z.string().nullable(),
      })),
      nextCursor: z.string().uuid().optional(),
    }),
  },
};

// ============================================================================
// ANALYTICS ROUTER: superAdmin.analytics
// ============================================================================

export const AnalyticsRouter = {
  /**
   * Platform overview metrics
   * GET /api/admin/trpc/superAdmin.analytics.overview
   */
  overview: {
    input: z.void(),
    output: z.object({
      totalOrganizations: z.number(),
      activeOrganizations: z.number(),
      suspendedOrganizations: z.number(),
      totalUsers: z.number(),
      activeUsersLast30Days: z.number(),
      totalConstituents: z.number(),
      totalGifts: z.number(),
      totalGiftAmount: z.number(),
      aiUsage: z.object({
        briefsGenerated: z.number(),
        queriesProcessed: z.number(),
      }),
    }),
  },

  /**
   * Growth trends over time
   * GET /api/admin/trpc/superAdmin.analytics.growth
   */
  growth: {
    input: z.object({
      period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
    }),
    output: z.object({
      organizations: z.array(z.object({
        date: z.string(),
        count: z.number(),
      })),
      users: z.array(z.object({
        date: z.string(),
        count: z.number(),
      })),
      constituents: z.array(z.object({
        date: z.string(),
        count: z.number(),
      })),
    }),
  },

  /**
   * Engagement metrics
   * GET /api/admin/trpc/superAdmin.analytics.engagement
   */
  engagement: {
    input: z.void(),
    output: z.object({
      dailyActiveUsers: z.number(),
      weeklyActiveUsers: z.number(),
      monthlyActiveUsers: z.number(),
      featureUsage: z.array(z.object({
        feature: z.string(),
        usageCount: z.number(),
        uniqueUsers: z.number(),
      })),
      topOrganizations: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        activeUsers: z.number(),
        actionsLast30Days: z.number(),
      })),
    }),
  },

  /**
   * System health status
   * GET /api/admin/trpc/superAdmin.analytics.health
   */
  health: {
    input: z.void(),
    output: z.object({
      apiResponseTimeP50: z.number(),
      apiResponseTimeP95: z.number(),
      errorRateLast24h: z.number(),
      uploadQueueDepth: z.number(),
      aiServiceStatus: z.enum(['healthy', 'degraded', 'down']),
      databaseStatus: z.enum(['healthy', 'degraded', 'down']),
    }),
  },
};

// ============================================================================
// AUDIT ROUTER: superAdmin.audit
// ============================================================================

export const AuditListInput = PaginationInput.extend({
  organizationId: z.string().uuid().optional(),
  superAdminId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  dateRange: DateRangeInput.optional(),
});

export const AuditRouter = {
  /**
   * List audit logs (tenant + super admin combined view)
   * GET /api/admin/trpc/superAdmin.audit.list
   */
  list: {
    input: AuditListInput,
    output: z.object({
      items: z.array(z.object({
        id: z.string(),
        source: z.enum(['tenant', 'super_admin']),
        action: z.string(),
        actorType: z.enum(['user', 'super_admin']),
        actorId: z.string().uuid(),
        actorName: z.string(),
        organizationId: z.string().uuid().nullable(),
        organizationName: z.string().nullable(),
        targetType: z.string().nullable(),
        targetId: z.string().nullable(),
        details: z.record(z.unknown()).nullable(),
        ipAddress: z.string().nullable(),
        createdAt: z.date(),
      })),
      nextCursor: z.string().optional(),
      totalCount: z.number(),
    }),
  },

  /**
   * List super admin-only audit logs
   * GET /api/admin/trpc/superAdmin.audit.superAdminLogs
   */
  superAdminLogs: {
    input: AuditListInput.omit({ userId: true }),
    output: z.object({
      items: z.array(z.object({
        id: z.string(),
        superAdminId: z.string().uuid(),
        superAdminName: z.string(),
        action: z.string(),
        targetType: z.string(),
        targetId: z.string().nullable(),
        organizationId: z.string().uuid().nullable(),
        organizationName: z.string().nullable(),
        details: z.record(z.unknown()).nullable(),
        ipAddress: z.string().nullable(),
        userAgent: z.string().nullable(),
        createdAt: z.date(),
      })),
      nextCursor: z.string().optional(),
    }),
  },

  /**
   * Get unique action types for filtering
   * GET /api/admin/trpc/superAdmin.audit.actionTypes
   */
  actionTypes: {
    input: z.void(),
    output: z.object({
      tenantActions: z.array(z.string()),
      superAdminActions: z.array(z.string()),
    }),
  },

  /**
   * Export audit logs to CSV
   * POST /api/admin/trpc/superAdmin.audit.export
   */
  export: {
    input: AuditListInput.extend({
      format: z.enum(['csv']).default('csv'),
    }),
    output: z.object({
      downloadUrl: z.string().url(),
      expiresAt: z.date(),
      recordCount: z.number(),
    }),
  },
};

// ============================================================================
// FEATURE FLAGS ROUTER: superAdmin.featureFlags
// ============================================================================

export const FeatureFlagsRouter = {
  /**
   * List all feature flags
   * GET /api/admin/trpc/superAdmin.featureFlags.list
   */
  list: {
    input: z.void(),
    output: z.object({
      items: z.array(z.object({
        id: z.string().uuid(),
        key: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        defaultEnabled: z.boolean(),
        overrideCount: z.number(),
        createdAt: z.date(),
        updatedAt: z.date(),
      })),
    }),
  },

  /**
   * Get feature flag with all overrides
   * GET /api/admin/trpc/superAdmin.featureFlags.get
   */
  get: {
    input: z.object({ id: z.string().uuid() }),
    output: z.object({
      id: z.string().uuid(),
      key: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      defaultEnabled: z.boolean(),
      overrides: z.array(z.object({
        id: z.string().uuid(),
        organizationId: z.string().uuid(),
        organizationName: z.string(),
        enabled: z.boolean(),
        createdAt: z.date(),
      })),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),
  },

  /**
   * Create new feature flag
   * POST /api/admin/trpc/superAdmin.featureFlags.create
   */
  create: {
    input: z.object({
      key: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/),
      name: z.string().min(1).max(255),
      description: z.string().max(1000).optional(),
      defaultEnabled: z.boolean().default(false),
    }),
    output: z.object({
      id: z.string().uuid(),
      key: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      defaultEnabled: z.boolean(),
    }),
  },

  /**
   * Update feature flag
   * POST /api/admin/trpc/superAdmin.featureFlags.update
   */
  update: {
    input: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().max(1000).optional(),
      defaultEnabled: z.boolean().optional(),
    }),
    output: z.object({
      id: z.string().uuid(),
      key: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      defaultEnabled: z.boolean(),
    }),
  },

  /**
   * Set organization-specific override
   * POST /api/admin/trpc/superAdmin.featureFlags.setOverride
   */
  setOverride: {
    input: z.object({
      featureFlagId: z.string().uuid(),
      organizationId: z.string().uuid(),
      enabled: z.boolean(),
    }),
    output: z.object({
      id: z.string().uuid(),
      featureFlagId: z.string().uuid(),
      organizationId: z.string().uuid(),
      enabled: z.boolean(),
    }),
  },

  /**
   * Remove organization-specific override
   * POST /api/admin/trpc/superAdmin.featureFlags.removeOverride
   */
  removeOverride: {
    input: z.object({
      featureFlagId: z.string().uuid(),
      organizationId: z.string().uuid(),
    }),
    output: z.object({ success: z.boolean() }),
  },
};

// ============================================================================
// ROUTER COMPOSITION
// ============================================================================

/**
 * Complete superAdmin router structure:
 *
 * superAdmin.auth.login
 * superAdmin.auth.logout
 * superAdmin.auth.me
 *
 * superAdmin.organizations.list
 * superAdmin.organizations.get
 * superAdmin.organizations.create
 * superAdmin.organizations.update
 * superAdmin.organizations.suspend
 * superAdmin.organizations.reactivate
 * superAdmin.organizations.delete
 * superAdmin.organizations.hardDelete
 *
 * superAdmin.users.list
 * superAdmin.users.get
 * superAdmin.users.disable
 * superAdmin.users.enable
 * superAdmin.users.resetPassword
 * superAdmin.users.changeRole
 *
 * superAdmin.impersonation.start
 * superAdmin.impersonation.end
 * superAdmin.impersonation.current
 * superAdmin.impersonation.list
 *
 * superAdmin.analytics.overview
 * superAdmin.analytics.growth
 * superAdmin.analytics.engagement
 * superAdmin.analytics.health
 *
 * superAdmin.audit.list
 * superAdmin.audit.superAdminLogs
 * superAdmin.audit.actionTypes
 * superAdmin.audit.export
 *
 * superAdmin.featureFlags.list
 * superAdmin.featureFlags.get
 * superAdmin.featureFlags.create
 * superAdmin.featureFlags.update
 * superAdmin.featureFlags.setOverride
 * superAdmin.featureFlags.removeOverride
 */
