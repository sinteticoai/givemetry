// T225: Giving pattern change detector
// Detects transitions from consistent giving to lapsed giving or decreasing amounts

export interface GiftData {
  amount: number;
  date: Date;
}

export interface GivingPatternInput {
  constituentId: string;
  gifts: GiftData[];
  referenceDate: Date;
}

export interface AnomalyFactor {
  name: string;
  value: string;
}

export interface GivingPatternResult {
  constituentId: string;
  type: "giving_pattern_change";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  factors: AnomalyFactor[];
  detectedAt: Date;
}

// Configuration
const CONSISTENT_DONOR_MIN_YEARS = 3;
const LAPSE_THRESHOLD_MONTHS = 18;
const AMOUNT_DECLINE_THRESHOLD = 0.5; // 50% decline
const MIN_GIFTS_FOR_PATTERN = 3;

/**
 * Detects significant changes in giving patterns
 * - Annual donors missing expected giving cycle
 * - Consistent decline in gift amounts
 * - Previously frequent donors becoming infrequent
 */
export function detectGivingPatternChange(
  input: GivingPatternInput
): GivingPatternResult | null {
  const { constituentId, gifts, referenceDate } = input;

  if (gifts.length < MIN_GIFTS_FOR_PATTERN) {
    return null;
  }

  // Sort gifts by date descending
  const sortedGifts = [...gifts].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  const factors: AnomalyFactor[] = [];
  let hasPatternChange = false;
  let severity: "high" | "medium" | "low" = "low";

  // Check for lapsed giving from consistent donors
  const lapseResult = checkForLapse(sortedGifts, referenceDate);
  if (lapseResult) {
    factors.push(...lapseResult.factors);
    hasPatternChange = true;
    severity = lapseResult.severity;
  }

  // Check for declining amounts
  const declineResult = checkForAmountDecline(sortedGifts);
  if (declineResult) {
    factors.push(...declineResult.factors);
    hasPatternChange = true;
    if (declineResult.severity === "high" || severity !== "high") {
      severity = declineResult.severity;
    }
  }

  // Check for frequency decline
  const frequencyResult = checkForFrequencyDecline(sortedGifts, referenceDate);
  if (frequencyResult) {
    factors.push(...frequencyResult.factors);
    hasPatternChange = true;
    if (frequencyResult.severity === "high") {
      severity = "high";
    }
  }

  if (!hasPatternChange) {
    return null;
  }

  return {
    constituentId,
    type: "giving_pattern_change",
    severity,
    title: "Significant giving pattern change",
    description: generateDescription(factors, sortedGifts, referenceDate),
    factors,
    detectedAt: referenceDate,
  };
}

interface PatternCheckResult {
  factors: AnomalyFactor[];
  severity: "high" | "medium" | "low";
}

function checkForLapse(
  sortedGifts: GiftData[],
  referenceDate: Date
): PatternCheckResult | null {
  if (sortedGifts.length < CONSISTENT_DONOR_MIN_YEARS) {
    return null;
  }

  const mostRecentGift = sortedGifts[0];
  if (!mostRecentGift) return null;

  const monthsSinceLastGift = getMonthsDiff(mostRecentGift.date, referenceDate);

  // Check if this was a consistent donor
  const giftYears = new Set(sortedGifts.map((g) => g.date.getFullYear()));
  const yearSpan =
    Math.max(...sortedGifts.map((g) => g.date.getFullYear())) -
    Math.min(...sortedGifts.map((g) => g.date.getFullYear()));

  const isConsistentDonor =
    giftYears.size >= CONSISTENT_DONOR_MIN_YEARS &&
    yearSpan >= CONSISTENT_DONOR_MIN_YEARS;

  if (isConsistentDonor && monthsSinceLastGift >= LAPSE_THRESHOLD_MONTHS) {
    const lifetimeTotal = sortedGifts.reduce((sum, g) => sum + g.amount, 0);

    // High severity if: long-term donor (3+ years consistent giving) regardless of amount
    // or significant lifetime giving
    const isHighSeverity = giftYears.size >= CONSISTENT_DONOR_MIN_YEARS || lifetimeTotal >= 10000;

    return {
      factors: [
        {
          name: "lapse_detected",
          value: `${monthsSinceLastGift} months since last gift from ${giftYears.size}-year consistent donor`,
        },
        {
          name: "at_risk_value",
          value: `Lifetime giving of $${formatAmount(lifetimeTotal)} at risk`,
        },
      ],
      severity: isHighSeverity ? "high" : "medium",
    };
  }

  // Check for missed expected cycle
  if (sortedGifts.length >= 3) {
    const intervals = getGiftIntervals(sortedGifts);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const isAnnualDonor = avgInterval >= 10 && avgInterval <= 14; // ~12 months

    if (isAnnualDonor && monthsSinceLastGift >= 15) {
      return {
        factors: [
          {
            name: "missed_cycle",
            value: `Annual donor appears to have missed expected giving cycle (${monthsSinceLastGift} months since last gift)`,
          },
        ],
        severity: "medium",
      };
    }
  }

  return null;
}

function checkForAmountDecline(
  sortedGifts: GiftData[]
): PatternCheckResult | null {
  if (sortedGifts.length < 4) {
    return null;
  }

  // Compare recent half to older half
  const midpoint = Math.floor(sortedGifts.length / 2);
  const recentGifts = sortedGifts.slice(0, midpoint);
  const olderGifts = sortedGifts.slice(midpoint);

  const recentAvg =
    recentGifts.reduce((sum, g) => sum + g.amount, 0) / recentGifts.length;
  const olderAvg =
    olderGifts.reduce((sum, g) => sum + g.amount, 0) / olderGifts.length;

  if (olderAvg > 0 && recentAvg / olderAvg <= AMOUNT_DECLINE_THRESHOLD) {
    const declinePercent = Math.round((1 - recentAvg / olderAvg) * 100);
    return {
      factors: [
        {
          name: "amount_decline",
          value: `Average gift decreased ${declinePercent}% (from $${formatAmount(olderAvg)} to $${formatAmount(recentAvg)})`,
        },
      ],
      severity: declinePercent >= 70 ? "high" : "medium",
    };
  }

  return null;
}

function checkForFrequencyDecline(
  sortedGifts: GiftData[],
  referenceDate: Date
): PatternCheckResult | null {
  if (sortedGifts.length < 6) {
    return null;
  }

  // Compare gifts in recent 2 years vs prior 2 years
  const twoYearsAgo = new Date(referenceDate);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const fourYearsAgo = new Date(referenceDate);
  fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);

  const recentGifts = sortedGifts.filter(
    (g) => g.date >= twoYearsAgo && g.date <= referenceDate
  );
  const olderGifts = sortedGifts.filter(
    (g) => g.date >= fourYearsAgo && g.date < twoYearsAgo
  );

  if (olderGifts.length >= 4 && recentGifts.length <= 1) {
    return {
      factors: [
        {
          name: "frequency_decline",
          value: `Only ${recentGifts.length} gift(s) in last 2 years compared to ${olderGifts.length} in prior 2 years`,
        },
      ],
      severity: "medium",
    };
  }

  return null;
}

function getGiftIntervals(sortedGifts: GiftData[]): number[] {
  const intervals: number[] = [];
  for (let i = 0; i < sortedGifts.length - 1; i++) {
    const current = sortedGifts[i];
    const next = sortedGifts[i + 1];
    if (current && next) {
      intervals.push(getMonthsDiff(next.date, current.date));
    }
  }
  return intervals;
}

function getMonthsDiff(earlier: Date, later: Date): number {
  const yearDiff = later.getFullYear() - earlier.getFullYear();
  const monthDiff = later.getMonth() - earlier.getMonth();
  return yearDiff * 12 + monthDiff;
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toFixed(0);
}

function generateDescription(
  factors: AnomalyFactor[],
  sortedGifts: GiftData[],
  referenceDate: Date
): string {
  const mostRecentGift = sortedGifts[0];
  const parts: string[] = [];

  if (factors.some((f) => f.name === "lapse_detected")) {
    parts.push("Previously consistent donor showing signs of lapsing.");
  } else if (factors.some((f) => f.name === "missed_cycle")) {
    parts.push("Annual giving cycle may have been disrupted.");
  }

  if (factors.some((f) => f.name === "amount_decline")) {
    parts.push("Gift amounts have declined significantly.");
  }

  if (factors.some((f) => f.name === "frequency_decline")) {
    parts.push("Giving frequency has dropped substantially.");
  }

  if (mostRecentGift) {
    const monthsAgo = getMonthsDiff(mostRecentGift.date, referenceDate);
    parts.push(`Last gift was ${monthsAgo} months ago.`);
  }

  parts.push("Proactive outreach recommended to understand donor circumstances.");

  return parts.join(" ");
}
