// T224: Engagement spike detector
// Detects unusual increases in giving frequency or amounts

export interface GiftData {
  amount: number;
  date: Date;
}

export interface EngagementSpikeInput {
  constituentId: string;
  gifts: GiftData[];
  referenceDate: Date;
}

export interface AnomalyFactor {
  name: string;
  value: string;
}

export interface EngagementSpikeResult {
  constituentId: string;
  type: "engagement_spike";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  factors: AnomalyFactor[];
  detectedAt: Date;
}

// Configuration
const RECENT_WINDOW_MONTHS = 3;
const BASELINE_WINDOW_MONTHS = 12;
const FREQUENCY_SPIKE_THRESHOLD = 1.5; // 1.5x increase (more sensitive)
const AMOUNT_SPIKE_THRESHOLD = 2.0; // 2x increase (more sensitive)

/**
 * Detects engagement spikes in giving patterns
 * - Sudden increase in gift frequency
 * - Significant increase in gift amounts
 */
export function detectEngagementSpike(
  input: EngagementSpikeInput
): EngagementSpikeResult | null {
  const { constituentId, gifts, referenceDate } = input;

  // Need at least 2 gifts total to detect a spike
  if (gifts.length < 2) {
    return null;
  }

  const recentWindowStart = new Date(referenceDate);
  recentWindowStart.setMonth(recentWindowStart.getMonth() - RECENT_WINDOW_MONTHS);

  const baselineWindowStart = new Date(referenceDate);
  baselineWindowStart.setMonth(baselineWindowStart.getMonth() - BASELINE_WINDOW_MONTHS);

  // Split gifts into recent and baseline periods
  const recentGifts = gifts.filter(
    (g) => g.date >= recentWindowStart && g.date <= referenceDate
  );
  const baselineGifts = gifts.filter(
    (g) => g.date >= baselineWindowStart && g.date < recentWindowStart
  );

  // If there are no baseline gifts but we have recent gifts, that could still be a spike
  // compared to having no prior activity
  if (baselineGifts.length === 0 && recentGifts.length === 0) {
    return null;
  }

  const factors: AnomalyFactor[] = [];
  let hasSpike = false;
  let severity: "high" | "medium" | "low" = "low";

  // Check frequency spike
  const recentFrequency = recentGifts.length / RECENT_WINDOW_MONTHS;
  const baselineMonths = BASELINE_WINDOW_MONTHS - RECENT_WINDOW_MONTHS;
  const baselineFrequency = baselineGifts.length > 0
    ? baselineGifts.length / baselineMonths
    : 0;

  // Spike if recent frequency is significantly higher, or if baseline had no gifts
  // and we now have multiple recent gifts
  if (
    (baselineFrequency > 0 && recentFrequency / baselineFrequency >= FREQUENCY_SPIKE_THRESHOLD) ||
    (baselineGifts.length <= 1 && recentGifts.length >= 3)
  ) {
    const increasePercent = Math.round((recentFrequency / baselineFrequency - 1) * 100);
    factors.push({
      name: "gift_frequency_increase",
      value: `${increasePercent}% increase in gift frequency (${recentGifts.length} gifts in last ${RECENT_WINDOW_MONTHS} months vs ${baselineGifts.length} in prior ${BASELINE_WINDOW_MONTHS - RECENT_WINDOW_MONTHS} months)`,
    });
    hasSpike = true;
    severity = "medium";
  }

  // Check amount spike
  const recentAvgAmount =
    recentGifts.length > 0
      ? recentGifts.reduce((sum, g) => sum + g.amount, 0) / recentGifts.length
      : 0;
  const baselineAvgAmount =
    baselineGifts.reduce((sum, g) => sum + g.amount, 0) / baselineGifts.length;

  if (
    baselineAvgAmount > 0 &&
    recentAvgAmount > 0 &&
    recentAvgAmount / baselineAvgAmount >= AMOUNT_SPIKE_THRESHOLD
  ) {
    factors.push({
      name: "gift_amount_increase",
      value: `Average gift increased from $${formatAmount(baselineAvgAmount)} to $${formatAmount(recentAvgAmount)}`,
    });
    hasSpike = true;
    severity = recentAvgAmount >= 10000 ? "high" : "medium";
  }

  // Check for single large gift compared to historical giving
  const maxRecentGift = Math.max(...recentGifts.map((g) => g.amount), 0);
  const maxBaselineGift = Math.max(...baselineGifts.map((g) => g.amount), 0);

  if (
    maxBaselineGift > 0 &&
    maxRecentGift > 0 &&
    maxRecentGift / maxBaselineGift >= AMOUNT_SPIKE_THRESHOLD
  ) {
    factors.push({
      name: "large_gift",
      value: `Recent gift of $${formatAmount(maxRecentGift)} is significantly larger than previous maximum of $${formatAmount(maxBaselineGift)}`,
    });
    hasSpike = true;
    if (maxRecentGift >= 25000) {
      severity = "high";
    }
  }

  if (!hasSpike) {
    return null;
  }

  return {
    constituentId,
    type: "engagement_spike",
    severity,
    title: "Unusual engagement increase detected",
    description: generateDescription(factors, recentGifts, baselineGifts),
    factors,
    detectedAt: referenceDate,
  };
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
  recentGifts: GiftData[],
  baselineGifts: GiftData[]
): string {
  const recentTotal = recentGifts.reduce((sum, g) => sum + g.amount, 0);
  const baselineTotal = baselineGifts.reduce((sum, g) => sum + g.amount, 0);

  const parts = [
    `Recent giving activity shows significant increase.`,
    `$${formatAmount(recentTotal)} given in last ${RECENT_WINDOW_MONTHS} months`,
    `compared to $${formatAmount(baselineTotal)} in prior ${BASELINE_WINDOW_MONTHS - RECENT_WINDOW_MONTHS} months.`,
  ];

  if (factors.some((f) => f.name === "large_gift")) {
    parts.push("This may indicate increased capacity or engagement.");
  }

  return parts.join(" ");
}
