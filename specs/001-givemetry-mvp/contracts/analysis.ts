/**
 * Analysis Router Contract
 * GiveMetry MVP (Phase 1)
 *
 * Handles health scores, predictions, and portfolio metrics.
 */

import { z } from 'zod';

// ============================================
// Input Schemas
// ============================================

export const getHealthScoresInput = z.object({
  // Empty - org-level, determined by session
});

export const getLapseRiskListInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
  riskLevel: z.enum(['high', 'medium', 'low']).optional(),
  assignedOfficerId: z.string().uuid().optional(),
});

export const getPriorityListInput = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  cursor: z.string().uuid().optional(),
  assignedOfficerId: z.string().uuid().optional(),
  excludeRecentContact: z.boolean().default(true),
  recentContactDays: z.number().int().default(7),
});

export const getPortfolioMetricsInput = z.object({
  officerId: z.string().uuid().optional(), // If not provided, returns all officers
});

export const markLapseAddressedInput = z.object({
  constituentId: z.string().uuid(),
  action: z.enum(['addressed', 'retained', 'dismissed']),
  notes: z.string().max(1000).optional(),
});

export const providePriorityFeedbackInput = z.object({
  constituentId: z.string().uuid(),
  feedback: z.enum(['not_now', 'already_in_conversation', 'not_interested', 'wrong_timing']),
  notes: z.string().max(1000).optional(),
});

export const refreshPrioritiesInput = z.object({
  // Empty - triggers recalculation for session user's portfolio
});

// ============================================
// Output Schemas
// ============================================

export const healthCategoryOutput = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  trend: z.enum(['up', 'down', 'stable']),
  issues: z.array(z.object({
    description: z.string(),
    count: z.number().int(),
    impact: z.enum(['high', 'medium', 'low']),
    examples: z.array(z.string()).max(3),
  })),
  recommendations: z.array(z.object({
    action: z.string(),
    impact: z.string(),
    priority: z.number().int().min(1).max(10),
  })),
});

export const healthScoresOutput = z.object({
  overallScore: z.number().min(0).max(100),
  trend: z.enum(['up', 'down', 'stable']),
  lastCalculated: z.string().datetime(),
  categories: z.object({
    completeness: healthCategoryOutput,
    freshness: healthCategoryOutput,
    consistency: healthCategoryOutput,
    coverage: healthCategoryOutput,
  }),
  summary: z.object({
    totalConstituents: z.number().int(),
    totalGifts: z.number().int(),
    totalContacts: z.number().int(),
    dataSpan: z.object({
      firstGiftDate: z.string().datetime().nullable(),
      lastGiftDate: z.string().datetime().nullable(),
      lastUploadDate: z.string().datetime().nullable(),
    }),
  }),
});

export const lapseRiskItemOutput = z.object({
  constituent: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    email: z.string().nullable(),
    assignedOfficerId: z.string().nullable(),
    assignedOfficerName: z.string().nullable(),
  }),
  riskScore: z.number(),
  riskLevel: z.enum(['high', 'medium', 'low']),
  confidence: z.number(),
  predictedLapseWindow: z.string(), // e.g., "3-6 months"
  factors: z.array(z.object({
    name: z.string(),
    value: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
  })),
  givingSummary: z.object({
    totalLifetime: z.number(),
    lastGiftDate: z.string().datetime().nullable(),
    lastGiftAmount: z.number().nullable(),
    avgAnnualGiving: z.number(),
  }),
  lastContactDate: z.string().datetime().nullable(),
  status: z.enum(['active', 'addressed', 'retained', 'dismissed']).nullable(),
});

export const lapseRiskListOutput = z.object({
  items: z.array(lapseRiskItemOutput),
  nextCursor: z.string().uuid().nullable(),
  totalCount: z.number().int(),
  summary: z.object({
    highRiskCount: z.number().int(),
    mediumRiskCount: z.number().int(),
    lowRiskCount: z.number().int(),
    totalAtRiskValue: z.number(),
  }),
});

export const priorityItemOutput = z.object({
  rank: z.number().int(),
  constituent: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    constituentType: z.string().nullable(),
    classYear: z.number().int().nullable(),
  }),
  priorityScore: z.number(),
  confidence: z.number(),
  factors: z.array(z.object({
    name: z.string(),
    value: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
  })),
  capacityIndicator: z.object({
    estimate: z.number().nullable(),
    label: z.string(), // e.g., "$250K+"
  }),
  engagement: z.object({
    lastContactDate: z.string().datetime().nullable(),
    lastGiftDate: z.string().datetime().nullable(),
    recentActivitySummary: z.string(),
  }),
  timing: z.object({
    indicator: z.string(), // e.g., "Fiscal year-end", "Campaign active"
    score: z.number(),
  }),
  recommendedAction: z.object({
    action: z.string(),
    reason: z.string(),
  }).nullable(),
});

export const priorityListOutput = z.object({
  items: z.array(priorityItemOutput),
  nextCursor: z.string().uuid().nullable(),
  totalCount: z.number().int(),
  generatedAt: z.string().datetime(),
  portfolioSummary: z.object({
    totalProspects: z.number().int(),
    totalCapacity: z.number(),
    avgPriorityScore: z.number(),
  }),
});

export const portfolioOfficerMetricsOutput = z.object({
  officer: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
  }),
  portfolio: z.object({
    totalConstituents: z.number().int(),
    totalCapacity: z.number(),
    avgPriorityScore: z.number(),
    avgLapseRisk: z.number(),
  }),
  engagement: z.object({
    contactedLast30Days: z.number().int(),
    contactedLast90Days: z.number().int(),
    noContactOver12Months: z.number().int(),
    noContactPercent: z.number(),
  }),
  distribution: z.object({
    byTier: z.record(z.string(), z.number().int()),
    byRiskLevel: z.record(z.string(), z.number().int()),
  }),
  alerts: z.array(z.object({
    type: z.enum(['overloaded', 'underutilized', 'high_risk_concentration', 'stale_portfolio']),
    message: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
  })),
});

export const portfolioMetricsOutput = z.object({
  officers: z.array(portfolioOfficerMetricsOutput),
  teamSummary: z.object({
    totalOfficers: z.number().int(),
    avgPortfolioSize: z.number(),
    totalManagedCapacity: z.number(),
    unassignedConstituents: z.number().int(),
  }),
  imbalances: z.array(z.object({
    issue: z.string(),
    affectedOfficers: z.array(z.string()),
    recommendation: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
  })),
});

export const genericSuccessOutput = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================
// Router Definition (tRPC-style)
// ============================================

/**
 * analysis.getHealthScores
 * - Returns organization data health scores
 * - Cached, recalculated on upload
 *
 * Middleware: Protected (requires auth)
 */
export type GetHealthScoresProcedure = {
  input: z.infer<typeof getHealthScoresInput>;
  output: z.infer<typeof healthScoresOutput>;
};

/**
 * analysis.getLapseRiskList
 * - Returns constituents at risk of lapsing
 * - Sorted by risk score descending
 *
 * Middleware: Protected (requires auth)
 */
export type GetLapseRiskListProcedure = {
  input: z.infer<typeof getLapseRiskListInput>;
  output: z.infer<typeof lapseRiskListOutput>;
};

/**
 * analysis.getPriorityList
 * - Returns prioritized prospects for action
 * - Gift officers see only their portfolio
 *
 * Middleware: Protected (requires auth)
 */
export type GetPriorityListProcedure = {
  input: z.infer<typeof getPriorityListInput>;
  output: z.infer<typeof priorityListOutput>;
};

/**
 * analysis.getPortfolioMetrics
 * - Returns portfolio balance metrics
 * - Identifies workload imbalances
 *
 * Middleware: Protected (requires auth)
 * Permissions: manager, admin
 */
export type GetPortfolioMetricsProcedure = {
  input: z.infer<typeof getPortfolioMetricsInput>;
  output: z.infer<typeof portfolioMetricsOutput>;
};

/**
 * analysis.markLapseAddressed
 * - Records intervention on at-risk constituent
 * - Used for model improvement
 *
 * Middleware: Protected (requires auth)
 */
export type MarkLapseAddressedProcedure = {
  input: z.infer<typeof markLapseAddressedInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

/**
 * analysis.providePriorityFeedback
 * - Records feedback on priority recommendations
 * - Adjusts future recommendations
 *
 * Middleware: Protected (requires auth)
 */
export type ProvidePriorityFeedbackProcedure = {
  input: z.infer<typeof providePriorityFeedbackInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

/**
 * analysis.refreshPriorities
 * - Recalculates priorities for user's portfolio
 * - Excludes recently contacted prospects
 *
 * Middleware: Protected (requires auth)
 */
export type RefreshPrioritiesProcedure = {
  input: z.infer<typeof refreshPrioritiesInput>;
  output: z.infer<typeof priorityListOutput>;
};
