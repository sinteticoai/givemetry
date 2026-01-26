// T123: Contact factor scoring for lapse risk
/**
 * Contact Factor
 *
 * Measures relationship health through contact patterns.
 * Lack of contact increases lapse risk.
 */

export interface ContactInput {
  contacts: Array<{
    date: Date;
    type: string;
    outcome?: string;
  }>;
  referenceDate: Date;
  windowYears?: number;
}

export interface ContactResult {
  score: number; // 0-1, higher = more risk
  daysSinceLastContact: number | null;
  monthsSinceLastContact: number | null;
  contactsLast12Months: number;
  hasPositiveOutcome: boolean;
  description: string;
}

// Contact type weights (some contact types are more meaningful)
const CONTACT_TYPE_WEIGHTS: Record<string, number> = {
  meeting: 1.0,
  visit: 1.0,
  call: 0.8,
  video: 0.8,
  email: 0.5,
  letter: 0.6,
  event: 0.7,
  other: 0.4,
};

// Outcome impact on risk
const OUTCOME_IMPACT: Record<string, number> = {
  positive: -0.15, // Reduces risk
  neutral: 0,
  negative: 0.1, // Increases risk
  no_response: 0.05,
};

/**
 * Calculate contact score based on relationship activity
 */
export function calculateContactScore(input: ContactInput): ContactResult {
  if (input.contacts.length === 0) {
    return {
      score: 0.75, // High risk but not maximum
      daysSinceLastContact: null,
      monthsSinceLastContact: null,
      contactsLast12Months: 0,
      hasPositiveOutcome: false,
      description: "No contact history recorded",
    };
  }

  // Find most recent contact
  const sortedContacts = [...input.contacts].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
  const lastContactDate = sortedContacts[0]!.date;

  const daysSince = Math.floor(
    (input.referenceDate.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const monthsSince = daysSince / 30.44;

  // Count contacts in last 12 months
  const oneYearAgo = new Date(input.referenceDate.getTime() - 365 * 24 * 60 * 60 * 1000);
  const recentContacts = input.contacts.filter(c => c.date >= oneYearAgo);

  // Check for positive outcomes
  const hasPositiveOutcome = input.contacts.some(
    c => c.outcome?.toLowerCase() === "positive"
  );

  // Calculate base score from recency
  let score = calculateContactRecencyScore(monthsSince);

  // Adjust for contact frequency (weighted by type)
  const weightedContactScore = calculateWeightedContactScore(recentContacts);
  score = adjustScoreForFrequency(score, weightedContactScore);

  // Adjust for outcomes
  for (const contact of recentContacts) {
    const outcomeKey = (contact.outcome?.toLowerCase() || "neutral") as keyof typeof OUTCOME_IMPACT;
    const impact = OUTCOME_IMPACT[outcomeKey] || 0;
    score = Math.min(1, Math.max(0, score + impact));
  }

  const description = getContactDescription(monthsSince, recentContacts.length, hasPositiveOutcome);

  return {
    score: Math.round(score * 100) / 100,
    daysSinceLastContact: daysSince,
    monthsSinceLastContact: Math.round(monthsSince * 10) / 10,
    contactsLast12Months: recentContacts.length,
    hasPositiveOutcome,
    description,
  };
}

/**
 * Calculate score from months since last contact
 */
function calculateContactRecencyScore(months: number): number {
  if (months <= 0) return 0;

  // Piecewise linear scoring
  if (months <= 3) {
    return months / 3 * 0.2; // 0-3 months: 0-0.2
  } else if (months <= 6) {
    return 0.2 + ((months - 3) / 3) * 0.15; // 3-6 months: 0.2-0.35
  } else if (months <= 12) {
    return 0.35 + ((months - 6) / 6) * 0.25; // 6-12 months: 0.35-0.6
  } else if (months <= 18) {
    return 0.6 + ((months - 12) / 6) * 0.2; // 12-18 months: 0.6-0.8
  } else {
    // Beyond 18 months: approaches 1.0
    const excess = Math.min(12, months - 18);
    return 0.8 + (excess / 12) * 0.2;
  }
}

/**
 * Calculate weighted contact score based on contact types
 */
function calculateWeightedContactScore(
  contacts: Array<{ type: string }>
): number {
  if (contacts.length === 0) return 0;

  let totalWeight = 0;
  for (const contact of contacts) {
    const typeKey = contact.type?.toLowerCase() || "other";
    const weight = CONTACT_TYPE_WEIGHTS[typeKey] ?? CONTACT_TYPE_WEIGHTS.other ?? 0.4;
    totalWeight += weight;
  }

  // Normalize: 3+ weighted contacts = good engagement
  return Math.min(1, totalWeight / 3);
}

/**
 * Adjust recency score based on contact frequency
 */
function adjustScoreForFrequency(recencyScore: number, frequencyScore: number): number {
  // High frequency can partially compensate for recency
  // Low frequency amplifies recency risk
  if (frequencyScore >= 0.8) {
    return recencyScore * 0.8; // 20% reduction for very active relationship
  } else if (frequencyScore >= 0.5) {
    return recencyScore * 0.9; // 10% reduction for active relationship
  } else if (frequencyScore >= 0.25) {
    return recencyScore; // No adjustment for moderate activity
  } else {
    return Math.min(1, recencyScore * 1.1); // 10% increase for low activity
  }
}

/**
 * Generate human-readable description
 */
function getContactDescription(
  months: number | null,
  recentCount: number,
  hasPositive: boolean
): string {
  let recencyPart: string;
  if (months === null) {
    recencyPart = "No contact recorded";
  } else if (months < 1) {
    recencyPart = "Recent contact";
  } else if (months < 3) {
    recencyPart = `${Math.round(months)} months since contact`;
  } else if (months < 12) {
    recencyPart = `${Math.round(months)} months since contact`;
  } else {
    const years = Math.round(months / 12 * 10) / 10;
    recencyPart = `${years} years since contact`;
  }

  let frequencyPart: string;
  if (recentCount === 0) {
    frequencyPart = "no recent outreach";
  } else if (recentCount === 1) {
    frequencyPart = "1 contact this year";
  } else if (recentCount <= 3) {
    frequencyPart = `${recentCount} contacts this year`;
  } else {
    frequencyPart = "active engagement";
  }

  const outcomePart = hasPositive ? " (positive response)" : "";

  return `${recencyPart}, ${frequencyPart}${outcomePart}`;
}

/**
 * Analyze contact patterns over time
 */
export function analyzeContactPatterns(
  contacts: Array<{ date: Date; type: string; outcome?: string }>,
  referenceDate: Date
): {
  contactsByQuarter: number[];
  dominantType: string | null;
  positiveOutcomeRate: number;
  consistency: number;
} {
  if (contacts.length === 0) {
    return {
      contactsByQuarter: [0, 0, 0, 0],
      dominantType: null,
      positiveOutcomeRate: 0,
      consistency: 0,
    };
  }

  // Count contacts by quarter (last 4 quarters)
  const contactsByQuarter = [0, 0, 0, 0];
  const typeCounts: Record<string, number> = {};
  let positiveCount = 0;

  for (const contact of contacts) {
    const quarterAge = Math.floor(
      (referenceDate.getTime() - contact.date.getTime()) / (90 * 24 * 60 * 60 * 1000)
    );
    if (quarterAge >= 0 && quarterAge < 4) {
      contactsByQuarter[quarterAge] = (contactsByQuarter[quarterAge] ?? 0) + 1;
    }

    const type = contact.type?.toLowerCase() || "other";
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    if (contact.outcome?.toLowerCase() === "positive") {
      positiveCount++;
    }
  }

  // Find dominant type
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const dominantEntry = sortedTypes[0];
  const dominantType = dominantEntry ? dominantEntry[0] : null;

  // Calculate positive outcome rate
  const outcomesWithValue = contacts.filter(c => c.outcome).length;
  const positiveOutcomeRate = outcomesWithValue > 0 ? positiveCount / outcomesWithValue : 0;

  // Calculate consistency (how evenly distributed across quarters)
  const totalInQuarters = contactsByQuarter.reduce((a, b) => a + b, 0);
  if (totalInQuarters === 0) {
    return {
      contactsByQuarter,
      dominantType,
      positiveOutcomeRate,
      consistency: 0,
    };
  }

  const avgPerQuarter = totalInQuarters / 4;
  const variance = contactsByQuarter.reduce(
    (sum, q) => sum + Math.pow(q - avgPerQuarter, 2), 0
  ) / 4;
  const stdDev = Math.sqrt(variance);
  const consistency = avgPerQuarter > 0 ? Math.max(0, 1 - stdDev / avgPerQuarter) : 0;

  return {
    contactsByQuarter,
    dominantType,
    positiveOutcomeRate: Math.round(positiveOutcomeRate * 100) / 100,
    consistency: Math.round(consistency * 100) / 100,
  };
}
