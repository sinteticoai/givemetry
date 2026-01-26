// T120: Recency factor scoring for lapse risk
/**
 * Recency Factor
 *
 * Measures time since last gift. Longer gaps increase lapse risk.
 * Based on research showing that donors who haven't given in 18+ months
 * have significantly higher lapse rates.
 */

export interface RecencyInput {
  gifts: Array<{ date: Date; amount: number }>;
  referenceDate: Date;
}

export interface RecencyResult {
  score: number; // 0-1, higher = more risk
  daysSinceLastGift: number | null;
  monthsSinceLastGift: number | null;
  description: string;
}

// Thresholds for recency scoring (in months)
const RECENCY_THRESHOLDS = {
  excellent: 6, // Within 6 months = low risk
  good: 12, // Within 12 months = some risk
  warning: 18, // Within 18 months = elevated risk
  danger: 24, // Within 24 months = high risk
  critical: 36, // Beyond 36 months = very high risk
};

/**
 * Calculate recency score based on time since last gift
 */
export function calculateRecencyScore(input: RecencyInput): RecencyResult {
  if (input.gifts.length === 0) {
    return {
      score: 1.0, // Maximum risk if no gifts
      daysSinceLastGift: null,
      monthsSinceLastGift: null,
      description: "No gift history recorded",
    };
  }

  // Find most recent gift
  const lastGiftDate = new Date(
    Math.max(...input.gifts.map(g => g.date.getTime()))
  );

  const daysSince = Math.floor(
    (input.referenceDate.getTime() - lastGiftDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const monthsSince = daysSince / 30.44; // Average days per month

  // Calculate score using sigmoid-like function
  // Score increases (worse) as time since last gift increases
  const score = calculateRecencyScoreFromMonths(monthsSince);

  const description = getRecencyDescription(monthsSince, daysSince);

  return {
    score,
    daysSinceLastGift: daysSince,
    monthsSinceLastGift: Math.round(monthsSince * 10) / 10,
    description,
  };
}

/**
 * Convert months since last gift to risk score
 */
function calculateRecencyScoreFromMonths(months: number): number {
  if (months <= 0) return 0;

  // Use piecewise linear function for interpretability
  if (months <= RECENCY_THRESHOLDS.excellent) {
    // 0-6 months: score 0.0-0.2
    return (months / RECENCY_THRESHOLDS.excellent) * 0.2;
  } else if (months <= RECENCY_THRESHOLDS.good) {
    // 6-12 months: score 0.2-0.4
    const t = (months - RECENCY_THRESHOLDS.excellent) /
      (RECENCY_THRESHOLDS.good - RECENCY_THRESHOLDS.excellent);
    return 0.2 + t * 0.2;
  } else if (months <= RECENCY_THRESHOLDS.warning) {
    // 12-18 months: score 0.4-0.6
    const t = (months - RECENCY_THRESHOLDS.good) /
      (RECENCY_THRESHOLDS.warning - RECENCY_THRESHOLDS.good);
    return 0.4 + t * 0.2;
  } else if (months <= RECENCY_THRESHOLDS.danger) {
    // 18-24 months: score 0.6-0.8
    const t = (months - RECENCY_THRESHOLDS.warning) /
      (RECENCY_THRESHOLDS.danger - RECENCY_THRESHOLDS.warning);
    return 0.6 + t * 0.2;
  } else if (months <= RECENCY_THRESHOLDS.critical) {
    // 24-36 months: score 0.8-0.95
    const t = (months - RECENCY_THRESHOLDS.danger) /
      (RECENCY_THRESHOLDS.critical - RECENCY_THRESHOLDS.danger);
    return 0.8 + t * 0.15;
  } else {
    // Beyond 36 months: score approaches 1.0
    const t = Math.min(1, (months - RECENCY_THRESHOLDS.critical) / 24);
    return 0.95 + t * 0.05;
  }
}

/**
 * Generate human-readable description
 */
function getRecencyDescription(months: number, days: number): string {
  if (days < 30) {
    return `Gift within last ${days} days`;
  } else if (months < 2) {
    return `Gift within last month`;
  } else if (months < 12) {
    return `${Math.round(months)} months since last gift`;
  } else if (months < 24) {
    const years = Math.floor(months / 12);
    const remainingMonths = Math.round(months % 12);
    if (remainingMonths === 0) {
      return `${years} year since last gift`;
    }
    return `${years} year ${remainingMonths} months since last gift`;
  } else {
    const years = Math.round(months / 12 * 10) / 10;
    return `${years} years since last gift`;
  }
}

/**
 * Get recency category for grouping
 */
export function getRecencyCategory(months: number | null): string {
  if (months === null) return "no_gifts";
  if (months <= RECENCY_THRESHOLDS.excellent) return "recent";
  if (months <= RECENCY_THRESHOLDS.good) return "active";
  if (months <= RECENCY_THRESHOLDS.warning) return "lapsed";
  if (months <= RECENCY_THRESHOLDS.danger) return "at_risk";
  return "dormant";
}
