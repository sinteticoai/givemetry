// T237: Portfolio metrics calculator service
/**
 * Portfolio Metrics Service
 *
 * Calculates portfolio distribution metrics for gift officers including:
 * - Constituent counts and capacity totals
 * - Portfolio size distribution and balance
 * - Workload scoring based on priority and risk
 */

export interface ConstituentData {
  id: string;
  estimatedCapacity: number | null;
  priorityScore: number | null;
  lapseRiskScore: number | null;
}

export interface OfficerPortfolio {
  officerId: string;
  officerName: string | null;
  constituents: ConstituentData[];
}

export interface OfficerMetrics {
  officerId: string;
  officerName: string | null;
  constituentCount: number;
  totalCapacity: number;
  averageCapacity: number;
  averagePriorityScore: number;
  averageLapseRiskScore: number;
  highPriorityCount: number;
  highRiskCount: number;
  workloadScore: number;
}

export interface PortfolioMetricsInput {
  officers: OfficerPortfolio[];
  unassignedConstituents: ConstituentData[];
  organizationId: string;
}

export interface CapacityTier {
  label: string;
  minAmount: number;
  maxAmount: number | null;
  count: number;
  totalCapacity: number;
}

export interface PortfolioDistribution {
  minSize: number;
  maxSize: number;
  medianSize: number;
  averageSize: number;
  standardDeviation: number;
  coefficientOfVariation: number;
}

export interface PortfolioMetricsResult {
  totalConstituents: number;
  assignedConstituents: number;
  unassignedConstituents: number;
  totalOfficers: number;
  totalCapacity: number;
  assignedCapacity: number;
  unassignedCapacity: number;
  averagePortfolioSize: number;
  officerMetrics: OfficerMetrics[];
  capacityDistribution: CapacityTier[];
  distribution: PortfolioDistribution;
  isBalanced: boolean;
}

// Capacity tier definitions
const CAPACITY_TIERS = [
  { label: "$1M+", minAmount: 1000000, maxAmount: null },
  { label: "$500K-$1M", minAmount: 500000, maxAmount: 1000000 },
  { label: "$250K-$500K", minAmount: 250000, maxAmount: 500000 },
  { label: "$100K-$250K", minAmount: 100000, maxAmount: 250000 },
  { label: "$50K-$100K", minAmount: 50000, maxAmount: 100000 },
  { label: "$25K-$50K", minAmount: 25000, maxAmount: 50000 },
  { label: "$10K-$25K", minAmount: 10000, maxAmount: 25000 },
  { label: "<$10K", minAmount: 0, maxAmount: 10000 },
];

// Thresholds
const HIGH_PRIORITY_THRESHOLD = 0.7;
const HIGH_RISK_THRESHOLD = 0.7;
const BALANCE_CV_THRESHOLD = 0.5; // Coefficient of variation threshold for "balanced"

/**
 * Calculate metrics for a single officer's portfolio
 */
export function calculateOfficerMetrics(portfolio: OfficerPortfolio): OfficerMetrics {
  const { officerId, officerName, constituents } = portfolio;

  if (constituents.length === 0) {
    return {
      officerId,
      officerName,
      constituentCount: 0,
      totalCapacity: 0,
      averageCapacity: 0,
      averagePriorityScore: 0,
      averageLapseRiskScore: 0,
      highPriorityCount: 0,
      highRiskCount: 0,
      workloadScore: 0,
    };
  }

  // Calculate totals
  let totalCapacity = 0;
  let totalPriorityScore = 0;
  let totalLapseRiskScore = 0;
  let priorityCount = 0;
  let riskCount = 0;
  let highPriorityCount = 0;
  let highRiskCount = 0;

  for (const c of constituents) {
    if (c.estimatedCapacity !== null) {
      totalCapacity += c.estimatedCapacity;
    }
    if (c.priorityScore !== null) {
      totalPriorityScore += c.priorityScore;
      priorityCount++;
      if (c.priorityScore >= HIGH_PRIORITY_THRESHOLD) {
        highPriorityCount++;
      }
    }
    if (c.lapseRiskScore !== null) {
      totalLapseRiskScore += c.lapseRiskScore;
      riskCount++;
      if (c.lapseRiskScore >= HIGH_RISK_THRESHOLD) {
        highRiskCount++;
      }
    }
  }

  const averageCapacity = totalCapacity / constituents.length;
  const averagePriorityScore = priorityCount > 0 ? totalPriorityScore / priorityCount : 0;
  const averageLapseRiskScore = riskCount > 0 ? totalLapseRiskScore / riskCount : 0;

  // Calculate workload score (higher = more loaded)
  const workloadScore = calculateWorkloadScoreInternal({
    constituentCount: constituents.length,
    highPriorityCount,
    highRiskCount,
    totalCapacity,
  });

  return {
    officerId,
    officerName,
    constituentCount: constituents.length,
    totalCapacity,
    averageCapacity,
    averagePriorityScore,
    averageLapseRiskScore,
    highPriorityCount,
    highRiskCount,
    workloadScore,
  };
}

/**
 * Internal workload calculation without averages (for single officer)
 */
function calculateWorkloadScoreInternal(portfolio: {
  constituentCount: number;
  highPriorityCount: number;
  highRiskCount: number;
  totalCapacity: number;
}): number {
  // Simple workload calculation based on various factors
  // Normalize to 0-1 scale

  // Factor 1: Raw count (more constituents = more work)
  const countFactor = Math.min(1, portfolio.constituentCount / 150); // 150 as "full" portfolio

  // Factor 2: High priority proportion (more high priority = more attention needed)
  const priorityRatio = portfolio.constituentCount > 0
    ? portfolio.highPriorityCount / portfolio.constituentCount
    : 0;

  // Factor 3: High risk proportion (more high risk = more intervention needed)
  const riskRatio = portfolio.constituentCount > 0
    ? portfolio.highRiskCount / portfolio.constituentCount
    : 0;

  // Weighted combination
  const workload = (
    countFactor * 0.4 +
    priorityRatio * 0.3 +
    riskRatio * 0.3
  );

  return Math.min(1, workload);
}

/**
 * Calculate workload score compared to organizational averages
 */
export function calculateWorkloadScore(
  portfolio: {
    constituentCount: number;
    highPriorityCount: number;
    highRiskCount: number;
    totalCapacity: number;
  },
  averagePortfolioSize: number,
  averageCapacity: number
): number {
  if (averagePortfolioSize === 0 && averageCapacity === 0) {
    return calculateWorkloadScoreInternal(portfolio);
  }

  // Calculate relative workload compared to averages
  const sizeRatio = averagePortfolioSize > 0
    ? portfolio.constituentCount / averagePortfolioSize
    : 1;

  const capacityRatio = averageCapacity > 0
    ? portfolio.totalCapacity / averageCapacity
    : 1;

  // High priority and risk ratios
  const priorityRatio = portfolio.constituentCount > 0
    ? portfolio.highPriorityCount / portfolio.constituentCount
    : 0;

  const riskRatio = portfolio.constituentCount > 0
    ? portfolio.highRiskCount / portfolio.constituentCount
    : 0;

  // Weighted combination - penalize being over average
  const workload = (
    Math.min(2, sizeRatio) * 0.3 +
    Math.min(2, capacityRatio) * 0.2 +
    priorityRatio * 0.25 +
    riskRatio * 0.25
  );

  return Math.min(1, workload / 2); // Normalize to 0-1
}

/**
 * Calculate portfolio distribution statistics
 */
export function getPortfolioDistribution(
  officers: Array<{ officerId: string; constituentCount: number; totalCapacity: number }>
): PortfolioDistribution {
  if (officers.length === 0) {
    return {
      minSize: 0,
      maxSize: 0,
      medianSize: 0,
      averageSize: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
    };
  }

  const sizes = officers.map(o => o.constituentCount);
  const sortedSizes = [...sizes].sort((a, b) => a - b);

  const minSize = sortedSizes[0] ?? 0;
  const maxSize = sortedSizes[sortedSizes.length - 1] ?? 0;
  const total = sizes.reduce((a, b) => a + b, 0);
  const averageSize = total / sizes.length;

  // Calculate median
  const mid = Math.floor(sortedSizes.length / 2);
  const medianSize = sortedSizes.length % 2 !== 0
    ? (sortedSizes[mid] ?? 0)
    : ((sortedSizes[mid - 1] ?? 0) + (sortedSizes[mid] ?? 0)) / 2;

  // Calculate standard deviation
  const variance = sizes.reduce((sum, size) => sum + Math.pow(size - averageSize, 2), 0) / sizes.length;
  const standardDeviation = Math.sqrt(variance);

  // Coefficient of variation (normalized measure of dispersion)
  const coefficientOfVariation = averageSize > 0 ? standardDeviation / averageSize : 0;

  return {
    minSize,
    maxSize,
    medianSize,
    averageSize,
    standardDeviation,
    coefficientOfVariation,
  };
}

/**
 * Calculate capacity distribution across tiers
 */
function calculateCapacityDistribution(constituents: ConstituentData[]): CapacityTier[] {
  const tiers = CAPACITY_TIERS.map(tier => ({
    ...tier,
    count: 0,
    totalCapacity: 0,
  }));

  for (const c of constituents) {
    if (c.estimatedCapacity === null) continue;

    for (const tier of tiers) {
      const inMin = c.estimatedCapacity >= tier.minAmount;
      const inMax = tier.maxAmount === null || c.estimatedCapacity < tier.maxAmount;

      if (inMin && inMax) {
        tier.count++;
        tier.totalCapacity += c.estimatedCapacity;
        break;
      }
    }
  }

  return tiers;
}

/**
 * Calculate organization-wide portfolio metrics
 */
export function calculatePortfolioMetrics(input: PortfolioMetricsInput): PortfolioMetricsResult {
  const { officers, unassignedConstituents } = input;

  // Calculate metrics for each officer
  const officerMetrics = officers.map(calculateOfficerMetrics);

  // Calculate totals
  const assignedConstituents = officerMetrics.reduce((sum, o) => sum + o.constituentCount, 0);
  const assignedCapacity = officerMetrics.reduce((sum, o) => sum + o.totalCapacity, 0);

  const unassignedCount = unassignedConstituents.length;
  const unassignedCapacity = unassignedConstituents
    .filter(c => c.estimatedCapacity !== null)
    .reduce((sum, c) => sum + (c.estimatedCapacity || 0), 0);

  const totalConstituents = assignedConstituents + unassignedCount;
  const totalCapacity = assignedCapacity + unassignedCapacity;
  const totalOfficers = officers.length;

  // Calculate average portfolio size
  const averagePortfolioSize = totalOfficers > 0
    ? assignedConstituents / totalOfficers
    : 0;

  // Calculate distribution
  const distribution = getPortfolioDistribution(
    officerMetrics.map(o => ({
      officerId: o.officerId,
      constituentCount: o.constituentCount,
      totalCapacity: o.totalCapacity,
    }))
  );

  // Check if balanced
  const isBalanced = distribution.coefficientOfVariation < BALANCE_CV_THRESHOLD;

  // Calculate capacity distribution
  const allConstituents = [
    ...officers.flatMap(o => o.constituents),
    ...unassignedConstituents,
  ];
  const capacityDistribution = calculateCapacityDistribution(allConstituents);

  return {
    totalConstituents,
    assignedConstituents,
    unassignedConstituents: unassignedCount,
    totalOfficers,
    totalCapacity,
    assignedCapacity,
    unassignedCapacity,
    averagePortfolioSize,
    officerMetrics,
    capacityDistribution,
    distribution,
    isBalanced,
  };
}

/**
 * Get a summary of portfolio metrics suitable for display
 */
export function getPortfolioMetricsSummary(metrics: PortfolioMetricsResult): {
  totalConstituents: number;
  assignedPercentage: number;
  averagePortfolioSize: number;
  isBalanced: boolean;
  totalCapacityFormatted: string;
  highestWorkloadOfficer: OfficerMetrics | null;
  lowestWorkloadOfficer: OfficerMetrics | null;
} {
  const assignedPercentage = metrics.totalConstituents > 0
    ? (metrics.assignedConstituents / metrics.totalConstituents) * 100
    : 0;

  // Format capacity
  const totalCapacityFormatted = formatCapacity(metrics.totalCapacity);

  // Find highest/lowest workload
  const sortedByWorkload = [...metrics.officerMetrics].sort((a, b) => b.workloadScore - a.workloadScore);
  const highestWorkloadOfficer = sortedByWorkload[0] || null;
  const lowestWorkloadOfficer = sortedByWorkload[sortedByWorkload.length - 1] || null;

  return {
    totalConstituents: metrics.totalConstituents,
    assignedPercentage: Math.round(assignedPercentage * 10) / 10,
    averagePortfolioSize: Math.round(metrics.averagePortfolioSize * 10) / 10,
    isBalanced: metrics.isBalanced,
    totalCapacityFormatted,
    highestWorkloadOfficer,
    lowestWorkloadOfficer,
  };
}

/**
 * Format capacity as currency string
 */
function formatCapacity(capacity: number): string {
  if (capacity >= 1000000) {
    return `$${(capacity / 1000000).toFixed(1)}M`;
  }
  if (capacity >= 1000) {
    return `$${(capacity / 1000).toFixed(0)}K`;
  }
  return `$${capacity.toFixed(0)}`;
}
