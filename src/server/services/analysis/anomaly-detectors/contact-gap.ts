// T226: Contact gap detector
// Detects extended periods without contact for important donors

export interface ContactData {
  date: Date;
  type: string;
}

export interface GiftData {
  amount: number;
  date: Date;
}

export interface ContactGapInput {
  constituentId: string;
  contacts: ContactData[];
  gifts: GiftData[];
  referenceDate: Date;
  estimatedCapacity?: number | null;
  portfolioTier?: string | null;
}

export interface AnomalyFactor {
  name: string;
  value: string;
}

export interface ContactGapResult {
  constituentId: string;
  type: "contact_gap";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  factors: AnomalyFactor[];
  detectedAt: Date;
}

// Contact gap thresholds by donor tier (in months)
const CONTACT_THRESHOLDS = {
  major: 6, // Major donors: contact every 6 months
  principal: 9, // Principal gift prospects: every 9 months
  leadership: 12, // Leadership giving: every 12 months
  regular: 18, // Regular donors: every 18 months
};

// Capacity thresholds for tier determination
const CAPACITY_THRESHOLDS = {
  major: 100000, // $100K+
  principal: 25000, // $25K+
  leadership: 10000, // $10K+
};

/**
 * Detects contact gaps based on donor importance
 * Higher-value donors have stricter contact requirements
 */
export function detectContactGap(
  input: ContactGapInput
): ContactGapResult | null {
  const {
    constituentId,
    contacts,
    gifts,
    referenceDate,
    estimatedCapacity,
    portfolioTier,
  } = input;

  // Determine donor tier
  const tier = determineTier(estimatedCapacity, portfolioTier, gifts);
  const threshold = getThresholdForTier(tier);

  // Find most recent contact
  const sortedContacts = [...contacts].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
  const mostRecentContact = sortedContacts[0];

  // Calculate months since last contact
  let monthsSinceContact: number;
  let hasNoContacts = false;

  if (!mostRecentContact) {
    // No contact history - use gift history to determine if this is a concern
    const hasSignificantGifts = gifts.some((g) => g.amount >= 1000);
    if (!hasSignificantGifts && !estimatedCapacity) {
      // Not a significant donor with no contacts - not an alert
      return null;
    }
    hasNoContacts = true;
    // Use the earliest gift date as reference, or 24 months as default
    const sortedGifts = [...gifts].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    const firstGiftDate = sortedGifts[0]?.date;
    if (firstGiftDate) {
      monthsSinceContact = getMonthsDiff(firstGiftDate, referenceDate);
    } else {
      return null;
    }
  } else {
    monthsSinceContact = getMonthsDiff(mostRecentContact.date, referenceDate);
  }

  // Check if gap exceeds threshold
  if (monthsSinceContact < threshold) {
    return null;
  }

  const factors: AnomalyFactor[] = [];
  let severity: "high" | "medium" | "low" = "medium";

  // Build factors based on context
  if (hasNoContacts) {
    factors.push({
      name: "no_contact_history",
      value: "No contact records found for this donor",
    });
  } else {
    factors.push({
      name: "last_contact",
      value: `${monthsSinceContact} months since last contact (${formatContactType(mostRecentContact!.type)})`,
    });
  }

  factors.push({
    name: "donor_tier",
    value: getTierDescription(tier),
  });

  factors.push({
    name: "expected_frequency",
    value: `${tier} donors should be contacted at least every ${threshold} months`,
  });

  // Determine severity based on tier and gap length
  if (tier === "major" || tier === "principal") {
    severity = monthsSinceContact >= threshold * 1.5 ? "high" : "medium";
  } else {
    severity = monthsSinceContact >= threshold * 2 ? "medium" : "low";
  }

  // Add lifetime giving context
  const lifetimeGiving = gifts.reduce((sum, g) => sum + g.amount, 0);
  if (lifetimeGiving > 0) {
    factors.push({
      name: "lifetime_giving",
      value: `$${formatAmount(lifetimeGiving)} lifetime giving`,
    });
    if (lifetimeGiving >= 50000) {
      severity = "high";
    }
  }

  // Add capacity context
  if (estimatedCapacity && estimatedCapacity >= 50000) {
    factors.push({
      name: "capacity",
      value: `Estimated capacity: $${formatAmount(estimatedCapacity)}`,
    });
    severity = "high";
  }

  return {
    constituentId,
    type: "contact_gap",
    severity,
    title: generateTitle(tier, monthsSinceContact, hasNoContacts),
    description: generateDescription(factors, tier, monthsSinceContact),
    factors,
    detectedAt: referenceDate,
  };
}

type DonorTier = "major" | "principal" | "leadership" | "regular";

function determineTier(
  estimatedCapacity: number | null | undefined,
  portfolioTier: string | null | undefined,
  gifts: GiftData[]
): DonorTier {
  // Use explicit portfolio tier if available
  if (portfolioTier) {
    const normalizedTier = portfolioTier.toLowerCase();
    if (normalizedTier.includes("major")) return "major";
    if (normalizedTier.includes("principal")) return "principal";
    if (normalizedTier.includes("leadership")) return "leadership";
  }

  // Use estimated capacity
  if (estimatedCapacity) {
    if (estimatedCapacity >= CAPACITY_THRESHOLDS.major) return "major";
    if (estimatedCapacity >= CAPACITY_THRESHOLDS.principal) return "principal";
    if (estimatedCapacity >= CAPACITY_THRESHOLDS.leadership) return "leadership";
  }

  // Use giving history as fallback
  const maxGift = Math.max(...gifts.map((g) => g.amount), 0);
  const totalGiving = gifts.reduce((sum, g) => sum + g.amount, 0);

  if (maxGift >= 25000 || totalGiving >= 100000) return "major";
  if (maxGift >= 10000 || totalGiving >= 50000) return "principal";
  if (maxGift >= 5000 || totalGiving >= 25000) return "leadership";

  return "regular";
}

function getThresholdForTier(tier: DonorTier): number {
  return CONTACT_THRESHOLDS[tier];
}

function getTierDescription(tier: DonorTier): string {
  switch (tier) {
    case "major":
      return "Major gift prospect ($100K+ capacity)";
    case "principal":
      return "Principal gift prospect ($25K+ capacity)";
    case "leadership":
      return "Leadership giving prospect ($10K+ capacity)";
    default:
      return "Regular donor";
  }
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

function formatContactType(type: string): string {
  const typeMap: Record<string, string> = {
    meeting: "in-person meeting",
    call: "phone call",
    email: "email",
    event: "event attendance",
    letter: "letter/mail",
  };
  return typeMap[type.toLowerCase()] || type;
}

function generateTitle(
  tier: DonorTier,
  _monthsSinceContact: number,
  hasNoContacts: boolean
): string {
  if (hasNoContacts) {
    return `No contact history for ${tier} donor`;
  }

  if (tier === "major" || tier === "principal") {
    return `${tier === "major" ? "Major" : "Principal"} donor contact overdue`;
  }

  return `Contact gap detected for ${tier} donor`;
}

function generateDescription(
  factors: AnomalyFactor[],
  tier: DonorTier,
  monthsSinceContact: number
): string {
  const parts: string[] = [];

  if (tier === "major" || tier === "principal") {
    parts.push(
      `This ${tier} gift prospect has not been contacted in ${monthsSinceContact} months.`
    );
  } else {
    parts.push(`Extended period without donor contact (${monthsSinceContact} months).`);
  }

  const capacityFactor = factors.find((f) => f.name === "capacity");
  const lifetimeFactor = factors.find((f) => f.name === "lifetime_giving");

  if (capacityFactor) {
    parts.push(`${capacityFactor.value}.`);
  } else if (lifetimeFactor) {
    parts.push(`${lifetimeFactor.value}.`);
  }

  parts.push("Schedule outreach to maintain relationship and prevent lapse.");

  return parts.join(" ");
}
