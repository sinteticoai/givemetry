// T143: Recency score calculation for priority scoring
/**
 * Priority Recency Factor
 *
 * Measures recent engagement based on gifts and contacts.
 * Higher recency = more engaged = higher priority for continued engagement.
 *
 * Note: This is different from lapse risk recency - that measures time since
 * last gift as a risk indicator. This measures overall engagement recency
 * as a positive prioritization signal.
 */

export interface PriorityRecencyInput {
  gifts: Array<{ date: Date; amount: number }>;
  contacts: Array<{ date: Date; type: string }>;
  referenceDate: Date;
}

export interface PriorityRecencyResult {
  score: number; // 0-1, higher = more recent engagement = higher priority
  description: string;
  recentActivitySummary: string;
  daysSinceLastGift: number | null;
  daysSinceLastContact: number | null;
}

// Weight configuration for recency components
const RECENCY_WEIGHTS = {
  gift: 0.6, // Gifts weighted more heavily
  contact: 0.4, // Contacts weighted less
};

// Recency thresholds (in days)
const RECENCY_THRESHOLDS = {
  veryRecent: 30, // Within last month
  recent: 90, // Within last quarter
  moderate: 180, // Within last 6 months
  old: 365, // Within last year
};

/**
 * Calculate priority recency score based on engagement
 */
export function calculatePriorityRecencyScore(
  input: PriorityRecencyInput
): PriorityRecencyResult {
  const { gifts, contacts, referenceDate } = input;

  // Calculate days since last gift
  const lastGiftDate = gifts.length > 0
    ? new Date(Math.max(...gifts.map(g => g.date.getTime())))
    : null;

  const daysSinceLastGift = lastGiftDate
    ? Math.floor((referenceDate.getTime() - lastGiftDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate days since last contact
  const lastContactDate = contacts.length > 0
    ? new Date(Math.max(...contacts.map(c => c.date.getTime())))
    : null;

  const daysSinceLastContact = lastContactDate
    ? Math.floor((referenceDate.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate individual scores
  const giftRecencyScore = calculateGiftRecencyScore(daysSinceLastGift);
  const contactRecencyScore = calculateContactRecencyScore(daysSinceLastContact);

  // Weighted composite score
  let score: number;

  if (daysSinceLastGift === null && daysSinceLastContact === null) {
    // No engagement at all
    score = 0.1;
  } else if (daysSinceLastGift === null) {
    // Only contacts, no gifts
    score = contactRecencyScore * 0.5; // Reduced since no giving history
  } else if (daysSinceLastContact === null) {
    // Only gifts, no contacts
    score = giftRecencyScore;
  } else {
    // Both gifts and contacts
    score =
      giftRecencyScore * RECENCY_WEIGHTS.gift +
      contactRecencyScore * RECENCY_WEIGHTS.contact;
  }

  // Generate descriptions
  const description = generateRecencyDescription(
    daysSinceLastGift,
    daysSinceLastContact,
    score
  );

  const recentActivitySummary = generateActivitySummary(
    gifts,
    contacts,
    referenceDate
  );

  return {
    score: Math.max(0, Math.min(1, score)),
    description,
    recentActivitySummary,
    daysSinceLastGift,
    daysSinceLastContact,
  };
}

/**
 * Calculate recency score for gifts
 */
function calculateGiftRecencyScore(daysSinceLastGift: number | null): number {
  if (daysSinceLastGift === null) {
    return 0;
  }

  if (daysSinceLastGift <= RECENCY_THRESHOLDS.veryRecent) {
    // Very recent gift - highest score
    return 1.0 - (daysSinceLastGift / RECENCY_THRESHOLDS.veryRecent) * 0.1;
  }

  if (daysSinceLastGift <= RECENCY_THRESHOLDS.recent) {
    // Recent gift
    const t = (daysSinceLastGift - RECENCY_THRESHOLDS.veryRecent) /
      (RECENCY_THRESHOLDS.recent - RECENCY_THRESHOLDS.veryRecent);
    return 0.9 - t * 0.2;
  }

  if (daysSinceLastGift <= RECENCY_THRESHOLDS.moderate) {
    // Moderate recency
    const t = (daysSinceLastGift - RECENCY_THRESHOLDS.recent) /
      (RECENCY_THRESHOLDS.moderate - RECENCY_THRESHOLDS.recent);
    return 0.7 - t * 0.2;
  }

  if (daysSinceLastGift <= RECENCY_THRESHOLDS.old) {
    // Getting stale
    const t = (daysSinceLastGift - RECENCY_THRESHOLDS.moderate) /
      (RECENCY_THRESHOLDS.old - RECENCY_THRESHOLDS.moderate);
    return 0.5 - t * 0.2;
  }

  // Very old - low score but not zero (still a donor)
  const yearsOld = daysSinceLastGift / 365;
  return Math.max(0.1, 0.3 - (yearsOld - 1) * 0.1);
}

/**
 * Calculate recency score for contacts
 */
function calculateContactRecencyScore(daysSinceLastContact: number | null): number {
  if (daysSinceLastContact === null) {
    return 0;
  }

  if (daysSinceLastContact <= RECENCY_THRESHOLDS.veryRecent) {
    return 1.0 - (daysSinceLastContact / RECENCY_THRESHOLDS.veryRecent) * 0.15;
  }

  if (daysSinceLastContact <= RECENCY_THRESHOLDS.recent) {
    const t = (daysSinceLastContact - RECENCY_THRESHOLDS.veryRecent) /
      (RECENCY_THRESHOLDS.recent - RECENCY_THRESHOLDS.veryRecent);
    return 0.85 - t * 0.25;
  }

  if (daysSinceLastContact <= RECENCY_THRESHOLDS.moderate) {
    const t = (daysSinceLastContact - RECENCY_THRESHOLDS.recent) /
      (RECENCY_THRESHOLDS.moderate - RECENCY_THRESHOLDS.recent);
    return 0.6 - t * 0.2;
  }

  if (daysSinceLastContact <= RECENCY_THRESHOLDS.old) {
    const t = (daysSinceLastContact - RECENCY_THRESHOLDS.moderate) /
      (RECENCY_THRESHOLDS.old - RECENCY_THRESHOLDS.moderate);
    return 0.4 - t * 0.2;
  }

  // Very old contact
  return Math.max(0.05, 0.2 - (daysSinceLastContact / 365 - 1) * 0.05);
}

/**
 * Generate human-readable recency description
 */
function generateRecencyDescription(
  daysSinceGift: number | null,
  daysSinceContact: number | null,
  score: number
): string {
  // No engagement at all
  if (daysSinceGift === null && daysSinceContact === null) {
    return "No recorded engagement history";
  }

  // Build description based on most recent engagement
  const parts: string[] = [];

  if (daysSinceGift !== null) {
    if (daysSinceGift <= 30) {
      parts.push(`Gift within last ${daysSinceGift} days`);
    } else if (daysSinceGift <= 90) {
      parts.push(`Gift within last ${Math.round(daysSinceGift / 30)} months`);
    } else if (daysSinceGift <= 365) {
      parts.push(`Gift ${Math.round(daysSinceGift / 30)} months ago`);
    } else {
      const years = Math.round(daysSinceGift / 365 * 10) / 10;
      parts.push(`Last gift ${years} years ago`);
    }
  }

  if (daysSinceContact !== null) {
    if (daysSinceContact <= 30) {
      parts.push(`Contact within last ${daysSinceContact} days`);
    } else if (daysSinceContact <= 90) {
      parts.push(`Contact within last ${Math.round(daysSinceContact / 30)} months`);
    } else if (daysSinceContact <= 365) {
      parts.push(`Contact ${Math.round(daysSinceContact / 30)} months ago`);
    }
  }

  // Add overall assessment
  if (score >= 0.8) {
    return `Recent engagement: ${parts.join("; ")}`;
  } else if (score >= 0.5) {
    return `Moderate engagement: ${parts.join("; ")}`;
  } else {
    return `Stale engagement: ${parts.join("; ")}`;
  }
}

/**
 * Generate activity summary for display
 */
function generateActivitySummary(
  gifts: Array<{ date: Date; amount: number }>,
  contacts: Array<{ date: Date; type: string }>,
  referenceDate: Date
): string {
  const recentMonths = 6;
  const cutoffDate = new Date(referenceDate);
  cutoffDate.setMonth(cutoffDate.getMonth() - recentMonths);

  const recentGifts = gifts.filter(g => g.date >= cutoffDate);
  const recentContacts = contacts.filter(c => c.date >= cutoffDate);

  const parts: string[] = [];

  if (recentGifts.length > 0) {
    const totalAmount = recentGifts.reduce((sum, g) => sum + g.amount, 0);
    parts.push(`${recentGifts.length} gift(s) ($${totalAmount.toLocaleString()})`);
  }

  if (recentContacts.length > 0) {
    parts.push(`${recentContacts.length} contact(s)`);
  }

  if (parts.length === 0) {
    return `No activity in last ${recentMonths} months`;
  }

  return `Last ${recentMonths} months: ${parts.join(", ")}`;
}

/**
 * Get recency category for filtering
 */
export function getRecencyCategory(
  score: number
): "hot" | "warm" | "cool" | "cold" {
  if (score >= 0.8) return "hot";
  if (score >= 0.5) return "warm";
  if (score >= 0.3) return "cool";
  return "cold";
}
