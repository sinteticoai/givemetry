// T235: Unit tests for portfolio imbalance detection
import { describe, it, expect } from "vitest";
import {
  detectImbalances,
  calculateImbalanceScore,
  getImbalanceType,
  generateImbalanceAlerts,
  type ImbalanceInput,
  type OfficerMetricsSummary,
} from "@/server/services/analysis/portfolio-imbalance";

describe("Portfolio Imbalance Detection", () => {
  describe("detectImbalances", () => {
    it("detects size imbalance when portfolios vary significantly", () => {
      const input: ImbalanceInput = {
        officers: [
          { officerId: "o1", officerName: "Officer 1", constituentCount: 150, totalCapacity: 5000000, avgPriorityScore: 0.6 },
          { officerId: "o2", officerName: "Officer 2", constituentCount: 30, totalCapacity: 1000000, avgPriorityScore: 0.5 },
          { officerId: "o3", officerName: "Officer 3", constituentCount: 80, totalCapacity: 3000000, avgPriorityScore: 0.55 },
        ],
        thresholds: {
          sizeVarianceThreshold: 0.5, // 50% variance threshold
          capacityVarianceThreshold: 0.5,
        },
      };

      const imbalances = detectImbalances(input);

      expect(imbalances.hasImbalances).toBe(true);
      expect(imbalances.sizeImbalance).toBeDefined();
      expect(imbalances.sizeImbalance?.severity).toBeDefined();
    });

    it("detects capacity imbalance when capacity varies significantly", () => {
      const input: ImbalanceInput = {
        officers: [
          { officerId: "o1", officerName: "Officer 1", constituentCount: 50, totalCapacity: 10000000, avgPriorityScore: 0.7 },
          { officerId: "o2", officerName: "Officer 2", constituentCount: 50, totalCapacity: 500000, avgPriorityScore: 0.5 },
          { officerId: "o3", officerName: "Officer 3", constituentCount: 50, totalCapacity: 2000000, avgPriorityScore: 0.6 },
        ],
      };

      const imbalances = detectImbalances(input);

      expect(imbalances.hasImbalances).toBe(true);
      expect(imbalances.capacityImbalance).toBeDefined();
    });

    it("returns no imbalances for balanced portfolios", () => {
      const input: ImbalanceInput = {
        officers: [
          { officerId: "o1", officerName: "Officer 1", constituentCount: 50, totalCapacity: 2000000, avgPriorityScore: 0.6 },
          { officerId: "o2", officerName: "Officer 2", constituentCount: 55, totalCapacity: 2200000, avgPriorityScore: 0.58 },
          { officerId: "o3", officerName: "Officer 3", constituentCount: 48, totalCapacity: 1900000, avgPriorityScore: 0.62 },
        ],
      };

      const imbalances = detectImbalances(input);

      expect(imbalances.hasImbalances).toBe(false);
    });

    it("handles single officer (no comparison possible)", () => {
      const input: ImbalanceInput = {
        officers: [
          { officerId: "o1", officerName: "Officer 1", constituentCount: 100, totalCapacity: 5000000, avgPriorityScore: 0.7 },
        ],
      };

      const imbalances = detectImbalances(input);

      expect(imbalances.hasImbalances).toBe(false);
    });

    it("handles empty officers list", () => {
      const input: ImbalanceInput = {
        officers: [],
      };

      const imbalances = detectImbalances(input);

      expect(imbalances.hasImbalances).toBe(false);
    });
  });

  describe("calculateImbalanceScore", () => {
    it("returns 0 for perfectly balanced portfolios", () => {
      const values = [50, 50, 50, 50];
      const score = calculateImbalanceScore(values);
      expect(score).toBe(0);
    });

    it("returns higher score for more variance", () => {
      const balancedValues = [48, 50, 52, 50];
      const unbalancedValues = [20, 50, 100, 30];

      const balancedScore = calculateImbalanceScore(balancedValues);
      const unbalancedScore = calculateImbalanceScore(unbalancedValues);

      expect(unbalancedScore).toBeGreaterThan(balancedScore);
    });

    it("handles single value", () => {
      const score = calculateImbalanceScore([100]);
      expect(score).toBe(0);
    });

    it("handles empty array", () => {
      const score = calculateImbalanceScore([]);
      expect(score).toBe(0);
    });
  });

  describe("getImbalanceType", () => {
    it("identifies overloaded officers", () => {
      const officer: OfficerMetricsSummary = {
        officerId: "o1",
        officerName: "Officer 1",
        constituentCount: 150,
        totalCapacity: 5000000,
        avgPriorityScore: 0.7,
      };

      const averageSize = 80;
      const averageCapacity = 3000000;

      const type = getImbalanceType(officer, averageSize, averageCapacity);

      expect(type).toBe("overloaded");
    });

    it("identifies underutilized officers", () => {
      const officer: OfficerMetricsSummary = {
        officerId: "o1",
        officerName: "Officer 1",
        constituentCount: 20,
        totalCapacity: 500000,
        avgPriorityScore: 0.4,
      };

      const averageSize = 80;
      const averageCapacity = 3000000;

      const type = getImbalanceType(officer, averageSize, averageCapacity);

      expect(type).toBe("underutilized");
    });

    it("identifies capacity-heavy portfolios", () => {
      const officer: OfficerMetricsSummary = {
        officerId: "o1",
        officerName: "Officer 1",
        constituentCount: 50, // Normal size
        totalCapacity: 10000000, // Very high capacity
        avgPriorityScore: 0.8,
      };

      const averageSize = 50;
      const averageCapacity = 2000000;

      const type = getImbalanceType(officer, averageSize, averageCapacity);

      expect(type).toBe("capacity-heavy");
    });

    it("returns balanced for normal portfolios", () => {
      const officer: OfficerMetricsSummary = {
        officerId: "o1",
        officerName: "Officer 1",
        constituentCount: 80,
        totalCapacity: 3200000,
        avgPriorityScore: 0.6,
      };

      const averageSize = 80;
      const averageCapacity = 3000000;

      const type = getImbalanceType(officer, averageSize, averageCapacity);

      expect(type).toBe("balanced");
    });
  });

  describe("generateImbalanceAlerts", () => {
    it("generates alerts for overloaded officers", () => {
      const officers: OfficerMetricsSummary[] = [
        { officerId: "o1", officerName: "Overloaded Officer", constituentCount: 200, totalCapacity: 8000000, avgPriorityScore: 0.7 },
        { officerId: "o2", officerName: "Normal Officer", constituentCount: 80, totalCapacity: 3000000, avgPriorityScore: 0.6 },
        { officerId: "o3", officerName: "Light Officer", constituentCount: 40, totalCapacity: 1500000, avgPriorityScore: 0.5 },
      ];

      const alerts = generateImbalanceAlerts(officers);

      expect(alerts.length).toBeGreaterThan(0);
      const overloadedAlert = alerts.find(a => a.officerId === "o1");
      expect(overloadedAlert).toBeDefined();
      expect(overloadedAlert?.type).toBe("overloaded");
    });

    it("includes severity levels in alerts", () => {
      const officers: OfficerMetricsSummary[] = [
        { officerId: "o1", officerName: "Severely Overloaded", constituentCount: 300, totalCapacity: 15000000, avgPriorityScore: 0.8 },
        { officerId: "o2", officerName: "Normal", constituentCount: 80, totalCapacity: 3000000, avgPriorityScore: 0.6 },
      ];

      const alerts = generateImbalanceAlerts(officers);

      const severeAlert = alerts.find(a => a.officerId === "o1");
      expect(severeAlert?.severity).toBeDefined();
      expect(["high", "medium", "low"]).toContain(severeAlert?.severity);
    });

    it("returns empty array for balanced portfolios", () => {
      const officers: OfficerMetricsSummary[] = [
        { officerId: "o1", officerName: "Officer 1", constituentCount: 50, totalCapacity: 2000000, avgPriorityScore: 0.6 },
        { officerId: "o2", officerName: "Officer 2", constituentCount: 52, totalCapacity: 2100000, avgPriorityScore: 0.58 },
        { officerId: "o3", officerName: "Officer 3", constituentCount: 48, totalCapacity: 1900000, avgPriorityScore: 0.62 },
      ];

      const alerts = generateImbalanceAlerts(officers);

      expect(alerts.length).toBe(0);
    });
  });
});
