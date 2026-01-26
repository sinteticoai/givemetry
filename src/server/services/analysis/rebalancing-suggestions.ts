// T239: Rebalancing suggestion generator service
/**
 * Rebalancing Suggestions Service
 *
 * Generates suggestions for rebalancing portfolios across gift officers.
 * Note: This service provides preview/suggestions only - actual reassignment
 * requires user action and is out of MVP scope.
 */

import { type OfficerMetrics } from "./portfolio-metrics";
import { type ImbalanceAlert } from "./portfolio-imbalance";

export interface ConstituentForRebalance {
  id: string;
  displayName: string;
  estimatedCapacity: number | null;
  priorityScore: number | null;
  lapseRiskScore: number | null;
  currentOfficerId: string;
  currentOfficerName: string | null;
}

export interface RebalanceSuggestion {
  constituentId: string;
  constituentName: string;
  fromOfficerId: string;
  fromOfficerName: string | null;
  toOfficerId: string;
  toOfficerName: string | null;
  reason: string;
  impact: {
    fromOfficerNewCount: number;
    toOfficerNewCount: number;
    capacityTransferred: number;
  };
}

export interface RebalancePreview {
  suggestions: RebalanceSuggestion[];
  summary: {
    totalTransfers: number;
    totalCapacityMoving: number;
    projectedImprovement: number; // 0-1 scale of how much this helps balance
  };
  projectedState: Array<{
    officerId: string;
    officerName: string | null;
    currentCount: number;
    projectedCount: number;
    currentCapacity: number;
    projectedCapacity: number;
  }>;
}

export interface RebalanceInput {
  officers: OfficerMetrics[];
  constituents: ConstituentForRebalance[];
  alerts: ImbalanceAlert[];
  maxTransfersPerOfficer?: number;
  prioritizeHighRisk?: boolean;
}

// Default configuration
const DEFAULT_MAX_TRANSFERS = 10;

/**
 * Generate rebalancing suggestions based on current imbalances
 */
export function generateRebalanceSuggestions(input: RebalanceInput): RebalancePreview {
  const {
    officers,
    constituents,
    alerts,
    maxTransfersPerOfficer = DEFAULT_MAX_TRANSFERS,
    prioritizeHighRisk = true,
  } = input;

  if (officers.length <= 1 || alerts.length === 0) {
    return createEmptyPreview(officers);
  }

  const suggestions: RebalanceSuggestion[] = [];

  // Calculate averages
  const totalCount = officers.reduce((sum, o) => sum + o.constituentCount, 0);
  // Calculate averages
  const avgCount = totalCount / officers.length;

  // Identify overloaded and underutilized officers
  const overloadedOfficers = alerts
    .filter(a => a.type === "overloaded")
    .map(a => officers.find(o => o.officerId === a.officerId))
    .filter((o): o is OfficerMetrics => o !== undefined);

  const underutilizedOfficers = alerts
    .filter(a => a.type === "underutilized")
    .map(a => officers.find(o => o.officerId === a.officerId))
    .filter((o): o is OfficerMetrics => o !== undefined);

  if (overloadedOfficers.length === 0 || underutilizedOfficers.length === 0) {
    return createEmptyPreview(officers);
  }

  // Track projected counts
  const projectedCounts = new Map<string, number>();
  const projectedCapacities = new Map<string, number>();
  const transferCounts = new Map<string, number>();

  for (const officer of officers) {
    projectedCounts.set(officer.officerId, officer.constituentCount);
    projectedCapacities.set(officer.officerId, officer.totalCapacity);
    transferCounts.set(officer.officerId, 0);
  }

  // Sort constituents for rebalancing
  // Prioritize low-risk, low-priority constituents (less disruption)
  // Unless prioritizeHighRisk is true, then prioritize high-risk (need attention)
  const sortedConstituents = [...constituents].sort((a, b) => {
    if (prioritizeHighRisk) {
      const riskA = a.lapseRiskScore ?? 0;
      const riskB = b.lapseRiskScore ?? 0;
      return riskB - riskA; // High risk first
    } else {
      const priorityA = a.priorityScore ?? 0;
      const priorityB = b.priorityScore ?? 0;
      return priorityA - priorityB; // Low priority first (less disruptive)
    }
  });

  // Generate transfer suggestions
  for (const overloaded of overloadedOfficers) {
    const fromCount = projectedCounts.get(overloaded.officerId) ?? 0;
    const targetCount = Math.ceil(avgCount);

    if (fromCount <= targetCount) continue;

    // Find constituents to transfer
    const candidatesForTransfer = sortedConstituents.filter(
      c => c.currentOfficerId === overloaded.officerId
    );

    for (const candidate of candidatesForTransfer) {
      // Check if we've done enough transfers from this officer
      const transferredFrom = transferCounts.get(overloaded.officerId) ?? 0;
      if (transferredFrom >= maxTransfersPerOfficer) break;

      // Find best underutilized officer to receive
      const recipient = findBestRecipient(
        underutilizedOfficers,
        projectedCounts,
        avgCount,
        maxTransfersPerOfficer,
        transferCounts
      );

      if (!recipient) break;

      // Check if transfer would help balance
      const currentFromCount = projectedCounts.get(overloaded.officerId) ?? 0;
      const currentToCount = projectedCounts.get(recipient.officerId) ?? 0;

      if (currentFromCount <= avgCount || currentToCount >= avgCount) break;

      // Create suggestion
      const capacity = candidate.estimatedCapacity ?? 0;

      suggestions.push({
        constituentId: candidate.id,
        constituentName: candidate.displayName,
        fromOfficerId: overloaded.officerId,
        fromOfficerName: overloaded.officerName,
        toOfficerId: recipient.officerId,
        toOfficerName: recipient.officerName,
        reason: generateTransferReason(candidate, overloaded, recipient, avgCount),
        impact: {
          fromOfficerNewCount: currentFromCount - 1,
          toOfficerNewCount: currentToCount + 1,
          capacityTransferred: capacity,
        },
      });

      // Update projections
      projectedCounts.set(overloaded.officerId, currentFromCount - 1);
      projectedCounts.set(recipient.officerId, currentToCount + 1);
      projectedCapacities.set(
        overloaded.officerId,
        (projectedCapacities.get(overloaded.officerId) ?? 0) - capacity
      );
      projectedCapacities.set(
        recipient.officerId,
        (projectedCapacities.get(recipient.officerId) ?? 0) + capacity
      );
      transferCounts.set(overloaded.officerId, transferredFrom + 1);
      transferCounts.set(
        recipient.officerId,
        (transferCounts.get(recipient.officerId) ?? 0) + 1
      );
    }
  }

  // Calculate summary
  const totalCapacityMoving = suggestions.reduce(
    (sum, s) => sum + s.impact.capacityTransferred,
    0
  );

  // Calculate improvement
  const currentCV = calculateCV(Array.from(officers.map(o => o.constituentCount)));
  const projectedCV = calculateCV(Array.from(projectedCounts.values()));
  const projectedImprovement = currentCV > 0
    ? Math.max(0, 1 - (projectedCV / currentCV))
    : 0;

  // Build projected state
  const projectedState = officers.map(o => ({
    officerId: o.officerId,
    officerName: o.officerName,
    currentCount: o.constituentCount,
    projectedCount: projectedCounts.get(o.officerId) ?? o.constituentCount,
    currentCapacity: o.totalCapacity,
    projectedCapacity: projectedCapacities.get(o.officerId) ?? o.totalCapacity,
  }));

  return {
    suggestions,
    summary: {
      totalTransfers: suggestions.length,
      totalCapacityMoving,
      projectedImprovement,
    },
    projectedState,
  };
}

/**
 * Find the best recipient officer for a transfer
 */
function findBestRecipient(
  underutilizedOfficers: OfficerMetrics[],
  projectedCounts: Map<string, number>,
  avgCount: number,
  _maxTransfers: number,
  transferCounts: Map<string, number>
): OfficerMetrics | null {
  // Sort by how far below average they are
  const sorted = [...underutilizedOfficers].sort((a, b) => {
    const countA = projectedCounts.get(a.officerId) ?? a.constituentCount;
    const countB = projectedCounts.get(b.officerId) ?? b.constituentCount;
    return countA - countB; // Most underutilized first
  });

  for (const officer of sorted) {
    const currentCount = projectedCounts.get(officer.officerId) ?? 0;
    const transferredTo = transferCounts.get(officer.officerId) ?? 0;

    // Check if still below average and under transfer limit
    if (currentCount < avgCount && transferredTo < _maxTransfers) {
      return officer;
    }
  }

  return null;
}

/**
 * Generate a human-readable reason for the transfer
 */
function generateTransferReason(
  constituent: ConstituentForRebalance,
  from: OfficerMetrics,
  to: OfficerMetrics,
  avgCount: number
): string {
  const fromOverload = Math.round(((from.constituentCount - avgCount) / avgCount) * 100);
  const toUnderload = Math.round(((avgCount - to.constituentCount) / avgCount) * 100);

  if (constituent.lapseRiskScore !== null && constituent.lapseRiskScore >= 0.7) {
    return `High-risk constituent needs attention; ${from.officerName || "Current officer"} is ${fromOverload}% over target`;
  }

  if (constituent.priorityScore !== null && constituent.priorityScore >= 0.7) {
    return `High-priority prospect; ${to.officerName || "Receiving officer"} has capacity (${toUnderload}% below target)`;
  }

  return `Rebalance portfolios: ${from.officerName || "From"} is ${fromOverload}% over, ${to.officerName || "To"} is ${toUnderload}% under target`;
}

/**
 * Calculate coefficient of variation
 */
function calculateCV(values: number[]): number {
  if (values.length === 0) return 0;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg === 0) return 0;

  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance) / avg;
}

/**
 * Create empty preview when no rebalancing is needed
 */
function createEmptyPreview(officers: OfficerMetrics[]): RebalancePreview {
  return {
    suggestions: [],
    summary: {
      totalTransfers: 0,
      totalCapacityMoving: 0,
      projectedImprovement: 0,
    },
    projectedState: officers.map(o => ({
      officerId: o.officerId,
      officerName: o.officerName,
      currentCount: o.constituentCount,
      projectedCount: o.constituentCount,
      currentCapacity: o.totalCapacity,
      projectedCapacity: o.totalCapacity,
    })),
  };
}

/**
 * Format a rebalance suggestion for display
 */
export function formatSuggestion(suggestion: RebalanceSuggestion): string {
  return `Move "${suggestion.constituentName}" from ${suggestion.fromOfficerName || "unassigned"} to ${suggestion.toOfficerName || "unassigned"}`;
}

/**
 * Calculate the potential improvement from a set of suggestions
 */
export function calculateImprovementMetrics(
  currentState: Array<{ officerId: string; constituentCount: number }>,
  suggestions: RebalanceSuggestion[]
): {
  currentVariance: number;
  projectedVariance: number;
  improvementPercent: number;
} {
  // Calculate current variance
  const currentCounts = currentState.map(s => s.constituentCount);
  const currentCV = calculateCV(currentCounts);

  // Apply suggestions to get projected counts
  const projectedCounts = new Map<string, number>();
  for (const state of currentState) {
    projectedCounts.set(state.officerId, state.constituentCount);
  }

  for (const suggestion of suggestions) {
    const fromCount = projectedCounts.get(suggestion.fromOfficerId) ?? 0;
    const toCount = projectedCounts.get(suggestion.toOfficerId) ?? 0;
    projectedCounts.set(suggestion.fromOfficerId, fromCount - 1);
    projectedCounts.set(suggestion.toOfficerId, toCount + 1);
  }

  const projectedCV = calculateCV(Array.from(projectedCounts.values()));

  const improvementPercent = currentCV > 0
    ? Math.round((1 - projectedCV / currentCV) * 100)
    : 0;

  return {
    currentVariance: Math.round(currentCV * 100),
    projectedVariance: Math.round(projectedCV * 100),
    improvementPercent: Math.max(0, improvementPercent),
  };
}
