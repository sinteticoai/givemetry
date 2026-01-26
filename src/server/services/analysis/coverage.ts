// T106: Coverage scoring service
// Calculates data coverage scores based on portfolio assignment and contact coverage

export interface CoverageResult {
  score: number;
  portfolioScore: number;
  contactScore: number;
  giftScore: number;
  issues: CoverageIssue[];
}

export interface CoverageIssue {
  type: "unassigned_constituents" | "no_contacts" | "no_gifts" | "unbalanced_portfolios";
  severity: "high" | "medium" | "low";
  message: string;
  count?: number;
  percentage?: number;
}

// Coverage weights
const COVERAGE_WEIGHTS = {
  portfolio: 0.35,
  contact: 0.35,
  gift: 0.30,
};

// Thresholds for coverage scoring
const COVERAGE_THRESHOLDS = {
  portfolio: {
    excellent: 0.95, // 95%+ assigned
    good: 0.80, // 80%+ assigned
    fair: 0.60, // 60%+ assigned
  },
  contact: {
    excellent: 0.80, // 80%+ have contacts
    good: 0.60, // 60%+ have contacts
    fair: 0.40, // 40%+ have contacts
  },
  gift: {
    excellent: 0.90, // 90%+ have gifts
    good: 0.70, // 70%+ have gifts
    fair: 0.50, // 50%+ have gifts
  },
};

/**
 * Calculate portfolio coverage score
 * Based on percentage of constituents assigned to gift officers
 */
export function calculatePortfolioCoverage(stats: {
  totalConstituents: number;
  assignedConstituents: number;
}): number {
  if (stats.totalConstituents === 0) return 1.0;

  const coverage = stats.assignedConstituents / stats.totalConstituents;

  if (coverage >= COVERAGE_THRESHOLDS.portfolio.excellent) return 1.0;
  if (coverage >= COVERAGE_THRESHOLDS.portfolio.good) {
    const range = COVERAGE_THRESHOLDS.portfolio.excellent - COVERAGE_THRESHOLDS.portfolio.good;
    const position = coverage - COVERAGE_THRESHOLDS.portfolio.good;
    return 0.8 + (0.2 * position) / range;
  }
  if (coverage >= COVERAGE_THRESHOLDS.portfolio.fair) {
    const range = COVERAGE_THRESHOLDS.portfolio.good - COVERAGE_THRESHOLDS.portfolio.fair;
    const position = coverage - COVERAGE_THRESHOLDS.portfolio.fair;
    return 0.5 + (0.3 * position) / range;
  }
  // Below fair threshold
  return Math.max(0.1, coverage / COVERAGE_THRESHOLDS.portfolio.fair * 0.5);
}

/**
 * Calculate contact coverage score
 * Based on percentage of constituents with at least one contact record
 */
export function calculateContactCoverage(stats: {
  totalConstituents: number;
  constituentsWithContacts: number;
}): number {
  if (stats.totalConstituents === 0) return 1.0;

  const coverage = stats.constituentsWithContacts / stats.totalConstituents;

  if (coverage >= COVERAGE_THRESHOLDS.contact.excellent) return 1.0;
  if (coverage >= COVERAGE_THRESHOLDS.contact.good) {
    const range = COVERAGE_THRESHOLDS.contact.excellent - COVERAGE_THRESHOLDS.contact.good;
    const position = coverage - COVERAGE_THRESHOLDS.contact.good;
    return 0.8 + (0.2 * position) / range;
  }
  if (coverage >= COVERAGE_THRESHOLDS.contact.fair) {
    const range = COVERAGE_THRESHOLDS.contact.good - COVERAGE_THRESHOLDS.contact.fair;
    const position = coverage - COVERAGE_THRESHOLDS.contact.fair;
    return 0.5 + (0.3 * position) / range;
  }
  // Below fair threshold
  return Math.max(0.1, coverage / COVERAGE_THRESHOLDS.contact.fair * 0.5);
}

/**
 * Calculate gift coverage score
 * Based on percentage of constituents with at least one gift record
 */
export function calculateGiftCoverage(stats: {
  totalConstituents: number;
  constituentsWithGifts: number;
}): number {
  if (stats.totalConstituents === 0) return 1.0;

  const coverage = stats.constituentsWithGifts / stats.totalConstituents;

  if (coverage >= COVERAGE_THRESHOLDS.gift.excellent) return 1.0;
  if (coverage >= COVERAGE_THRESHOLDS.gift.good) {
    const range = COVERAGE_THRESHOLDS.gift.excellent - COVERAGE_THRESHOLDS.gift.good;
    const position = coverage - COVERAGE_THRESHOLDS.gift.good;
    return 0.8 + (0.2 * position) / range;
  }
  if (coverage >= COVERAGE_THRESHOLDS.gift.fair) {
    const range = COVERAGE_THRESHOLDS.gift.good - COVERAGE_THRESHOLDS.gift.fair;
    const position = coverage - COVERAGE_THRESHOLDS.gift.fair;
    return 0.5 + (0.3 * position) / range;
  }
  // Below fair threshold
  return Math.max(0.1, coverage / COVERAGE_THRESHOLDS.gift.fair * 0.5);
}

/**
 * Calculate overall coverage score
 */
export function calculateCoverageScore(stats: {
  totalConstituents: number;
  assignedConstituents: number;
  constituentsWithContacts: number;
  constituentsWithGifts: number;
}): CoverageResult {
  const issues: CoverageIssue[] = [];

  const portfolioScore = calculatePortfolioCoverage({
    totalConstituents: stats.totalConstituents,
    assignedConstituents: stats.assignedConstituents,
  });

  const contactScore = calculateContactCoverage({
    totalConstituents: stats.totalConstituents,
    constituentsWithContacts: stats.constituentsWithContacts,
  });

  const giftScore = calculateGiftCoverage({
    totalConstituents: stats.totalConstituents,
    constituentsWithGifts: stats.constituentsWithGifts,
  });

  // Generate issues
  const unassignedCount = stats.totalConstituents - stats.assignedConstituents;
  const unassignedPercent = stats.totalConstituents > 0
    ? (unassignedCount / stats.totalConstituents) * 100
    : 0;

  if (unassignedPercent > 20) {
    issues.push({
      type: "unassigned_constituents",
      severity: unassignedPercent > 50 ? "high" : "medium",
      message: `${unassignedCount} constituents (${unassignedPercent.toFixed(1)}%) are not assigned to a gift officer`,
      count: unassignedCount,
      percentage: unassignedPercent,
    });
  }

  const noContactsCount = stats.totalConstituents - stats.constituentsWithContacts;
  const noContactsPercent = stats.totalConstituents > 0
    ? (noContactsCount / stats.totalConstituents) * 100
    : 0;

  if (noContactsPercent > 40) {
    issues.push({
      type: "no_contacts",
      severity: noContactsPercent > 70 ? "high" : "medium",
      message: `${noContactsCount} constituents (${noContactsPercent.toFixed(1)}%) have no contact records`,
      count: noContactsCount,
      percentage: noContactsPercent,
    });
  }

  const noGiftsCount = stats.totalConstituents - stats.constituentsWithGifts;
  const noGiftsPercent = stats.totalConstituents > 0
    ? (noGiftsCount / stats.totalConstituents) * 100
    : 0;

  if (noGiftsPercent > 30) {
    issues.push({
      type: "no_gifts",
      severity: noGiftsPercent > 60 ? "medium" : "low",
      message: `${noGiftsCount} constituents (${noGiftsPercent.toFixed(1)}%) have no gift records`,
      count: noGiftsCount,
      percentage: noGiftsPercent,
    });
  }

  // Calculate overall score
  const score =
    portfolioScore * COVERAGE_WEIGHTS.portfolio +
    contactScore * COVERAGE_WEIGHTS.contact +
    giftScore * COVERAGE_WEIGHTS.gift;

  return {
    score,
    portfolioScore,
    contactScore,
    giftScore,
    issues,
  };
}

/**
 * Analyze portfolio balance across gift officers
 */
export function analyzePortfolioBalance(officers: Array<{
  id: string;
  name: string | null;
  constituentCount: number;
}>): {
  isBalanced: boolean;
  averagePortfolioSize: number;
  minPortfolioSize: number;
  maxPortfolioSize: number;
  standardDeviation: number;
  issues: CoverageIssue[];
} {
  if (officers.length === 0) {
    return {
      isBalanced: true,
      averagePortfolioSize: 0,
      minPortfolioSize: 0,
      maxPortfolioSize: 0,
      standardDeviation: 0,
      issues: [],
    };
  }

  const counts = officers.map((o) => o.constituentCount);
  const total = counts.reduce((a, b) => a + b, 0);
  const average = total / counts.length;

  const minSize = Math.min(...counts);
  const maxSize = Math.max(...counts);

  // Calculate standard deviation
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);

  // Check for imbalance (coefficient of variation > 0.5)
  const cv = average > 0 ? stdDev / average : 0;
  const isBalanced = cv < 0.5;

  const issues: CoverageIssue[] = [];

  if (!isBalanced && officers.length > 1) {
    const overloadedOfficers = officers.filter((o) => o.constituentCount > average * 1.5);
    const underutilizedOfficers = officers.filter((o) => o.constituentCount < average * 0.5);

    if (overloadedOfficers.length > 0 || underutilizedOfficers.length > 0) {
      issues.push({
        type: "unbalanced_portfolios",
        severity: cv > 0.8 ? "high" : "medium",
        message: `Portfolio sizes vary significantly (${minSize} to ${maxSize} constituents). Consider rebalancing.`,
        count: overloadedOfficers.length + underutilizedOfficers.length,
      });
    }
  }

  return {
    isBalanced,
    averagePortfolioSize: average,
    minPortfolioSize: minSize,
    maxPortfolioSize: maxSize,
    standardDeviation: stdDev,
    issues,
  };
}

/**
 * Calculate tier coverage (major/principal/leadership gift prospects)
 */
export function calculateTierCoverage(constituents: Array<{
  portfolioTier: string | null;
  assignedOfficerId: string | null;
}>): {
  majorGiftCoverage: number;
  principalGiftCoverage: number;
  leadershipGiftCoverage: number;
  issues: CoverageIssue[];
} {
  const tiers = {
    major: { total: 0, assigned: 0 },
    principal: { total: 0, assigned: 0 },
    leadership: { total: 0, assigned: 0 },
  };

  for (const constituent of constituents) {
    const tier = constituent.portfolioTier?.toLowerCase();
    if (tier && tier in tiers) {
      tiers[tier as keyof typeof tiers].total++;
      if (constituent.assignedOfficerId) {
        tiers[tier as keyof typeof tiers].assigned++;
      }
    }
  }

  const calcCoverage = (tier: { total: number; assigned: number }) =>
    tier.total > 0 ? tier.assigned / tier.total : 1.0;

  const issues: CoverageIssue[] = [];

  // Check for unassigned major gift prospects
  const unassignedMajor = tiers.major.total - tiers.major.assigned;
  if (unassignedMajor > 0) {
    issues.push({
      type: "unassigned_constituents",
      severity: "high",
      message: `${unassignedMajor} major gift prospects are not assigned to a gift officer`,
      count: unassignedMajor,
    });
  }

  // Check for unassigned principal gift prospects
  const unassignedPrincipal = tiers.principal.total - tiers.principal.assigned;
  if (unassignedPrincipal > 0) {
    issues.push({
      type: "unassigned_constituents",
      severity: "high",
      message: `${unassignedPrincipal} principal gift prospects are not assigned to a gift officer`,
      count: unassignedPrincipal,
    });
  }

  return {
    majorGiftCoverage: calcCoverage(tiers.major),
    principalGiftCoverage: calcCoverage(tiers.principal),
    leadershipGiftCoverage: calcCoverage(tiers.leadership),
    issues,
  };
}
