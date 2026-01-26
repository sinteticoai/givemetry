// T142: Timing score calculation for priority scoring
/**
 * Timing Factor
 *
 * Measures optimal timing for outreach based on:
 * - Proximity to fiscal year end
 * - Active campaign alignment
 * - Seasonal giving patterns (Q4 giving season)
 */

export interface TimingInput {
  fiscalYearEnd: Date;
  campaigns?: string[];
  referenceDate: Date;
}

export interface TimingResult {
  score: number; // 0-1, higher = better timing = higher priority
  indicator: string;
  description: string;
}

// Weight configuration for timing components
const TIMING_WEIGHTS = {
  fiscalYearEnd: 0.4,
  campaigns: 0.35,
  q4Season: 0.25,
};

// Fiscal year end proximity thresholds (in days)
const FISCAL_THRESHOLDS = {
  critical: 30, // Within 30 days
  urgent: 60, // Within 60 days
  soon: 90, // Within 90 days
  upcoming: 180, // Within 6 months
};

/**
 * Calculate timing score based on fiscal year, campaigns, and seasonality
 */
export function calculateTimingScore(input: TimingInput): TimingResult {
  const { fiscalYearEnd, campaigns = [], referenceDate } = input;

  // Calculate individual component scores
  const fiscalScore = calculateFiscalYearScore(fiscalYearEnd, referenceDate);
  const campaignScore = calculateCampaignScore(campaigns);
  const seasonalScore = calculateSeasonalScore(referenceDate);

  // Weighted composite score
  const score =
    fiscalScore.score * TIMING_WEIGHTS.fiscalYearEnd +
    campaignScore.score * TIMING_WEIGHTS.campaigns +
    seasonalScore.score * TIMING_WEIGHTS.q4Season;

  // Build indicator string
  const indicators: string[] = [];

  if (fiscalScore.score >= 0.7) {
    indicators.push(fiscalScore.indicator);
  }

  if (campaignScore.score > 0) {
    indicators.push(campaignScore.indicator);
  }

  if (seasonalScore.score >= 0.6) {
    indicators.push(seasonalScore.indicator);
  }

  const indicator = indicators.length > 0
    ? indicators.join(" | ")
    : "Standard timing";

  // Build description
  const description = buildTimingDescription(
    fiscalScore,
    campaignScore,
    seasonalScore,
    score
  );

  return {
    score: Math.max(0, Math.min(1, score)),
    indicator,
    description,
  };
}

/**
 * Calculate fiscal year end proximity score
 */
function calculateFiscalYearScore(
  fiscalYearEnd: Date,
  referenceDate: Date
): { score: number; indicator: string } {
  const daysUntilEnd = Math.ceil(
    (fiscalYearEnd.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Handle past fiscal year end (wrapped to next year conceptually)
  if (daysUntilEnd < 0) {
    // Fiscal year has ended - lower priority unless very close to new FY start
    const daysSinceEnd = Math.abs(daysUntilEnd);
    if (daysSinceEnd <= 30) {
      return { score: 0.5, indicator: "New fiscal year" };
    }
    return { score: 0.3, indicator: "Early fiscal year" };
  }

  // Score based on proximity to fiscal year end
  if (daysUntilEnd <= FISCAL_THRESHOLDS.critical) {
    return { score: 1.0, indicator: `Fiscal year end in ${daysUntilEnd} days` };
  }

  if (daysUntilEnd <= FISCAL_THRESHOLDS.urgent) {
    return { score: 0.85, indicator: `Fiscal year end approaching (${daysUntilEnd} days)` };
  }

  if (daysUntilEnd <= FISCAL_THRESHOLDS.soon) {
    return { score: 0.7, indicator: `Fiscal year end in ${Math.round(daysUntilEnd / 30)} months` };
  }

  if (daysUntilEnd <= FISCAL_THRESHOLDS.upcoming) {
    return { score: 0.5, indicator: "Mid fiscal year" };
  }

  return { score: 0.3, indicator: "Early fiscal year" };
}

/**
 * Calculate campaign activity score
 */
function calculateCampaignScore(
  campaigns: string[]
): { score: number; indicator: string } {
  if (campaigns.length === 0) {
    return { score: 0, indicator: "" };
  }

  // More active campaigns = higher timing score
  if (campaigns.length >= 2) {
    return {
      score: 1.0,
      indicator: `Campaign: ${campaigns.slice(0, 2).join(", ")}`,
    };
  }

  return {
    score: 0.8,
    indicator: `Campaign: ${campaigns[0]}`,
  };
}

/**
 * Calculate seasonal giving score (Q4 giving season boost)
 */
function calculateSeasonalScore(
  referenceDate: Date
): { score: number; indicator: string } {
  const month = referenceDate.getMonth(); // 0-indexed

  // Q4: October (9), November (10), December (11)
  if (month >= 9 && month <= 11) {
    if (month === 11) {
      // December - peak giving month
      const day = referenceDate.getDate();
      if (day >= 15) {
        return { score: 1.0, indicator: "Q4 Year-end giving season" };
      }
      return { score: 0.9, indicator: "Q4 December giving" };
    }

    if (month === 10) {
      // November - Giving Tuesday, etc.
      return { score: 0.8, indicator: "Q4 Giving season" };
    }

    // October - start of Q4
    return { score: 0.6, indicator: "Q4 Season starting" };
  }

  // Q1 after holidays - often follow-up period
  if (month === 0) {
    return { score: 0.4, indicator: "Post-holiday follow-up" };
  }

  // Q2 tax season considerations
  if (month >= 1 && month <= 3) {
    return { score: 0.3, indicator: "Early year" };
  }

  // Q3 summer - typically lower giving
  if (month >= 5 && month <= 8) {
    return { score: 0.2, indicator: "Summer period" };
  }

  // Standard timing
  return { score: 0.3, indicator: "" };
}

/**
 * Build comprehensive timing description
 */
function buildTimingDescription(
  fiscal: { score: number; indicator: string },
  campaign: { score: number; indicator: string },
  seasonal: { score: number; indicator: string },
  overallScore: number
): string {
  const parts: string[] = [];

  if (fiscal.score >= 0.7) {
    parts.push(`${fiscal.indicator}`);
  }

  if (campaign.score > 0) {
    parts.push(`Active campaign(s)`);
  }

  if (seasonal.score >= 0.6) {
    parts.push(`Peak giving season`);
  }

  if (parts.length === 0) {
    if (overallScore >= 0.5) {
      return "Moderate timing opportunity";
    }
    return "Standard timing - no urgent drivers";
  }

  return parts.join("; ");
}

/**
 * Check if current timing is optimal for outreach
 */
export function isOptimalTiming(input: TimingInput): boolean {
  const result = calculateTimingScore(input);
  return result.score >= 0.6;
}

/**
 * Get timing category for filtering
 */
export function getTimingCategory(score: number): "optimal" | "good" | "fair" | "standard" {
  if (score >= 0.8) return "optimal";
  if (score >= 0.6) return "good";
  if (score >= 0.4) return "fair";
  return "standard";
}
