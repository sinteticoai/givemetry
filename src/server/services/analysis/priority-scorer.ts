// T139: Priority scoring engine
/**
 * Priority Scoring Service
 *
 * Calculates priority scores for constituents based on:
 * - Capacity: Estimated giving capacity (wealth indicators)
 * - Likelihood: Inverse of lapse risk (lower risk = higher likelihood)
 * - Timing: Fiscal year position, campaign alignment, seasonality
 * - Recency: Recent engagement (gifts and contacts)
 *
 * Formula: Priority = (C × wC) + (L × wL) + (T × wT) + (R × wR)
 */

import {
  calculateCapacityScore,
  type CapacityInput,
} from "./priority-factors/capacity";
import {
  calculateLikelihoodScore,
} from "./priority-factors/likelihood";
import {
  calculateTimingScore,
} from "./priority-factors/timing";
import {
  calculatePriorityRecencyScore,
} from "./priority-factors/recency";

// Default weights for priority factors (from research.md)
// These sum to 1.0
export const DEFAULT_PRIORITY_WEIGHTS = {
  capacity: 0.30, // Wealth indicators
  likelihood: 0.25, // Inverse lapse risk
  timing: 0.25, // Fiscal year, campaigns
  recency: 0.20, // Recent engagement
};

// Priority level thresholds
export const PRIORITY_THRESHOLDS = {
  high: 0.7,
  medium: 0.4,
};

export interface PriorityScoreInput {
  capacity: CapacityInput;
  lapseRisk: {
    score: number | null;
    confidence?: number;
  };
  timing: {
    fiscalYearEnd: Date;
    campaigns?: string[];
  };
  engagement: {
    gifts: Array<{ date: Date; amount: number }>;
    contacts: Array<{ date: Date; type: string }>;
  };
  referenceDate: Date;
  weights?: Partial<typeof DEFAULT_PRIORITY_WEIGHTS>;
}

export interface PriorityFactor {
  name: string;
  value: string;
  impact: "high" | "medium" | "low";
  weight: number;
  rawScore: number;
}

export interface RecommendedAction {
  action: string;
  reason: string;
}

export interface PriorityScoreResult {
  score: number;
  confidence: number;
  factors: PriorityFactor[];
  recommendedAction: RecommendedAction | null;
  details: {
    capacity: ReturnType<typeof calculateCapacityScore>;
    likelihood: ReturnType<typeof calculateLikelihoodScore>;
    timing: ReturnType<typeof calculateTimingScore>;
    recency: ReturnType<typeof calculatePriorityRecencyScore>;
  };
}

/**
 * Calculate priority score for a constituent
 */
export function calculatePriorityScore(input: PriorityScoreInput): PriorityScoreResult {
  const weights = { ...DEFAULT_PRIORITY_WEIGHTS, ...input.weights };

  // Calculate individual factor scores
  const capacityResult = calculateCapacityScore(input.capacity);

  const likelihoodResult = calculateLikelihoodScore({
    lapseRiskScore: input.lapseRisk.score,
    lapseRiskConfidence: input.lapseRisk.confidence,
  });

  const timingResult = calculateTimingScore({
    fiscalYearEnd: input.timing.fiscalYearEnd,
    campaigns: input.timing.campaigns,
    referenceDate: input.referenceDate,
  });

  const recencyResult = calculatePriorityRecencyScore({
    gifts: input.engagement.gifts,
    contacts: input.engagement.contacts,
    referenceDate: input.referenceDate,
  });

  // Calculate weighted composite score
  const score =
    capacityResult.score * weights.capacity +
    likelihoodResult.score * weights.likelihood +
    timingResult.score * weights.timing +
    recencyResult.score * weights.recency;

  // Ensure score is normalized
  const normalizedScore = Math.max(0, Math.min(1, score));

  // Calculate confidence based on data quality
  const confidence = calculateConfidence(input, likelihoodResult.confidence);

  // Build explainable factors
  const factors = buildFactors({
    capacity: capacityResult,
    likelihood: likelihoodResult,
    timing: timingResult,
    recency: recencyResult,
    weights,
  });

  // Generate recommended action
  const recommendedAction = generateRecommendedAction({
    score: normalizedScore,
    capacity: capacityResult,
    likelihood: likelihoodResult,
    timing: timingResult,
    recency: recencyResult,
    engagement: input.engagement,
  });

  return {
    score: normalizedScore,
    confidence,
    factors,
    recommendedAction,
    details: {
      capacity: capacityResult,
      likelihood: likelihoodResult,
      timing: timingResult,
      recency: recencyResult,
    },
  };
}

/**
 * Calculate confidence based on data quality
 */
function calculateConfidence(
  input: PriorityScoreInput,
  lapseConfidence: number
): number {
  let confidence = 0;

  // Capacity data quality
  if (input.capacity.estimatedCapacity !== null) {
    confidence += 0.25;
    if (input.capacity.source) {
      confidence += 0.1; // Bonus for known source
    }
  }

  // Lapse risk confidence
  confidence += lapseConfidence * 0.25;

  // Engagement data quality
  const giftCount = input.engagement.gifts.length;
  const contactCount = input.engagement.contacts.length;

  if (giftCount >= 5) confidence += 0.2;
  else if (giftCount >= 2) confidence += 0.15;
  else if (giftCount >= 1) confidence += 0.1;

  if (contactCount >= 3) confidence += 0.1;
  else if (contactCount >= 1) confidence += 0.05;

  // Recent data bonus
  const hasRecentGift = input.engagement.gifts.some(g => {
    const daysSince = (input.referenceDate.getTime() - g.date.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 365;
  });

  if (hasRecentGift) confidence += 0.1;

  return Math.min(1, confidence);
}

/**
 * Build explainable factors array
 */
function buildFactors(input: {
  capacity: ReturnType<typeof calculateCapacityScore>;
  likelihood: ReturnType<typeof calculateLikelihoodScore>;
  timing: ReturnType<typeof calculateTimingScore>;
  recency: ReturnType<typeof calculatePriorityRecencyScore>;
  weights: typeof DEFAULT_PRIORITY_WEIGHTS;
}): PriorityFactor[] {
  const factors: PriorityFactor[] = [];

  // Capacity factor
  factors.push({
    name: "capacity",
    value: input.capacity.description,
    impact: getImpactLevel(input.capacity.score),
    weight: input.weights.capacity,
    rawScore: input.capacity.score,
  });

  // Likelihood factor
  factors.push({
    name: "likelihood",
    value: input.likelihood.description,
    impact: getImpactLevel(input.likelihood.score),
    weight: input.weights.likelihood,
    rawScore: input.likelihood.score,
  });

  // Timing factor
  factors.push({
    name: "timing",
    value: input.timing.description,
    impact: getImpactLevel(input.timing.score),
    weight: input.weights.timing,
    rawScore: input.timing.score,
  });

  // Recency factor
  factors.push({
    name: "recency",
    value: input.recency.description,
    impact: getImpactLevel(input.recency.score),
    weight: input.weights.recency,
    rawScore: input.recency.score,
  });

  // Sort by impact (high first) then by weight
  factors.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    if (impactOrder[a.impact] !== impactOrder[b.impact]) {
      return impactOrder[a.impact] - impactOrder[b.impact];
    }
    return b.weight - a.weight;
  });

  return factors;
}

/**
 * Get impact level from score (higher score = higher impact for priority)
 */
function getImpactLevel(score: number): "high" | "medium" | "low" {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

/**
 * Generate recommended action based on priority analysis
 */
function generateRecommendedAction(input: {
  score: number;
  capacity: ReturnType<typeof calculateCapacityScore>;
  likelihood: ReturnType<typeof calculateLikelihoodScore>;
  timing: ReturnType<typeof calculateTimingScore>;
  recency: ReturnType<typeof calculatePriorityRecencyScore>;
  engagement: {
    gifts: Array<{ date: Date; amount: number }>;
    contacts: Array<{ date: Date; type: string }>;
  };
}): RecommendedAction | null {
  const { score, capacity, timing, recency, engagement } = input;

  // Only recommend actions for higher priority prospects
  if (score < 0.4) {
    return null;
  }

  // High priority with optimal timing
  if (score >= 0.7 && timing.score >= 0.6) {
    const hasRecentContact = recency.daysSinceLastContact !== null &&
      recency.daysSinceLastContact <= 30;

    if (!hasRecentContact) {
      return {
        action: "Schedule personal meeting",
        reason: `High priority prospect (${capacity.label} capacity) with optimal timing. ${timing.indicator}`,
      };
    }

    return {
      action: "Follow up on recent conversation",
      reason: "Recent contact recorded - continue cultivation momentum",
    };
  }

  // High capacity but stale engagement
  if (capacity.score >= 0.7 && recency.score < 0.4) {
    return {
      action: "Re-engage with personal outreach",
      reason: `${capacity.label} capacity donor with stale engagement - ${recency.recentActivitySummary}`,
    };
  }

  // Active campaign and no recent contact
  if (timing.indicator.includes("Campaign") &&
    (recency.daysSinceLastContact === null || recency.daysSinceLastContact > 60)) {
    return {
      action: "Reach out about active campaign",
      reason: `${timing.indicator} - opportunity for campaign-aligned solicitation`,
    };
  }

  // Good prospect with recent gift but no follow-up
  if (engagement.gifts.length > 0 && recency.daysSinceLastGift !== null &&
    recency.daysSinceLastGift <= 90 &&
    (recency.daysSinceLastContact === null || recency.daysSinceLastContact > recency.daysSinceLastGift)) {
    return {
      action: "Send thank you and cultivate relationship",
      reason: "Recent gift received - opportunity for stewardship and cultivation",
    };
  }

  // Default moderate priority action
  if (score >= 0.5) {
    return {
      action: "Review for outreach planning",
      reason: "Moderate priority - consider for next outreach cycle",
    };
  }

  return null;
}

/**
 * Get priority level from score
 */
export function getPriorityLevel(score: number): "high" | "medium" | "low" {
  if (score >= PRIORITY_THRESHOLDS.high) return "high";
  if (score >= PRIORITY_THRESHOLDS.medium) return "medium";
  return "low";
}

/**
 * Calculate priority scores for multiple constituents (batch processing)
 */
export function calculateBatchPriorityScore(
  constituents: Array<{
    id: string;
    capacity: CapacityInput;
    lapseRisk: { score: number | null; confidence?: number };
    timing: { fiscalYearEnd: Date; campaigns?: string[] };
    engagement: {
      gifts: Array<{ date: Date; amount: number }>;
      contacts: Array<{ date: Date; type: string }>;
    };
  }>,
  referenceDate: Date
): Array<{ id: string; result: PriorityScoreResult }> {
  const results = constituents.map(c => ({
    id: c.id,
    result: calculatePriorityScore({
      capacity: c.capacity,
      lapseRisk: c.lapseRisk,
      timing: c.timing,
      engagement: c.engagement,
      referenceDate,
    }),
  }));

  // Sort by score descending
  results.sort((a, b) => b.result.score - a.result.score);

  return results;
}

/**
 * Get summary statistics for priority scores
 */
export function getPrioritySummary(
  results: Array<{ score: number; confidence: number; factors: PriorityFactor[]; recommendedAction: RecommendedAction | null }>
): {
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  averageScore: number;
  averageConfidence: number;
} {
  if (results.length === 0) {
    return {
      highPriorityCount: 0,
      mediumPriorityCount: 0,
      lowPriorityCount: 0,
      averageScore: 0,
      averageConfidence: 0,
    };
  }

  const highPriorityCount = results.filter(r => r.score >= PRIORITY_THRESHOLDS.high).length;
  const mediumPriorityCount = results.filter(
    r => r.score >= PRIORITY_THRESHOLDS.medium && r.score < PRIORITY_THRESHOLDS.high
  ).length;
  const lowPriorityCount = results.filter(r => r.score < PRIORITY_THRESHOLDS.medium).length;

  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  return {
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
    averageScore,
    averageConfidence,
  };
}
