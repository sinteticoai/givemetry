// AI services exports
export * from "./brief-generator";
export * from "./citation-validator";
export * from "./brief-cache";
export {
  validateBriefAccuracy,
  verifyAmountAccuracy,
  verifyDateAccuracy,
  checkFactualClaims,
  type GoldenDataset,
  type AmountAccuracyResult,
  type DateAccuracyResult,
  type FactualClaimsResult,
  type ValidationResult as BriefValidationResult,
} from "./brief-validator";

// NL Query services (Phase 9, US6)
export {
  parseNaturalLanguageQuery,
  type ParsedQuery,
  type QueryFilter,
  type ParseQueryOptions,
} from "./nl-query-parser";

export {
  translateQueryToPrisma,
  translateRelativeDate,
  buildAggregationQuery,
  type PrismaWhereClause,
} from "./query-translator";

export {
  saveQuery,
  updateQueryWithName,
  getSavedQueries,
  deleteSavedQuery,
  getSavedQueryById,
  recordQueryFeedback,
  getPopularQueries,
  type SavedQuery,
  type SaveQueryInput,
  type GetSavedQueriesInput,
} from "./saved-queries";
