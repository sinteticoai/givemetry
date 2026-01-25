/**
 * AI Router Contract
 * GiveMetry MVP (Phase 1)
 *
 * Handles AI-powered features: briefs, NL queries, recommendations.
 */

import { z } from 'zod';

// ============================================
// Input Schemas
// ============================================

export const generateBriefInput = z.object({
  constituentId: z.string().uuid(),
  sections: z.array(z.enum([
    'summary',
    'givingHistory',
    'relationshipHighlights',
    'conversationStarters',
    'recommendedAsk',
  ])).optional(), // If not provided, generate all sections
});

export const getBriefInput = z.object({
  briefId: z.string().uuid(),
});

export const listBriefsInput = z.object({
  constituentId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

export const updateBriefInput = z.object({
  briefId: z.string().uuid(),
  content: z.record(z.unknown()), // Partial update to content sections
});

export const flagBriefErrorInput = z.object({
  briefId: z.string().uuid(),
  section: z.string(),
  errorDescription: z.string().max(1000),
  suggestedCorrection: z.string().max(2000).optional(),
});

export const naturalLanguageQueryInput = z.object({
  query: z.string().min(3).max(500),
  limit: z.number().int().min(1).max(100).default(50),
});

export const saveQueryInput = z.object({
  queryText: z.string().min(3).max(500),
  name: z.string().min(1).max(100),
});

export const getSavedQueriesInput = z.object({
  // Empty - returns all saved queries for user
});

export const deleteSavedQueryInput = z.object({
  queryId: z.string().uuid(),
});

export const queryFeedbackInput = z.object({
  queryId: z.string().uuid(),
  wasHelpful: z.boolean(),
  feedback: z.string().max(1000).optional(),
});

export const getRecommendationInput = z.object({
  constituentId: z.string().uuid(),
});

export const markActionCompleteInput = z.object({
  constituentId: z.string().uuid(),
  actionType: z.string(),
  notes: z.string().max(1000).optional(),
});

// ============================================
// Output Schemas
// ============================================

export const citationOutput = z.object({
  text: z.string(),
  source: z.enum(['gift', 'contact', 'profile', 'prediction']),
  sourceId: z.string(),
  date: z.string().datetime().optional(),
});

export const briefSectionOutput = z.object({
  text: z.string(),
  citations: z.array(citationOutput),
});

export const briefContentOutput = z.object({
  summary: briefSectionOutput.optional(),
  givingHistory: z.object({
    text: z.string(),
    totalLifetime: z.number(),
    recentGifts: z.array(z.object({
      amount: z.number(),
      date: z.string().datetime(),
      fund: z.string().nullable(),
    })),
    citations: z.array(citationOutput),
  }).optional(),
  relationshipHighlights: z.object({
    text: z.string(),
    keyContacts: z.array(z.object({
      date: z.string().datetime(),
      type: z.string(),
      summary: z.string(),
    })),
    citations: z.array(citationOutput),
  }).optional(),
  conversationStarters: z.object({
    items: z.array(z.string()),
    citations: z.array(citationOutput),
  }).optional(),
  recommendedAsk: z.object({
    amount: z.number(),
    purpose: z.string(),
    rationale: z.string(),
    citations: z.array(citationOutput),
  }).optional(),
});

export const briefOutput = z.object({
  id: z.string().uuid(),
  constituentId: z.string().uuid(),
  constituentName: z.string(),
  content: briefContentOutput,
  generatedAt: z.string().datetime(),
  generatedBy: z.string(),
  modelUsed: z.string().nullable(),
  cached: z.boolean(), // True if returned from cache due to AI unavailability
});

export const briefListOutput = z.object({
  briefs: z.array(z.object({
    id: z.string().uuid(),
    constituentId: z.string().uuid(),
    constituentName: z.string(),
    generatedAt: z.string().datetime(),
    generatedBy: z.string(),
  })),
  nextCursor: z.string().uuid().nullable(),
  totalCount: z.number().int(),
});

export const queryFilterOutput = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown(),
  humanReadable: z.string(),
});

export const queryResultOutput = z.object({
  success: z.boolean(),
  queryId: z.string().uuid(),
  interpretation: z.string(), // Human-readable interpretation
  filters: z.array(queryFilterOutput),
  results: z.array(z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    email: z.string().nullable(),
    totalGiving: z.number(),
    lastGiftDate: z.string().datetime().nullable(),
    lastContactDate: z.string().datetime().nullable(),
    priorityScore: z.number().nullable(),
    lapseRiskLevel: z.enum(['high', 'medium', 'low']).nullable(),
  })),
  totalCount: z.number().int(),
  message: z.string().optional(), // For errors or clarifications
  suggestions: z.array(z.string()).optional(), // Alternative queries
  missingData: z.array(z.string()).optional(), // Fields that couldn't be queried
});

export const savedQueryOutput = z.object({
  id: z.string().uuid(),
  name: z.string(),
  queryText: z.string(),
  createdAt: z.string().datetime(),
});

export const savedQueriesListOutput = z.object({
  queries: z.array(savedQueryOutput),
});

export const recommendationOutput = z.object({
  constituentId: z.string().uuid(),
  constituentName: z.string(),
  primaryAction: z.object({
    action: z.string(),
    reason: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    suggestedTiming: z.string().optional(),
  }),
  alternativeActions: z.array(z.object({
    action: z.string(),
    reason: z.string(),
  })),
  context: z.object({
    lastContact: z.string().datetime().nullable(),
    lastGift: z.string().datetime().nullable(),
    upcomingEvents: z.array(z.string()),
    affinities: z.array(z.string()),
  }),
  cached: z.boolean(),
});

export const genericSuccessOutput = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================
// Router Definition (tRPC-style)
// ============================================

/**
 * ai.generateBrief
 * - Generates AI donor brief
 * - Returns cached version if AI unavailable (with warning)
 * - Cites all facts from source data
 *
 * Performance: <10 seconds
 * Middleware: Protected (requires auth)
 * Permissions: gift_officer (own portfolio), manager/admin (all)
 */
export type GenerateBriefProcedure = {
  input: z.infer<typeof generateBriefInput>;
  output: z.infer<typeof briefOutput>;
};

/**
 * ai.getBrief
 * - Returns previously generated brief
 *
 * Middleware: Protected (requires auth)
 */
export type GetBriefProcedure = {
  input: z.infer<typeof getBriefInput>;
  output: z.infer<typeof briefOutput>;
};

/**
 * ai.listBriefs
 * - Lists briefs for constituent or user
 *
 * Middleware: Protected (requires auth)
 */
export type ListBriefsProcedure = {
  input: z.infer<typeof listBriefsInput>;
  output: z.infer<typeof briefListOutput>;
};

/**
 * ai.updateBrief
 * - Updates brief content (user customization)
 *
 * Middleware: Protected (requires auth)
 */
export type UpdateBriefProcedure = {
  input: z.infer<typeof updateBriefInput>;
  output: z.infer<typeof briefOutput>;
};

/**
 * ai.flagBriefError
 * - Reports error in generated brief
 * - Logged for model improvement
 *
 * Middleware: Protected (requires auth)
 */
export type FlagBriefErrorProcedure = {
  input: z.infer<typeof flagBriefErrorInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

/**
 * ai.query
 * - Natural language query
 * - Returns interpreted query and results
 *
 * Performance: <5 seconds
 * Middleware: Protected (requires auth)
 */
export type QueryProcedure = {
  input: z.infer<typeof naturalLanguageQueryInput>;
  output: z.infer<typeof queryResultOutput>;
};

/**
 * ai.saveQuery
 * - Saves query for reuse
 *
 * Middleware: Protected (requires auth)
 */
export type SaveQueryProcedure = {
  input: z.infer<typeof saveQueryInput>;
  output: z.infer<typeof savedQueryOutput>;
};

/**
 * ai.getSavedQueries
 * - Lists user's saved queries
 *
 * Middleware: Protected (requires auth)
 */
export type GetSavedQueriesProcedure = {
  input: z.infer<typeof getSavedQueriesInput>;
  output: z.infer<typeof savedQueriesListOutput>;
};

/**
 * ai.deleteSavedQuery
 * - Deletes saved query
 *
 * Middleware: Protected (requires auth)
 */
export type DeleteSavedQueryProcedure = {
  input: z.infer<typeof deleteSavedQueryInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

/**
 * ai.queryFeedback
 * - Records feedback on query results
 *
 * Middleware: Protected (requires auth)
 */
export type QueryFeedbackProcedure = {
  input: z.infer<typeof queryFeedbackInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

/**
 * ai.getRecommendation
 * - Gets next-best-action recommendation
 * - Returns cached if AI unavailable
 *
 * Middleware: Protected (requires auth)
 */
export type GetRecommendationProcedure = {
  input: z.infer<typeof getRecommendationInput>;
  output: z.infer<typeof recommendationOutput>;
};

/**
 * ai.markActionComplete
 * - Records completed action
 * - Triggers next recommendation generation
 *
 * Middleware: Protected (requires auth)
 */
export type MarkActionCompleteProcedure = {
  input: z.infer<typeof markActionCompleteInput>;
  output: z.infer<typeof recommendationOutput>;
};
