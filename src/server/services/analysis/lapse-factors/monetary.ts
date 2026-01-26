// T122: Monetary factor scoring for lapse risk
/**
 * Monetary Factor
 *
 * Measures gift amount trends. Declining gift amounts may indicate
 * decreasing engagement and higher lapse risk.
 */

export interface MonetaryInput {
  gifts: Array<{ date: Date; amount: number }>;
  referenceDate: Date;
  windowYears?: number;
}

export interface MonetaryResult {
  score: number; // 0-1, higher = more risk
  totalLifetime: number;
  recentAnnualAvg: number;
  historicalAnnualAvg: number;
  trend: "increasing" | "stable" | "decreasing" | "stopped";
  lastGiftAmount: number | null;
  description: string;
}

/**
 * Calculate monetary score based on gift amount trends
 */
export function calculateMonetaryScore(input: MonetaryInput): MonetaryResult {
  const windowYears = input.windowYears ?? 5;

  if (input.gifts.length === 0) {
    return {
      score: 0.8, // High risk, but not maximum (monetary alone isn't definitive)
      totalLifetime: 0,
      recentAnnualAvg: 0,
      historicalAnnualAvg: 0,
      trend: "stopped",
      lastGiftAmount: null,
      description: "No gift history recorded",
    };
  }

  // Calculate totals and averages
  const totalLifetime = input.gifts.reduce((sum, g) => sum + g.amount, 0);

  // Sort by date to find last gift
  const sortedGifts = [...input.gifts].sort((a, b) => b.date.getTime() - a.date.getTime());
  const lastGiftAmount = sortedGifts[0]!.amount;

  // Split into recent (2 years) and historical periods
  const twoYearsAgo = new Date(input.referenceDate.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
  const windowStart = new Date(input.referenceDate.getTime() - windowYears * 365 * 24 * 60 * 60 * 1000);

  const recentGifts = input.gifts.filter(g => g.date >= twoYearsAgo);
  const historicalGifts = input.gifts.filter(g => g.date >= windowStart && g.date < twoYearsAgo);

  // Calculate annual averages
  const recentTotal = recentGifts.reduce((sum, g) => sum + g.amount, 0);
  const historicalTotal = historicalGifts.reduce((sum, g) => sum + g.amount, 0);

  const recentYears = Math.min(2, (input.referenceDate.getTime() - twoYearsAgo.getTime()) / (365 * 24 * 60 * 60 * 1000));
  const historicalYears = Math.max(0.5, windowYears - 2);

  const recentAnnualAvg = recentGifts.length > 0 ? recentTotal / Math.max(1, recentYears) : 0;
  const historicalAnnualAvg = historicalGifts.length > 0 ? historicalTotal / historicalYears : recentAnnualAvg;

  // Determine trend
  const trend = calculateTrend(recentAnnualAvg, historicalAnnualAvg, recentGifts.length);

  // Calculate score
  const score = calculateMonetaryScoreValue(recentAnnualAvg, historicalAnnualAvg, trend, totalLifetime);

  const description = getMonetaryDescription(recentAnnualAvg, trend, totalLifetime);

  return {
    score,
    totalLifetime: Math.round(totalLifetime * 100) / 100,
    recentAnnualAvg: Math.round(recentAnnualAvg * 100) / 100,
    historicalAnnualAvg: Math.round(historicalAnnualAvg * 100) / 100,
    trend,
    lastGiftAmount,
    description,
  };
}

/**
 * Determine monetary trend
 */
function calculateTrend(
  recent: number,
  historical: number,
  recentCount: number
): MonetaryResult["trend"] {
  if (recentCount === 0) return "stopped";
  if (historical === 0) return "stable";

  const ratio = recent / historical;

  if (ratio >= 1.2) return "increasing";
  if (ratio >= 0.8) return "stable";
  return "decreasing";
}

/**
 * Calculate score from monetary data
 */
function calculateMonetaryScoreValue(
  recentAvg: number,
  historicalAvg: number,
  trend: MonetaryResult["trend"],
  totalLifetime: number
): number {
  // Base score from recent activity
  let score: number;

  if (recentAvg === 0) {
    score = 0.7; // No recent giving = high risk
  } else if (recentAvg >= historicalAvg * 0.8) {
    score = 0.2; // Maintaining or growing = low risk
  } else if (recentAvg >= historicalAvg * 0.5) {
    score = 0.4; // Moderate decline
  } else {
    score = 0.6; // Significant decline
  }

  // Adjust for trend
  switch (trend) {
    case "increasing":
      score *= 0.6; // Strong risk reduction
      break;
    case "stable":
      // No adjustment
      break;
    case "decreasing":
      score = Math.min(1, score * 1.2);
      break;
    case "stopped":
      score = Math.min(1, score + 0.15);
      break;
  }

  // Slight adjustment for major donors (they may have longer cycles)
  if (totalLifetime >= 100000) {
    score *= 0.9; // Major donors get slight benefit of doubt
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Generate human-readable description
 */
function getMonetaryDescription(
  recentAvg: number,
  trend: MonetaryResult["trend"],
  totalLifetime: number
): string {
  const formatAmount = (amt: number): string => {
    if (amt >= 1000000) return `$${(amt / 1000000).toFixed(1)}M`;
    if (amt >= 1000) return `$${(amt / 1000).toFixed(1)}K`;
    return `$${amt.toFixed(0)}`;
  };

  let amountDesc: string;
  if (recentAvg === 0) {
    amountDesc = "No recent giving";
  } else {
    amountDesc = `${formatAmount(recentAvg)}/year recently`;
  }

  let trendDesc: string;
  switch (trend) {
    case "increasing":
      trendDesc = "giving increasing";
      break;
    case "stable":
      trendDesc = "stable amounts";
      break;
    case "decreasing":
      trendDesc = "giving declining";
      break;
    case "stopped":
      trendDesc = "giving stopped";
      break;
  }

  const lifetimeDesc = totalLifetime > 0 ? ` (${formatAmount(totalLifetime)} lifetime)` : "";

  return `${amountDesc}, ${trendDesc}${lifetimeDesc}`;
}

/**
 * Calculate giving capacity score based on historical giving
 */
export function estimateCapacityFromHistory(
  gifts: Array<{ amount: number }>,
  percentile: number = 0.9
): number {
  if (gifts.length === 0) return 0;

  const amounts = gifts.map(g => g.amount).sort((a, b) => a - b);
  const idx = Math.floor(amounts.length * percentile);
  return amounts[Math.min(idx, amounts.length - 1)] ?? 0;
}

/**
 * Analyze gift amount distribution
 */
export function analyzeGiftAmounts(
  gifts: Array<{ amount: number }>
): {
  min: number;
  max: number;
  median: number;
  average: number;
  total: number;
  count: number;
} {
  if (gifts.length === 0) {
    return { min: 0, max: 0, median: 0, average: 0, total: 0, count: 0 };
  }

  const amounts = gifts.map(g => g.amount);
  const sorted = [...amounts].sort((a, b) => a - b);
  const total = amounts.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    average: total / amounts.length,
    total,
    count: gifts.length,
  };
}
