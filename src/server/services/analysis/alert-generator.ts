// T227: Alert generation service
// Creates alerts from detected anomalies

import {
  detectAnomalies,
  type AnomalyResult,
  type AnomalyInput,
  type GiftData,
  type ContactData,
} from "./anomaly-detector";

export interface ConstituentData {
  id: string;
  displayName: string;
  estimatedCapacity?: number | null;
  portfolioTier?: string | null;
}

export interface AlertGeneratorInput {
  organizationId: string;
  constituent: ConstituentData;
  gifts: GiftData[];
  contacts: ContactData[];
  referenceDate: Date;
}

export interface GeneratedAlert {
  organizationId: string;
  constituentId: string;
  alertType: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  factors: Array<{ name: string; value: string }>;
  detectedAt: Date;
}

export interface OrganizationAlertInput {
  organizationId: string;
  constituents: Array<{
    id: string;
    displayName: string;
    estimatedCapacity?: number | null;
    portfolioTier?: string | null;
    gifts: GiftData[];
    contacts: ContactData[];
  }>;
  referenceDate: Date;
}

/**
 * Creates an alert from an anomaly result
 */
export function createAlertFromAnomaly(
  anomaly: AnomalyResult,
  organizationId: string,
  displayName?: string
): GeneratedAlert {
  // Optionally personalize description with display name
  let description = anomaly.description;
  if (displayName && !description.includes(displayName)) {
    description = `${displayName}: ${description}`;
  }

  return {
    organizationId,
    constituentId: anomaly.constituentId,
    alertType: anomaly.type,
    severity: anomaly.severity,
    title: anomaly.title,
    description,
    factors: anomaly.factors,
    detectedAt: anomaly.detectedAt,
  };
}

/**
 * Generates alerts for a single constituent
 */
export function generateAlertsForConstituent(
  input: AlertGeneratorInput
): GeneratedAlert[] {
  const anomalyInput: AnomalyInput = {
    constituentId: input.constituent.id,
    gifts: input.gifts,
    contacts: input.contacts,
    referenceDate: input.referenceDate,
    estimatedCapacity: input.constituent.estimatedCapacity,
    portfolioTier: input.constituent.portfolioTier,
  };

  const anomalies = detectAnomalies(anomalyInput);

  return anomalies.map((anomaly) =>
    createAlertFromAnomaly(
      anomaly,
      input.organizationId,
      input.constituent.displayName
    )
  );
}

/**
 * Generates alerts for all constituents in an organization
 */
export function generateAlertsForOrganization(
  input: OrganizationAlertInput
): GeneratedAlert[] {
  const allAlerts: GeneratedAlert[] = [];

  for (const constituent of input.constituents) {
    const alerts = generateAlertsForConstituent({
      organizationId: input.organizationId,
      constituent: {
        id: constituent.id,
        displayName: constituent.displayName,
        estimatedCapacity: constituent.estimatedCapacity,
        portfolioTier: constituent.portfolioTier,
      },
      gifts: constituent.gifts,
      contacts: constituent.contacts,
      referenceDate: input.referenceDate,
    });

    allAlerts.push(...alerts);
  }

  return allAlerts;
}

/**
 * Prioritizes alerts by severity and recency
 */
export function prioritizeAlerts(alerts: GeneratedAlert[]): GeneratedAlert[] {
  const severityOrder = { high: 3, medium: 2, low: 1 };

  return [...alerts].sort((a, b) => {
    // First sort by severity (high first)
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;

    // Then by recency (newer first)
    return b.detectedAt.getTime() - a.detectedAt.getTime();
  });
}

/**
 * Deduplicates alerts by constituent and type
 * Keeps the most recent/severe alert for each constituent-type pair
 */
export function deduplicateAlerts(alerts: GeneratedAlert[]): GeneratedAlert[] {
  const alertMap = new Map<string, GeneratedAlert>();
  const severityOrder = { high: 3, medium: 2, low: 1 };

  for (const alert of alerts) {
    const key = `${alert.constituentId}:${alert.alertType}`;
    const existing = alertMap.get(key);

    if (!existing) {
      alertMap.set(key, alert);
    } else {
      // Keep the more severe or more recent alert
      const existingSeverity = severityOrder[existing.severity];
      const newSeverity = severityOrder[alert.severity];

      if (
        newSeverity > existingSeverity ||
        (newSeverity === existingSeverity &&
          alert.detectedAt > existing.detectedAt)
      ) {
        alertMap.set(key, alert);
      }
    }
  }

  return Array.from(alertMap.values());
}

/**
 * Filters out alerts that already exist in the database
 */
export function filterNewAlerts(
  generatedAlerts: GeneratedAlert[],
  existingAlertKeys: Set<string>
): GeneratedAlert[] {
  return generatedAlerts.filter((alert) => {
    const key = `${alert.constituentId}:${alert.alertType}`;
    return !existingAlertKeys.has(key);
  });
}

/**
 * Gets summary statistics for generated alerts
 */
export function getAlertSummary(alerts: GeneratedAlert[]): {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  constituentsAffected: number;
} {
  const bySeverity: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  const byType: Record<string, number> = {};
  const constituents = new Set<string>();

  for (const alert of alerts) {
    bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    byType[alert.alertType] = (byType[alert.alertType] || 0) + 1;
    constituents.add(alert.constituentId);
  }

  return {
    total: alerts.length,
    bySeverity,
    byType,
    constituentsAffected: constituents.size,
  };
}

export { type AnomalyResult } from "./anomaly-detector";
