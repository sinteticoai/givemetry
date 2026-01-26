// T140: Capacity score calculation for priority scoring
/**
 * Capacity Factor
 *
 * Measures estimated giving capacity based on wealth indicators.
 * Higher capacity donors are prioritized for gift officer attention.
 * Based on research.md scoring model.
 */

export interface CapacityInput {
  estimatedCapacity: number | null;
  source?: string | null;
}

export interface CapacityResult {
  score: number; // 0-1, higher = higher capacity = higher priority
  label: string;
  description: string;
}

// Capacity thresholds and scores (from research.md)
const CAPACITY_TIERS = [
  { min: 1000000, score: 1.0, label: "$1M+" },
  { min: 500000, score: 0.9, label: "$500K-$1M" },
  { min: 250000, score: 0.8, label: "$250K-$500K" },
  { min: 100000, score: 0.7, label: "$100K-$250K" },
  { min: 50000, score: 0.6, label: "$50K-$100K" },
  { min: 25000, score: 0.5, label: "$25K-$50K" },
  { min: 10000, score: 0.4, label: "$10K-$25K" },
  { min: 0, score: 0.3, label: "<$10K" },
];

const UNKNOWN_CAPACITY_SCORE = 0.5; // Neutral score for unknown capacity

/**
 * Calculate capacity score based on estimated giving capacity
 */
export function calculateCapacityScore(input: CapacityInput): CapacityResult {
  // Handle null/undefined capacity
  if (input.estimatedCapacity === null || input.estimatedCapacity === undefined) {
    return {
      score: UNKNOWN_CAPACITY_SCORE,
      label: "Unknown",
      description: "Unknown capacity - no wealth data available",
    };
  }

  // Find the appropriate tier
  for (const tier of CAPACITY_TIERS) {
    if (input.estimatedCapacity >= tier.min) {
      const sourceNote = input.source ? ` (via ${input.source})` : "";
      return {
        score: tier.score,
        label: tier.label,
        description: `${tier.label} estimated capacity${sourceNote}`,
      };
    }
  }

  // Fallback for negative values (shouldn't happen, but be safe)
  return {
    score: 0.3,
    label: "<$10K",
    description: "Low estimated capacity",
  };
}

/**
 * Format capacity for display
 */
export function formatCapacity(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return "Unknown";
  }

  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }

  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }

  return `$${amount.toFixed(0)}`;
}

/**
 * Get capacity tier label for a given amount
 */
export function getCapacityTier(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return "unknown";
  }

  for (const tier of CAPACITY_TIERS) {
    if (amount >= tier.min) {
      return tier.label.toLowerCase().replace(/[^a-z0-9]/g, "_");
    }
  }

  return "low";
}
