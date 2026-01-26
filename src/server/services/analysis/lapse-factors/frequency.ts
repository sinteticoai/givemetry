// T121: Frequency factor scoring for lapse risk
/**
 * Frequency Factor
 *
 * Measures gift frequency trends over time. Declining frequency
 * indicates increasing lapse risk.
 */

export interface FrequencyInput {
  gifts: Array<{ date: Date; amount: number }>;
  referenceDate: Date;
  windowYears?: number; // How far back to look (default: 5 years)
}

export interface FrequencyResult {
  score: number; // 0-1, higher = more risk
  currentAnnualFrequency: number;
  historicalAnnualFrequency: number;
  trend: "increasing" | "stable" | "decreasing" | "stopped";
  description: string;
}

/**
 * Calculate frequency score based on gift patterns
 */
export function calculateFrequencyScore(input: FrequencyInput): FrequencyResult {
  const windowYears = input.windowYears ?? 5;

  if (input.gifts.length === 0) {
    return {
      score: 1.0, // Maximum risk if no gifts
      currentAnnualFrequency: 0,
      historicalAnnualFrequency: 0,
      trend: "stopped",
      description: "No gift history recorded",
    };
  }

  if (input.gifts.length === 1) {
    // Single gift - moderate risk (can't determine trend)
    return {
      score: 0.6,
      currentAnnualFrequency: 1,
      historicalAnnualFrequency: 1,
      trend: "stable",
      description: "Single gift recorded (trend unknown)",
    };
  }

  // Split gifts into periods
  const windowMs = windowYears * 365 * 24 * 60 * 60 * 1000;
  const windowStart = new Date(input.referenceDate.getTime() - windowMs);

  // Filter to gifts within window
  const giftsInWindow = input.gifts.filter(g => g.date >= windowStart);

  if (giftsInWindow.length === 0) {
    return {
      score: 0.9,
      currentAnnualFrequency: 0,
      historicalAnnualFrequency: input.gifts.length / windowYears,
      trend: "stopped",
      description: `No gifts in past ${windowYears} years`,
    };
  }

  // Calculate frequency in recent period (last 2 years) vs earlier period
  const twoYearsAgo = new Date(input.referenceDate.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
  const recentGifts = giftsInWindow.filter(g => g.date >= twoYearsAgo);
  const olderGifts = giftsInWindow.filter(g => g.date < twoYearsAgo);

  const recentYears = Math.min(2, (input.referenceDate.getTime() - twoYearsAgo.getTime()) / (365 * 24 * 60 * 60 * 1000));
  const olderYears = Math.max(0.5, windowYears - 2);

  const recentFrequency = recentGifts.length / Math.max(1, recentYears);
  const olderFrequency = olderGifts.length > 0 ? olderGifts.length / olderYears : recentFrequency;

  // Calculate trend
  const trend = calculateTrend(recentFrequency, olderFrequency);

  // Calculate score based on trend and current frequency
  const score = calculateFrequencyScoreValue(recentFrequency, olderFrequency, trend);

  const description = getFrequencyDescription(recentFrequency, trend);

  return {
    score,
    currentAnnualFrequency: Math.round(recentFrequency * 10) / 10,
    historicalAnnualFrequency: Math.round(olderFrequency * 10) / 10,
    trend,
    description,
  };
}

/**
 * Determine frequency trend
 */
function calculateTrend(recent: number, historical: number): FrequencyResult["trend"] {
  if (recent === 0 && historical > 0) return "stopped";
  if (historical === 0) return "stable";

  const ratio = recent / historical;

  if (ratio >= 1.2) return "increasing";
  if (ratio >= 0.8) return "stable";
  return "decreasing";
}

/**
 * Calculate score from frequency data
 */
function calculateFrequencyScoreValue(
  recent: number,
  _historical: number,
  trend: FrequencyResult["trend"]
): number {
  // Base score from current frequency
  let score: number;

  if (recent >= 2) {
    score = 0.1; // Very active donors = low risk
  } else if (recent >= 1) {
    score = 0.25; // Annual givers = low-medium risk
  } else if (recent >= 0.5) {
    score = 0.4; // Biennial givers = medium risk
  } else if (recent > 0) {
    score = 0.6; // Occasional givers = elevated risk
  } else {
    score = 0.8; // No recent gifts = high risk
  }

  // Adjust for trend
  switch (trend) {
    case "increasing":
      score *= 0.7; // Reduce risk by 30%
      break;
    case "stable":
      // No adjustment
      break;
    case "decreasing":
      score = Math.min(1, score * 1.3); // Increase risk by 30%
      break;
    case "stopped":
      score = Math.min(1, score + 0.2); // Significant increase
      break;
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Generate human-readable description
 */
function getFrequencyDescription(frequency: number, trend: FrequencyResult["trend"]): string {
  let freqDesc: string;

  if (frequency >= 4) {
    freqDesc = "Quarterly giver";
  } else if (frequency >= 2) {
    freqDesc = "Multiple gifts per year";
  } else if (frequency >= 1) {
    freqDesc = "Annual giver";
  } else if (frequency >= 0.5) {
    freqDesc = "Biennial giver";
  } else if (frequency > 0) {
    freqDesc = "Occasional giver";
  } else {
    freqDesc = "No recent giving";
  }

  let trendDesc: string;
  switch (trend) {
    case "increasing":
      trendDesc = "frequency increasing";
      break;
    case "stable":
      trendDesc = "stable pattern";
      break;
    case "decreasing":
      trendDesc = "frequency declining";
      break;
    case "stopped":
      trendDesc = "giving stopped";
      break;
  }

  return `${freqDesc} (${trendDesc})`;
}

/**
 * Analyze gift frequency distribution
 */
export function analyzeGiftFrequency(
  gifts: Array<{ date: Date }>,
  _referenceDate: Date
): {
  averageGapDays: number;
  medianGapDays: number;
  maxGapDays: number;
  consistency: number; // 0-1, higher = more consistent
} {
  if (gifts.length < 2) {
    return {
      averageGapDays: 0,
      medianGapDays: 0,
      maxGapDays: 0,
      consistency: 0,
    };
  }

  // Sort by date
  const sorted = [...gifts].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate gaps
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = sorted[i - 1];
    if (current && prev) {
      const gap = (current.date.getTime() - prev.date.getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }
  }

  const averageGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianIdx = Math.floor(sortedGaps.length / 2);
  const medianGap = sortedGaps[medianIdx] !== undefined ? sortedGaps[medianIdx] : 0;
  const maxGap = Math.max(...gaps);

  // Consistency = 1 - coefficient of variation (capped at 1)
  const stdDev = Math.sqrt(gaps.reduce((sum, g) => sum + Math.pow(g - averageGap, 2), 0) / gaps.length);
  const cv = averageGap > 0 ? stdDev / averageGap : 0;
  const consistency = Math.max(0, 1 - cv);

  return {
    averageGapDays: Math.round(averageGap),
    medianGapDays: Math.round(medianGap),
    maxGapDays: Math.round(maxGap),
    consistency: Math.round(consistency * 100) / 100,
  };
}
