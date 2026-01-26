// T223: Anomaly detection engine
// Combines all anomaly detectors to identify unusual patterns

import { detectEngagementSpike } from "./anomaly-detectors/engagement-spike";
import { detectGivingPatternChange } from "./anomaly-detectors/giving-pattern";
import { detectContactGap } from "./anomaly-detectors/contact-gap";

// Re-export types for convenience
export { detectEngagementSpike } from "./anomaly-detectors/engagement-spike";
export { detectGivingPatternChange } from "./anomaly-detectors/giving-pattern";
export { detectContactGap } from "./anomaly-detectors/contact-gap";

export interface GiftData {
  amount: number;
  date: Date;
}

export interface ContactData {
  date: Date;
  type: string;
}

export interface AnomalyInput {
  constituentId: string;
  gifts: GiftData[];
  contacts: ContactData[];
  referenceDate: Date;
  estimatedCapacity?: number | null;
  portfolioTier?: string | null;
}

export interface AnomalyFactor {
  name: string;
  value: string;
}

export type AnomalyType =
  | "engagement_spike"
  | "giving_pattern_change"
  | "contact_gap";

export interface AnomalyResult {
  constituentId: string;
  type: AnomalyType;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  factors: AnomalyFactor[];
  detectedAt: Date;
}

/**
 * Runs all anomaly detectors on constituent data
 * Returns array of detected anomalies
 */
export function detectAnomalies(input: AnomalyInput): AnomalyResult[] {
  const results: AnomalyResult[] = [];

  // Run engagement spike detector
  const engagementResult = detectEngagementSpike({
    constituentId: input.constituentId,
    gifts: input.gifts,
    referenceDate: input.referenceDate,
  });
  if (engagementResult) {
    results.push(engagementResult);
  }

  // Run giving pattern change detector
  const patternResult = detectGivingPatternChange({
    constituentId: input.constituentId,
    gifts: input.gifts,
    referenceDate: input.referenceDate,
  });
  if (patternResult) {
    results.push(patternResult);
  }

  // Run contact gap detector
  const contactResult = detectContactGap({
    constituentId: input.constituentId,
    contacts: input.contacts,
    gifts: input.gifts,
    referenceDate: input.referenceDate,
    estimatedCapacity: input.estimatedCapacity,
    portfolioTier: input.portfolioTier,
  });
  if (contactResult) {
    results.push(contactResult);
  }

  return results;
}

/**
 * Batch process multiple constituents for anomaly detection
 */
export function detectAnomaliesBatch(
  inputs: AnomalyInput[]
): Map<string, AnomalyResult[]> {
  const results = new Map<string, AnomalyResult[]>();

  for (const input of inputs) {
    const anomalies = detectAnomalies(input);
    if (anomalies.length > 0) {
      results.set(input.constituentId, anomalies);
    }
  }

  return results;
}

/**
 * Get summary statistics for detected anomalies
 */
export function getAnomalySummary(results: AnomalyResult[]): {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
} {
  const bySeverity: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  const byType: Record<string, number> = {
    engagement_spike: 0,
    giving_pattern_change: 0,
    contact_gap: 0,
  };

  for (const result of results) {
    bySeverity[result.severity] = (bySeverity[result.severity] || 0) + 1;
    byType[result.type] = (byType[result.type] || 0) + 1;
  }

  return {
    total: results.length,
    bySeverity,
    byType,
  };
}

/**
 * Filter anomalies by severity threshold
 */
export function filterBySeverity(
  results: AnomalyResult[],
  minSeverity: "high" | "medium" | "low"
): AnomalyResult[] {
  const severityOrder = { high: 3, medium: 2, low: 1 };
  const threshold = severityOrder[minSeverity];

  return results.filter(
    (r) => severityOrder[r.severity] >= threshold
  );
}

/**
 * Filter anomalies by type
 */
export function filterByType(
  results: AnomalyResult[],
  types: AnomalyType[]
): AnomalyResult[] {
  return results.filter((r) => types.includes(r.type));
}

/**
 * Sort anomalies by priority (severity then recency)
 */
export function sortByPriority(results: AnomalyResult[]): AnomalyResult[] {
  const severityOrder = { high: 3, medium: 2, low: 1 };

  return [...results].sort((a, b) => {
    // First sort by severity (high first)
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;

    // Then by recency (newer first)
    return b.detectedAt.getTime() - a.detectedAt.getTime();
  });
}
