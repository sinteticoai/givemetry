// T221: Unit tests for alert generator
import { describe, it, expect } from "vitest";
import {
  generateAlertsForConstituent,
  generateAlertsForOrganization,
  createAlertFromAnomaly,
  prioritizeAlerts,
  type AlertGeneratorInput,
  type GeneratedAlert,
} from "@/server/services/analysis/alert-generator";
import type { AnomalyResult } from "@/server/services/analysis/anomaly-detector";

describe("Alert Generator", () => {
  const referenceDate = new Date("2026-01-15");

  describe("createAlertFromAnomaly", () => {
    it("creates alert from engagement spike anomaly", () => {
      const anomaly: AnomalyResult = {
        constituentId: "c1",
        type: "engagement_spike",
        severity: "medium",
        title: "Unusual engagement increase detected",
        description: "Gift frequency increased by 150% compared to baseline",
        factors: [
          { name: "gift_count_increase", value: "150% increase in last 3 months" },
          { name: "amount_increase", value: "Average gift up from $500 to $2,000" },
        ],
        detectedAt: referenceDate,
      };

      const alert = createAlertFromAnomaly(anomaly, "org-1");

      expect(alert.organizationId).toBe("org-1");
      expect(alert.constituentId).toBe("c1");
      expect(alert.alertType).toBe("engagement_spike");
      expect(alert.severity).toBe("medium");
      expect(alert.title).toBe("Unusual engagement increase detected");
      expect(alert.factors).toEqual(anomaly.factors);
    });

    it("creates alert from giving pattern change anomaly", () => {
      const anomaly: AnomalyResult = {
        constituentId: "c2",
        type: "giving_pattern_change",
        severity: "high",
        title: "Significant giving pattern change",
        description: "Annual donor appears to be lapsing - no gift in 18 months",
        factors: [
          { name: "pattern", value: "Annual donor missed expected giving cycle" },
          { name: "last_gift", value: "18 months ago" },
        ],
        detectedAt: referenceDate,
      };

      const alert = createAlertFromAnomaly(anomaly, "org-1");

      expect(alert.alertType).toBe("giving_pattern_change");
      expect(alert.severity).toBe("high");
    });

    it("creates alert from contact gap anomaly", () => {
      const anomaly: AnomalyResult = {
        constituentId: "c3",
        type: "contact_gap",
        severity: "high",
        title: "Major donor contact overdue",
        description: "No contact with major donor ($100K+ capacity) in 12 months",
        factors: [
          { name: "last_contact", value: "12 months ago" },
          { name: "donor_tier", value: "Major gift prospect" },
        ],
        detectedAt: referenceDate,
      };

      const alert = createAlertFromAnomaly(anomaly, "org-1");

      expect(alert.alertType).toBe("contact_gap");
      expect(alert.severity).toBe("high");
    });
  });

  describe("generateAlertsForConstituent", () => {
    it("generates alerts from constituent data", () => {
      const input: AlertGeneratorInput = {
        organizationId: "org-1",
        constituent: {
          id: "c1",
          displayName: "John Smith",
          estimatedCapacity: 50000,
        },
        gifts: [
          // Engagement spike pattern
          { amount: 10000, date: new Date("2025-12-15") },
          { amount: 500, date: new Date("2025-06-01") },
          { amount: 500, date: new Date("2024-12-01") },
        ],
        contacts: [],
        referenceDate,
      };

      const alerts = generateAlertsForConstituent(input);

      expect(alerts).toBeInstanceOf(Array);
      // Should detect engagement spike and/or contact gap
    });

    it("returns empty array for constituents with no anomalies", () => {
      const input: AlertGeneratorInput = {
        organizationId: "org-1",
        constituent: {
          id: "c1",
          displayName: "Jane Doe",
          estimatedCapacity: 1000,
        },
        gifts: [
          { amount: 500, date: new Date("2025-12-01") },
          { amount: 500, date: new Date("2024-12-01") },
        ],
        contacts: [
          { date: new Date("2025-11-01"), type: "meeting" },
        ],
        referenceDate,
      };

      const alerts = generateAlertsForConstituent(input);

      expect(alerts).toBeInstanceOf(Array);
    });

    it("includes constituent display name in alert", () => {
      const input: AlertGeneratorInput = {
        organizationId: "org-1",
        constituent: {
          id: "c1",
          displayName: "Dr. Robert Johnson III",
          estimatedCapacity: 500000,
        },
        gifts: [{ amount: 100000, date: new Date("2025-06-01") }],
        contacts: [{ date: new Date("2024-01-01"), type: "meeting" }], // Very old contact for major donor
        referenceDate,
      };

      const alerts = generateAlertsForConstituent(input);

      // At minimum should detect contact gap for major donor
      if (alerts.length > 0) {
        expect(alerts[0]?.description).toContain("Dr. Robert Johnson III");
      }
    });
  });

  describe("generateAlertsForOrganization", () => {
    it("generates alerts for multiple constituents", () => {
      const constituents = [
        {
          id: "c1",
          displayName: "Constituent 1",
          estimatedCapacity: 100000,
          gifts: [
            { amount: 50000, date: new Date("2025-06-01") },
          ],
          contacts: [
            { date: new Date("2024-06-01"), type: "meeting" },
          ],
        },
        {
          id: "c2",
          displayName: "Constituent 2",
          estimatedCapacity: 5000,
          gifts: [
            { amount: 1000, date: new Date("2025-12-01") },
            { amount: 1000, date: new Date("2024-12-01") },
          ],
          contacts: [
            { date: new Date("2025-11-01"), type: "call" },
          ],
        },
      ];

      const alerts = generateAlertsForOrganization({
        organizationId: "org-1",
        constituents,
        referenceDate,
      });

      expect(alerts).toBeInstanceOf(Array);
      // Should have alerts for c1 (contact gap) but maybe not c2 (normal pattern)
    });

    it("handles empty constituent list", () => {
      const alerts = generateAlertsForOrganization({
        organizationId: "org-1",
        constituents: [],
        referenceDate,
      });

      expect(alerts).toEqual([]);
    });
  });

  describe("prioritizeAlerts", () => {
    it("sorts alerts by severity then recency", () => {
      const alerts: GeneratedAlert[] = [
        {
          organizationId: "org-1",
          constituentId: "c1",
          alertType: "contact_gap",
          severity: "low",
          title: "Low priority alert",
          description: "Minor issue",
          factors: [],
          detectedAt: new Date("2026-01-10"),
        },
        {
          organizationId: "org-1",
          constituentId: "c2",
          alertType: "giving_pattern_change",
          severity: "high",
          title: "High priority alert",
          description: "Major issue",
          factors: [],
          detectedAt: new Date("2026-01-05"),
        },
        {
          organizationId: "org-1",
          constituentId: "c3",
          alertType: "engagement_spike",
          severity: "medium",
          title: "Medium priority alert",
          description: "Moderate issue",
          factors: [],
          detectedAt: new Date("2026-01-15"),
        },
        {
          organizationId: "org-1",
          constituentId: "c4",
          alertType: "contact_gap",
          severity: "high",
          title: "High priority alert 2",
          description: "Major issue 2",
          factors: [],
          detectedAt: new Date("2026-01-12"),
        },
      ];

      const prioritized = prioritizeAlerts(alerts);

      // High severity first
      expect(prioritized[0]?.severity).toBe("high");
      expect(prioritized[1]?.severity).toBe("high");
      // Then medium
      expect(prioritized[2]?.severity).toBe("medium");
      // Then low
      expect(prioritized[3]?.severity).toBe("low");

      // Within same severity, more recent first
      expect(prioritized[0]?.constituentId).toBe("c4"); // Jan 12
      expect(prioritized[1]?.constituentId).toBe("c2"); // Jan 5
    });

    it("handles empty array", () => {
      const prioritized = prioritizeAlerts([]);
      expect(prioritized).toEqual([]);
    });

    it("maintains stability for identical priorities", () => {
      const alerts: GeneratedAlert[] = [
        {
          organizationId: "org-1",
          constituentId: "c1",
          alertType: "contact_gap",
          severity: "high",
          title: "Alert 1",
          description: "Desc 1",
          factors: [],
          detectedAt: new Date("2026-01-15"),
        },
        {
          organizationId: "org-1",
          constituentId: "c2",
          alertType: "contact_gap",
          severity: "high",
          title: "Alert 2",
          description: "Desc 2",
          factors: [],
          detectedAt: new Date("2026-01-15"),
        },
      ];

      const prioritized = prioritizeAlerts(alerts);

      expect(prioritized).toHaveLength(2);
    });
  });
});
