// T125: Confidence indicator calculation
/**
 * Confidence Indicator Service
 *
 * Calculates confidence levels for predictions based on data quality,
 * quantity, and recency.
 */

export interface ConfidenceInput {
  giftCount: number;
  contactCount: number;
  daysSinceLastGift: number | null;
  daysSinceLastContact: number | null;
  dataSpanYears: number;
  hasRequiredFields: boolean;
  hasContactInfo: boolean;
}

export interface ConfidenceResult {
  score: number; // 0-1
  level: "high" | "medium" | "low" | "very_low";
  factors: ConfidenceFactor[];
  recommendations: string[];
}

export interface ConfidenceFactor {
  name: string;
  contribution: number;
  status: "good" | "fair" | "poor";
  detail: string;
}

// Confidence weights
const CONFIDENCE_WEIGHTS = {
  dataQuantity: 0.35,
  dataRecency: 0.30,
  dataSpan: 0.20,
  dataQuality: 0.15,
};

/**
 * Calculate confidence score for a prediction
 */
export function calculateConfidence(input: ConfidenceInput): ConfidenceResult {
  const factors: ConfidenceFactor[] = [];
  const recommendations: string[] = [];

  // 1. Data quantity score
  const quantityScore = calculateQuantityScore(input.giftCount, input.contactCount);
  factors.push({
    name: "data_quantity",
    contribution: quantityScore * CONFIDENCE_WEIGHTS.dataQuantity,
    status: quantityScore >= 0.7 ? "good" : quantityScore >= 0.4 ? "fair" : "poor",
    detail: `${input.giftCount} gifts, ${input.contactCount} contacts`,
  });

  if (quantityScore < 0.5) {
    recommendations.push("Upload more historical data to improve prediction accuracy");
  }

  // 2. Data recency score
  const recencyScore = calculateRecencyScore(
    input.daysSinceLastGift,
    input.daysSinceLastContact
  );
  factors.push({
    name: "data_recency",
    contribution: recencyScore * CONFIDENCE_WEIGHTS.dataRecency,
    status: recencyScore >= 0.7 ? "good" : recencyScore >= 0.4 ? "fair" : "poor",
    detail: getRecencyDetail(input.daysSinceLastGift, input.daysSinceLastContact),
  });

  if (recencyScore < 0.5) {
    recommendations.push("Consider uploading more recent data");
  }

  // 3. Data span score
  const spanScore = calculateSpanScore(input.dataSpanYears);
  factors.push({
    name: "data_span",
    contribution: spanScore * CONFIDENCE_WEIGHTS.dataSpan,
    status: spanScore >= 0.7 ? "good" : spanScore >= 0.4 ? "fair" : "poor",
    detail: input.dataSpanYears > 0
      ? `${input.dataSpanYears.toFixed(1)} years of history`
      : "No historical data",
  });

  if (spanScore < 0.5) {
    recommendations.push("Longer giving history improves prediction reliability");
  }

  // 4. Data quality score
  const qualityScore = calculateQualityScore(
    input.hasRequiredFields,
    input.hasContactInfo
  );
  factors.push({
    name: "data_quality",
    contribution: qualityScore * CONFIDENCE_WEIGHTS.dataQuality,
    status: qualityScore >= 0.7 ? "good" : qualityScore >= 0.4 ? "fair" : "poor",
    detail: getQualityDetail(input.hasRequiredFields, input.hasContactInfo),
  });

  if (!input.hasContactInfo) {
    recommendations.push("Adding contact information improves data quality");
  }

  // Calculate overall score
  const score = factors.reduce((sum, f) => sum + f.contribution, 0);
  const level = getConfidenceLevel(score);

  return {
    score: Math.round(score * 100) / 100,
    level,
    factors,
    recommendations,
  };
}

/**
 * Calculate score from data quantity
 */
function calculateQuantityScore(gifts: number, contacts: number): number {
  // Score based on gift count
  let giftScore: number;
  if (gifts >= 10) giftScore = 1.0;
  else if (gifts >= 5) giftScore = 0.8;
  else if (gifts >= 3) giftScore = 0.6;
  else if (gifts >= 1) giftScore = 0.4;
  else giftScore = 0.1;

  // Score based on contact count
  let contactScore: number;
  if (contacts >= 10) contactScore = 1.0;
  else if (contacts >= 5) contactScore = 0.8;
  else if (contacts >= 2) contactScore = 0.6;
  else if (contacts >= 1) contactScore = 0.4;
  else contactScore = 0.2;

  // Weighted average favoring gifts
  return giftScore * 0.7 + contactScore * 0.3;
}

/**
 * Calculate score from data recency
 */
function calculateRecencyScore(
  daysSinceGift: number | null,
  daysSinceContact: number | null
): number {
  // Score gift recency
  let giftRecency: number;
  if (daysSinceGift === null) {
    giftRecency = 0.1;
  } else if (daysSinceGift <= 180) {
    giftRecency = 1.0;
  } else if (daysSinceGift <= 365) {
    giftRecency = 0.8;
  } else if (daysSinceGift <= 730) {
    giftRecency = 0.5;
  } else {
    giftRecency = 0.2;
  }

  // Score contact recency
  let contactRecency: number;
  if (daysSinceContact === null) {
    contactRecency = 0.2;
  } else if (daysSinceContact <= 90) {
    contactRecency = 1.0;
  } else if (daysSinceContact <= 180) {
    contactRecency = 0.8;
  } else if (daysSinceContact <= 365) {
    contactRecency = 0.5;
  } else {
    contactRecency = 0.2;
  }

  return giftRecency * 0.6 + contactRecency * 0.4;
}

/**
 * Calculate score from data span
 */
function calculateSpanScore(years: number): number {
  if (years >= 5) return 1.0;
  if (years >= 3) return 0.8;
  if (years >= 2) return 0.6;
  if (years >= 1) return 0.4;
  if (years > 0) return 0.2;
  return 0;
}

/**
 * Calculate score from data quality
 */
function calculateQualityScore(
  hasRequired: boolean,
  hasContact: boolean
): number {
  let score = 0;

  if (hasRequired) score += 0.6;
  if (hasContact) score += 0.4;

  return score;
}

/**
 * Get human-readable recency detail
 */
function getRecencyDetail(
  daysSinceGift: number | null,
  daysSinceContact: number | null
): string {
  const parts: string[] = [];

  if (daysSinceGift !== null) {
    if (daysSinceGift < 30) parts.push("recent gift");
    else if (daysSinceGift < 365) parts.push(`gift ${Math.round(daysSinceGift / 30)}mo ago`);
    else parts.push(`gift ${(daysSinceGift / 365).toFixed(1)}yr ago`);
  } else {
    parts.push("no gift data");
  }

  if (daysSinceContact !== null) {
    if (daysSinceContact < 30) parts.push("recent contact");
    else if (daysSinceContact < 365) parts.push(`contact ${Math.round(daysSinceContact / 30)}mo ago`);
    else parts.push(`contact ${(daysSinceContact / 365).toFixed(1)}yr ago`);
  } else {
    parts.push("no contact data");
  }

  return parts.join(", ");
}

/**
 * Get human-readable quality detail
 */
function getQualityDetail(hasRequired: boolean, hasContact: boolean): string {
  const parts: string[] = [];

  if (hasRequired) parts.push("required fields complete");
  else parts.push("missing required fields");

  if (hasContact) parts.push("contact info available");
  else parts.push("no contact info");

  return parts.join(", ");
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score: number): ConfidenceResult["level"] {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  if (score >= 0.25) return "low";
  return "very_low";
}

/**
 * Calculate confidence for multiple constituents
 */
export function calculateBatchConfidence(
  inputs: Array<ConfidenceInput & { id: string }>
): Array<{ id: string; result: ConfidenceResult }> {
  return inputs.map(input => ({
    id: input.id,
    result: calculateConfidence(input),
  }));
}

/**
 * Get confidence statistics for a set of predictions
 */
export function getConfidenceStats(
  results: ConfidenceResult[]
): {
  avgScore: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  veryLowCount: number;
  commonRecommendations: string[];
} {
  if (results.length === 0) {
    return {
      avgScore: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      veryLowCount: 0,
      commonRecommendations: [],
    };
  }

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

  const highCount = results.filter(r => r.level === "high").length;
  const mediumCount = results.filter(r => r.level === "medium").length;
  const lowCount = results.filter(r => r.level === "low").length;
  const veryLowCount = results.filter(r => r.level === "very_low").length;

  // Find most common recommendations
  const recCounts = new Map<string, number>();
  for (const result of results) {
    for (const rec of result.recommendations) {
      recCounts.set(rec, (recCounts.get(rec) || 0) + 1);
    }
  }

  const commonRecommendations = Array.from(recCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([rec]) => rec);

  return {
    avgScore,
    highCount,
    mediumCount,
    lowCount,
    veryLowCount,
    commonRecommendations,
  };
}
