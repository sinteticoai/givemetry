// Analysis services - barrel exports

// Health Scorer
export {
  calculateHealthScore,
  getOverallScore,
  aggregateHealthScores,
  getHealthGrade,
  getHealthDescription,
  getCategoryDescription,
  calculateTrend,
  compareScores,
  type HealthScoreInput,
  type HealthScoreResult,
} from "./health-scorer";

// Completeness
export {
  calculateCompletenessScore,
  getFieldCompleteness,
  getRequiredFieldsCompleteness,
  getOptionalFieldsCompleteness,
  analyzeCompletenessIssues,
  calculateBatchCompleteness,
  type Constituent,
  type CompletenessResult,
  type CompletenessIssue,
} from "./completeness";

// Freshness
export {
  calculateFreshnessScore,
  calculateGiftFreshness,
  calculateContactFreshness,
  calculateDataFreshness,
  analyzeDataAge,
  calculateBatchFreshness,
  type FreshnessInput,
  type FreshnessResult,
  type FreshnessIssue,
  type DataAgeAnalysis,
} from "./freshness";

// Consistency
export {
  calculateConsistencyScore,
  calculateBatchConsistency,
  validateEmail,
  validatePhone,
  validateState,
  validatePostalCode,
  validateName,
  validateAddress,
  detectDuplicates,
  type ConsistencyResult,
  type ConsistencyIssue,
} from "./consistency";

// Coverage
export {
  calculateCoverageScore,
  calculatePortfolioCoverage,
  calculateContactCoverage,
  calculateGiftCoverage,
  analyzePortfolioBalance,
  calculateTierCoverage,
  type CoverageResult,
  type CoverageIssue,
} from "./coverage";

// Recommendations
export {
  generateRecommendations,
  getQuickWins,
  groupRecommendationsByType,
  estimateEffort,
  getRecommendationsSummary,
  type Recommendation,
  type HealthIssue,
} from "./recommendations";
