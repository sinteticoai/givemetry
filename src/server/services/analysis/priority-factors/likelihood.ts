// T141: Likelihood score calculation (inverse of lapse risk)
/**
 * Likelihood Factor
 *
 * Measures likelihood of giving based on lapse risk.
 * Lower lapse risk = higher likelihood of giving = higher priority.
 * This creates an inverse relationship with the lapse risk score.
 */

export interface LikelihoodInput {
  lapseRiskScore: number | null;
  lapseRiskConfidence?: number | null;
}

export interface LikelihoodResult {
  score: number; // 0-1, higher = higher likelihood = higher priority
  confidence: number;
  description: string;
}

// Threshold labels for likelihood
const LIKELIHOOD_THRESHOLDS = {
  high: 0.7, // Low lapse risk (< 0.3) = high likelihood
  moderate: 0.4, // Medium lapse risk (0.3-0.6) = moderate likelihood
  low: 0, // High lapse risk (> 0.6) = low likelihood
};

const UNKNOWN_LIKELIHOOD_SCORE = 0.5; // Neutral score for unknown
const DEFAULT_CONFIDENCE = 0.5;

/**
 * Calculate likelihood score as inverse of lapse risk
 */
export function calculateLikelihoodScore(input: LikelihoodInput): LikelihoodResult {
  // Handle null lapse risk
  if (input.lapseRiskScore === null || input.lapseRiskScore === undefined) {
    return {
      score: UNKNOWN_LIKELIHOOD_SCORE,
      confidence: DEFAULT_CONFIDENCE,
      description: "Unknown giving likelihood - no lapse risk calculated",
    };
  }

  // Ensure lapse risk is within bounds
  const lapseRisk = Math.max(0, Math.min(1, input.lapseRiskScore));

  // Inverse the lapse risk score
  // Low lapse risk (0.1) = High likelihood (0.9)
  // High lapse risk (0.9) = Low likelihood (0.1)
  const score = 1 - lapseRisk;

  // Use provided confidence or derive from lapse risk confidence
  const confidence = input.lapseRiskConfidence ?? DEFAULT_CONFIDENCE;

  // Generate description based on score
  const description = getLikelihoodDescription(score, lapseRisk);

  return {
    score,
    confidence,
    description,
  };
}

/**
 * Generate human-readable likelihood description
 */
function getLikelihoodDescription(score: number, lapseRisk: number): string {
  if (score >= LIKELIHOOD_THRESHOLDS.high) {
    const riskPercent = Math.round(lapseRisk * 100);
    return `High giving likelihood (${riskPercent}% lapse risk)`;
  }

  if (score >= LIKELIHOOD_THRESHOLDS.moderate) {
    const riskPercent = Math.round(lapseRisk * 100);
    return `Moderate giving likelihood (${riskPercent}% lapse risk)`;
  }

  const riskPercent = Math.round(lapseRisk * 100);
  return `Low giving likelihood (${riskPercent}% lapse risk)`;
}

/**
 * Get likelihood category for grouping
 */
export function getLikelihoodCategory(score: number | null): "high" | "moderate" | "low" | "unknown" {
  if (score === null || score === undefined) {
    return "unknown";
  }

  if (score >= LIKELIHOOD_THRESHOLDS.high) {
    return "high";
  }

  if (score >= LIKELIHOOD_THRESHOLDS.moderate) {
    return "moderate";
  }

  return "low";
}

/**
 * Calculate upgrade likelihood based on giving history trends
 * This is an additional signal beyond basic inverse lapse risk
 */
export function calculateUpgradeLikelihood(input: {
  gifts: Array<{ amount: number; date: Date }>;
  referenceDate: Date;
}): {
  score: number;
  description: string;
} {
  if (input.gifts.length < 2) {
    return {
      score: 0.5,
      description: "Insufficient gift history for upgrade assessment",
    };
  }

  // Sort gifts by date
  const sortedGifts = [...input.gifts].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Calculate giving trend (are amounts increasing?)
  let upgrades = 0;
  let downgrades = 0;

  for (let i = 1; i < sortedGifts.length; i++) {
    const prevAmount = sortedGifts[i - 1]?.amount ?? 0;
    const currAmount = sortedGifts[i]?.amount ?? 0;

    if (currAmount > prevAmount * 1.1) {
      upgrades++;
    } else if (currAmount < prevAmount * 0.9) {
      downgrades++;
    }
  }

  const totalComparisons = sortedGifts.length - 1;
  const netTrend = (upgrades - downgrades) / totalComparisons;

  // Convert to 0-1 score
  const score = Math.max(0, Math.min(1, 0.5 + netTrend * 0.5));

  let description: string;
  if (netTrend > 0.3) {
    description = "Strong upgrade trend in giving";
  } else if (netTrend > 0) {
    description = "Slight upgrade trend";
  } else if (netTrend < -0.3) {
    description = "Declining giving amounts";
  } else if (netTrend < 0) {
    description = "Slight decline in giving";
  } else {
    description = "Stable giving pattern";
  }

  return { score, description };
}
