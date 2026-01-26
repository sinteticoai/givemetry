// T234: Unit tests for portfolio metrics calculator
import { describe, it, expect } from "vitest";
import {
  calculatePortfolioMetrics,
  calculateOfficerMetrics,
  getPortfolioDistribution,
  calculateWorkloadScore,
  type PortfolioMetricsInput,
  type OfficerPortfolio,
} from "@/server/services/analysis/portfolio-metrics";

describe("Portfolio Metrics Calculator", () => {
  describe("calculateOfficerMetrics", () => {
    it("calculates metrics for a single officer", () => {
      const portfolio: OfficerPortfolio = {
        officerId: "officer-1",
        officerName: "John Smith",
        constituents: [
          { id: "c1", estimatedCapacity: 100000, priorityScore: 0.8, lapseRiskScore: 0.3 },
          { id: "c2", estimatedCapacity: 50000, priorityScore: 0.6, lapseRiskScore: 0.5 },
          { id: "c3", estimatedCapacity: 250000, priorityScore: 0.9, lapseRiskScore: 0.2 },
        ],
      };

      const result = calculateOfficerMetrics(portfolio);

      expect(result.officerId).toBe("officer-1");
      expect(result.officerName).toBe("John Smith");
      expect(result.constituentCount).toBe(3);
      expect(result.totalCapacity).toBe(400000);
      expect(result.averageCapacity).toBeCloseTo(133333.33, 0);
      expect(result.averagePriorityScore).toBeCloseTo(0.767, 2);
      expect(result.averageLapseRiskScore).toBeCloseTo(0.333, 2);
      expect(result.highPriorityCount).toBeGreaterThanOrEqual(0);
      expect(result.highRiskCount).toBeGreaterThanOrEqual(0);
    });

    it("handles empty portfolio", () => {
      const portfolio: OfficerPortfolio = {
        officerId: "officer-1",
        officerName: "Jane Doe",
        constituents: [],
      };

      const result = calculateOfficerMetrics(portfolio);

      expect(result.constituentCount).toBe(0);
      expect(result.totalCapacity).toBe(0);
      expect(result.averageCapacity).toBe(0);
      expect(result.averagePriorityScore).toBe(0);
    });

    it("handles constituents with null values", () => {
      const portfolio: OfficerPortfolio = {
        officerId: "officer-1",
        officerName: "Test Officer",
        constituents: [
          { id: "c1", estimatedCapacity: null, priorityScore: null, lapseRiskScore: null },
          { id: "c2", estimatedCapacity: 50000, priorityScore: 0.5, lapseRiskScore: 0.4 },
        ],
      };

      const result = calculateOfficerMetrics(portfolio);

      expect(result.constituentCount).toBe(2);
      expect(result.totalCapacity).toBe(50000);
    });
  });

  describe("calculatePortfolioMetrics", () => {
    it("calculates organization-wide portfolio metrics", () => {
      const input: PortfolioMetricsInput = {
        officers: [
          {
            officerId: "o1",
            officerName: "Officer 1",
            constituents: [
              { id: "c1", estimatedCapacity: 100000, priorityScore: 0.8, lapseRiskScore: 0.3 },
              { id: "c2", estimatedCapacity: 50000, priorityScore: 0.6, lapseRiskScore: 0.5 },
            ],
          },
          {
            officerId: "o2",
            officerName: "Officer 2",
            constituents: [
              { id: "c3", estimatedCapacity: 200000, priorityScore: 0.9, lapseRiskScore: 0.2 },
            ],
          },
        ],
        unassignedConstituents: [
          { id: "c4", estimatedCapacity: 75000, priorityScore: 0.7, lapseRiskScore: 0.4 },
        ],
        organizationId: "org-1",
      };

      const result = calculatePortfolioMetrics(input);

      expect(result.totalConstituents).toBe(4);
      expect(result.assignedConstituents).toBe(3);
      expect(result.unassignedConstituents).toBe(1);
      expect(result.totalOfficers).toBe(2);
      expect(result.totalCapacity).toBe(425000);
      expect(result.assignedCapacity).toBe(350000);
      expect(result.averagePortfolioSize).toBe(1.5); // 3 constituents / 2 officers
    });

    it("handles empty organization", () => {
      const input: PortfolioMetricsInput = {
        officers: [],
        unassignedConstituents: [],
        organizationId: "org-1",
      };

      const result = calculatePortfolioMetrics(input);

      expect(result.totalConstituents).toBe(0);
      expect(result.assignedConstituents).toBe(0);
      expect(result.totalOfficers).toBe(0);
      expect(result.averagePortfolioSize).toBe(0);
    });

    it("calculates portfolio distribution by capacity tiers", () => {
      const input: PortfolioMetricsInput = {
        officers: [
          {
            officerId: "o1",
            officerName: "Officer 1",
            constituents: [
              { id: "c1", estimatedCapacity: 1500000, priorityScore: 0.9, lapseRiskScore: 0.1 }, // $1M+
              { id: "c2", estimatedCapacity: 75000, priorityScore: 0.7, lapseRiskScore: 0.3 }, // $50K-$100K
            ],
          },
        ],
        unassignedConstituents: [],
        organizationId: "org-1",
      };

      const result = calculatePortfolioMetrics(input);

      expect(result.capacityDistribution).toBeDefined();
    });
  });

  describe("getPortfolioDistribution", () => {
    it("returns distribution by portfolio size", () => {
      const officers = [
        { officerId: "o1", constituentCount: 50, totalCapacity: 1000000 },
        { officerId: "o2", constituentCount: 30, totalCapacity: 500000 },
        { officerId: "o3", constituentCount: 80, totalCapacity: 2000000 },
      ];

      const distribution = getPortfolioDistribution(officers);

      expect(distribution.minSize).toBe(30);
      expect(distribution.maxSize).toBe(80);
      expect(distribution.medianSize).toBe(50);
      expect(distribution.standardDeviation).toBeGreaterThan(0);
    });

    it("handles single officer", () => {
      const officers = [
        { officerId: "o1", constituentCount: 50, totalCapacity: 1000000 },
      ];

      const distribution = getPortfolioDistribution(officers);

      expect(distribution.minSize).toBe(50);
      expect(distribution.maxSize).toBe(50);
      expect(distribution.medianSize).toBe(50);
      expect(distribution.standardDeviation).toBe(0);
    });

    it("handles empty officers list", () => {
      const distribution = getPortfolioDistribution([]);

      expect(distribution.minSize).toBe(0);
      expect(distribution.maxSize).toBe(0);
      expect(distribution.medianSize).toBe(0);
    });
  });

  describe("calculateWorkloadScore", () => {
    it("calculates workload score based on portfolio composition", () => {
      const portfolio = {
        constituentCount: 100,
        highPriorityCount: 20,
        highRiskCount: 15,
        totalCapacity: 5000000,
      };

      const averagePortfolioSize = 80;
      const averageCapacity = 4000000;

      const score = calculateWorkloadScore(portfolio, averagePortfolioSize, averageCapacity);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("returns higher score for overloaded portfolios", () => {
      const overloadedPortfolio = {
        constituentCount: 150,
        highPriorityCount: 40,
        highRiskCount: 30,
        totalCapacity: 10000000,
      };

      const normalPortfolio = {
        constituentCount: 80,
        highPriorityCount: 15,
        highRiskCount: 10,
        totalCapacity: 4000000,
      };

      const averageSize = 80;
      const averageCapacity = 4000000;

      const overloadedScore = calculateWorkloadScore(overloadedPortfolio, averageSize, averageCapacity);
      const normalScore = calculateWorkloadScore(normalPortfolio, averageSize, averageCapacity);

      expect(overloadedScore).toBeGreaterThan(normalScore);
    });

    it("handles zero averages", () => {
      const portfolio = {
        constituentCount: 50,
        highPriorityCount: 10,
        highRiskCount: 5,
        totalCapacity: 1000000,
      };

      const score = calculateWorkloadScore(portfolio, 0, 0);

      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});
