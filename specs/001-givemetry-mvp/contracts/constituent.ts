/**
 * Constituent Router Contract
 * GiveMetry MVP (Phase 1)
 *
 * Handles constituent (donor/prospect) data operations.
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const constituentType = z.enum([
  'alumni',
  'parent',
  'friend',
  'corporation',
  'foundation',
  'other',
]);

export const portfolioTier = z.enum([
  'principal',
  'major',
  'leadership',
  'annual',
  'unassigned',
]);

export const riskLevel = z.enum(['high', 'medium', 'low']);

export const sortField = z.enum([
  'lastName',
  'priorityScore',
  'lapseRiskScore',
  'totalGiving',
  'lastGiftDate',
  'lastContactDate',
  'createdAt',
]);

// ============================================
// Input Schemas
// ============================================

export const getConstituentInput = z.object({
  id: z.string().uuid(),
});

export const listConstituentsInput = z.object({
  // Pagination
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),

  // Filters
  search: z.string().max(255).optional(),
  assignedOfficerId: z.string().uuid().optional(),
  portfolioTier: portfolioTier.optional(),
  constituentType: constituentType.optional(),
  lapseRiskLevel: riskLevel.optional(),
  minPriorityScore: z.number().min(0).max(1).optional(),
  minCapacity: z.number().positive().optional(),
  hasEmail: z.boolean().optional(),
  lastGiftAfter: z.string().datetime().optional(),
  lastContactBefore: z.string().datetime().optional(),

  // Sorting
  sortBy: sortField.default('priorityScore'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});

export const updateConstituentInput = z.object({
  id: z.string().uuid(),
  assignedOfficerId: z.string().uuid().nullable().optional(),
  portfolioTier: portfolioTier.optional(),
  notes: z.string().max(5000).optional(),
});

export const bulkAssignInput = z.object({
  constituentIds: z.array(z.string().uuid()).min(1).max(100),
  assignedOfficerId: z.string().uuid().nullable(),
  portfolioTier: portfolioTier.optional(),
});

// ============================================
// Output Schemas
// ============================================

export const predictionFactorOutput = z.object({
  name: z.string(),
  value: z.string(),
  impact: z.enum(['high', 'medium', 'low']),
  weight: z.number().optional(),
});

export const constituentSummaryOutput = z.object({
  id: z.string().uuid(),
  externalId: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  constituentType: z.string().nullable(),
  classYear: z.number().int().nullable(),
  assignedOfficerId: z.string().nullable(),
  assignedOfficerName: z.string().nullable(),
  portfolioTier: z.string().nullable(),
  estimatedCapacity: z.number().nullable(),

  // Computed scores
  priorityScore: z.number().nullable(),
  lapseRiskScore: z.number().nullable(),
  lapseRiskLevel: riskLevel.nullable(),

  // Aggregates
  totalGiving: z.number(),
  giftCount: z.number().int(),
  lastGiftDate: z.string().datetime().nullable(),
  lastGiftAmount: z.number().nullable(),
  lastContactDate: z.string().datetime().nullable(),
});

export const constituentDetailOutput = z.object({
  // Base info
  id: z.string().uuid(),
  externalId: z.string(),
  externalSource: z.string().nullable(),

  // Demographics
  prefix: z.string().nullable(),
  firstName: z.string().nullable(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  suffix: z.string().nullable(),
  displayName: z.string(),

  // Contact
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.object({
    line1: z.string().nullable(),
    line2: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postalCode: z.string().nullable(),
    country: z.string().nullable(),
  }),

  // Affiliation
  constituentType: z.string().nullable(),
  classYear: z.number().int().nullable(),
  schoolCollege: z.string().nullable(),

  // Wealth
  estimatedCapacity: z.number().nullable(),
  capacitySource: z.string().nullable(),
  capacityUpdatedAt: z.string().datetime().nullable(),

  // Assignment
  assignedOfficerId: z.string().nullable(),
  assignedOfficerName: z.string().nullable(),
  portfolioTier: z.string().nullable(),

  // Scores with explanations
  priorityScore: z.number().nullable(),
  priorityFactors: z.array(predictionFactorOutput).nullable(),
  lapseRiskScore: z.number().nullable(),
  lapseRiskLevel: riskLevel.nullable(),
  lapseRiskFactors: z.array(predictionFactorOutput).nullable(),
  engagementScore: z.number().nullable(),
  dataQualityScore: z.number().nullable(),

  // Giving summary
  giving: z.object({
    totalLifetime: z.number(),
    totalThisYear: z.number(),
    totalLastYear: z.number(),
    giftCount: z.number().int(),
    avgGiftAmount: z.number(),
    largestGift: z.number(),
    firstGiftDate: z.string().datetime().nullable(),
    lastGiftDate: z.string().datetime().nullable(),
    lastGiftAmount: z.number().nullable(),
    consecutiveYears: z.number().int(),
  }),

  // Contact summary
  contacts: z.object({
    totalCount: z.number().int(),
    lastContactDate: z.string().datetime().nullable(),
    lastContactType: z.string().nullable(),
    contactsThisYear: z.number().int(),
  }),

  // Recent activity
  recentGifts: z.array(z.object({
    id: z.string().uuid(),
    amount: z.number(),
    giftDate: z.string().datetime(),
    giftType: z.string().nullable(),
    fundName: z.string().nullable(),
  })).max(5),

  recentContacts: z.array(z.object({
    id: z.string().uuid(),
    contactDate: z.string().datetime(),
    contactType: z.string(),
    subject: z.string().nullable(),
    outcome: z.string().nullable(),
  })).max(5),

  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const constituentListOutput = z.object({
  constituents: z.array(constituentSummaryOutput),
  nextCursor: z.string().uuid().nullable(),
  totalCount: z.number().int(),
});

export const bulkAssignOutput = z.object({
  success: z.boolean(),
  updatedCount: z.number().int(),
  message: z.string(),
});

// ============================================
// Router Definition (tRPC-style)
// ============================================

/**
 * constituent.get
 * - Returns full constituent detail with scores and history
 *
 * Middleware: Protected (requires auth)
 * Permissions: gift_officer (own portfolio), manager/admin (all)
 */
export type GetConstituentProcedure = {
  input: z.infer<typeof getConstituentInput>;
  output: z.infer<typeof constituentDetailOutput>;
};

/**
 * constituent.list
 * - Lists constituents with filtering and pagination
 * - Gift officers only see their assigned portfolio
 *
 * Middleware: Protected (requires auth)
 */
export type ListConstituentsProcedure = {
  input: z.infer<typeof listConstituentsInput>;
  output: z.infer<typeof constituentListOutput>;
};

/**
 * constituent.update
 * - Updates assignment and notes
 *
 * Middleware: Protected (requires auth)
 * Permissions: manager, admin
 */
export type UpdateConstituentProcedure = {
  input: z.infer<typeof updateConstituentInput>;
  output: z.infer<typeof constituentDetailOutput>;
};

/**
 * constituent.bulkAssign
 * - Bulk assign constituents to officer/tier
 *
 * Middleware: Protected (requires auth)
 * Permissions: manager, admin
 */
export type BulkAssignProcedure = {
  input: z.infer<typeof bulkAssignInput>;
  output: z.infer<typeof bulkAssignOutput>;
};
