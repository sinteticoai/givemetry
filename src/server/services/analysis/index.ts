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

// Lapse Risk
export {
  calculateLapseRiskScore,
  calculateBatchLapseRisk,
  getLapseRiskSummary,
  getRiskLevel,
  DEFAULT_LAPSE_WEIGHTS,
  RISK_THRESHOLDS,
  type LapseRiskInput,
  type LapseRiskResult,
  type LapseRiskFactor,
  type GiftRecord,
  type ContactRecord,
} from "./lapse-risk";

// Lapse Factors
export {
  calculateRecencyScore,
  getRecencyCategory,
  calculateFrequencyScore,
  analyzeGiftFrequency,
  calculateMonetaryScore,
  estimateCapacityFromHistory,
  analyzeGiftAmounts,
  calculateContactScore,
  analyzeContactPatterns,
  type RecencyInput,
  type RecencyResult,
  type FrequencyInput,
  type FrequencyResult,
  type MonetaryInput,
  type MonetaryResult,
  type ContactInput,
  type ContactResult,
} from "./lapse-factors";

// Prediction Store
export {
  storePrediction,
  storeBatchPredictions,
  getCurrentPredictions,
  getPredictionHistory,
  getPredictionSummary,
  cleanupOldPredictions,
  type StorePredictionInput,
  type PredictionRecord,
} from "./prediction-store";

// Confidence
export {
  calculateConfidence,
  calculateBatchConfidence,
  getConfidenceStats,
  type ConfidenceInput,
  type ConfidenceResult,
  type ConfidenceFactor,
} from "./confidence";

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

// Portfolio Metrics (Phase 13 - US11)
export {
  calculatePortfolioMetrics,
  calculateOfficerMetrics,
  getPortfolioDistribution,
  calculateWorkloadScore,
  getPortfolioMetricsSummary,
  type PortfolioMetricsInput,
  type PortfolioMetricsResult,
  type OfficerPortfolio,
  type OfficerMetrics,
  type ConstituentData,
  type CapacityTier,
  type PortfolioDistribution,
} from "./portfolio-metrics";

// Portfolio Imbalance Detection (Phase 13 - US11)
export {
  detectImbalances,
  calculateImbalanceScore,
  getImbalanceType,
  generateImbalanceAlerts,
  getImbalanceSummary,
  type ImbalanceInput,
  type ImbalanceResult,
  type ImbalanceDetail,
  type ImbalanceAlert,
  type OfficerMetricsSummary,
} from "./portfolio-imbalance";

// Rebalancing Suggestions (Phase 13 - US11)
export {
  generateRebalanceSuggestions,
  formatSuggestion,
  calculateImprovementMetrics,
  type RebalanceInput,
  type RebalancePreview,
  type RebalanceSuggestion,
  type ConstituentForRebalance,
} from "./rebalancing-suggestions";
