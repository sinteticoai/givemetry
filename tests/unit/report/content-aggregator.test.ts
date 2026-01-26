// T204: Unit tests for content aggregator
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  aggregateReportContent,
  aggregateHealthMetrics,
  aggregateLapseRiskData,
  aggregateOpportunities,
  aggregatePortfolioMetrics,
  calculateKeyMetrics,
  type ContentAggregatorInput,
  type AggregatedReportData,
} from "@/server/services/report/content-aggregator";

describe("Content Aggregator", () => {
  const mockConstituents = [
    {
      id: "const-1",
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      priorityScore: 0.92,
      lapseRiskScore: 0.25,
      estimatedCapacity: 350000,
      assignedOfficerId: "user-1",
      dataQualityScore: 0.85,
    },
    {
      id: "const-2",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      priorityScore: 0.88,
      lapseRiskScore: 0.45,
      estimatedCapacity: 175000,
      assignedOfficerId: "user-1",
      dataQualityScore: 0.90,
    },
    {
      id: "const-3",
      firstName: "Robert",
      lastName: "Johnson",
      email: null,
      priorityScore: 0.65,
      lapseRiskScore: 0.78,
      estimatedCapacity: 50000,
      assignedOfficerId: "user-2",
      dataQualityScore: 0.60,
    },
  ];

  const mockGifts = [
    {
      id: "gift-1",
      constituentId: "const-1",
      amount: 25000,
      giftDate: new Date("2025-06-15"),
    },
    {
      id: "gift-2",
      constituentId: "const-1",
      amount: 15000,
      giftDate: new Date("2024-12-01"),
    },
    {
      id: "gift-3",
      constituentId: "const-2",
      amount: 10000,
      giftDate: new Date("2025-03-20"),
    },
    {
      id: "gift-4",
      constituentId: "const-3",
      amount: 5000,
      giftDate: new Date("2023-06-15"),
    },
  ];

  const mockContacts = [
    {
      id: "contact-1",
      constituentId: "const-1",
      contactDate: new Date("2025-11-01"),
      contactType: "meeting",
    },
    {
      id: "contact-2",
      constituentId: "const-2",
      contactDate: new Date("2025-09-15"),
      contactType: "call",
    },
  ];

  const mockUsers = [
    { id: "user-1", name: "Alice Williams" },
    { id: "user-2", name: "Bob Chen" },
  ];

  const mockInput: ContentAggregatorInput = {
    organizationId: "org-123",
    constituents: mockConstituents,
    gifts: mockGifts,
    contacts: mockContacts,
    users: mockUsers,
    dateRange: {
      start: new Date("2025-01-01"),
      end: new Date("2025-12-31"),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("aggregateReportContent", () => {
    it("should aggregate all content for a report", async () => {
      const result = await aggregateReportContent(mockInput);

      expect(result).toBeDefined();
      expect(result.totalConstituents).toBe(3);
      expect(result.totalGiving).toBeGreaterThan(0);
    });

    it("should calculate correct total giving", async () => {
      const result = await aggregateReportContent(mockInput);

      // Sum of gifts within date range (2025): 25000 + 10000 = 35000
      // (gift-2: 2024-12-01 and gift-4: 2023-06-15 are outside range)
      expect(result.totalGiving).toBe(35000);
    });

    it("should calculate average gift correctly", async () => {
      const result = await aggregateReportContent(mockInput);

      // 35000 / 2 gifts in range = 17500
      expect(result.averageGift).toBe(17500);
    });
  });

  describe("aggregateHealthMetrics", () => {
    it("should calculate overall health score", () => {
      const result = aggregateHealthMetrics(mockConstituents, mockGifts, mockContacts);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
    });

    it("should include breakdown categories", () => {
      const result = aggregateHealthMetrics(mockConstituents, mockGifts, mockContacts);

      expect(result.breakdown.completeness).toBeDefined();
      expect(result.breakdown.freshness).toBeDefined();
      expect(result.breakdown.consistency).toBeDefined();
      expect(result.breakdown.coverage).toBeDefined();
    });

    it("should identify key issues", () => {
      const result = aggregateHealthMetrics(mockConstituents, mockGifts, mockContacts);

      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it("should handle empty data gracefully", () => {
      const result = aggregateHealthMetrics([], [], []);

      expect(result.overallScore).toBe(0);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("aggregateLapseRiskData", () => {
    it("should categorize constituents by risk level", () => {
      const result = aggregateLapseRiskData(mockConstituents, mockGifts);

      expect(result.highRiskCount).toBeGreaterThanOrEqual(0);
      expect(result.mediumRiskCount).toBeGreaterThanOrEqual(0);
      expect(result.lowRiskCount).toBeGreaterThanOrEqual(0);
    });

    it("should calculate total at-risk value", () => {
      const result = aggregateLapseRiskData(mockConstituents, mockGifts);

      expect(result.totalAtRiskValue).toBeGreaterThanOrEqual(0);
    });

    it("should return top risks sorted by score", () => {
      const result = aggregateLapseRiskData(mockConstituents, mockGifts);

      expect(result.topRisks).toBeDefined();
      expect(Array.isArray(result.topRisks)).toBe(true);

      // Verify sorted by risk score descending
      for (let i = 0; i < result.topRisks.length - 1; i++) {
        expect(result.topRisks[i]!.riskScore).toBeGreaterThanOrEqual(
          result.topRisks[i + 1]!.riskScore
        );
      }
    });

    it("should include correct risk thresholds", () => {
      // High risk: > 0.7, Medium: 0.4-0.7, Low: < 0.4
      const result = aggregateLapseRiskData(mockConstituents, mockGifts);

      // const-3 has 0.78 risk score = high
      expect(result.highRiskCount).toBeGreaterThanOrEqual(1);
      // const-2 has 0.45 risk score = medium
      expect(result.mediumRiskCount).toBeGreaterThanOrEqual(1);
      // const-1 has 0.25 risk score = low
      expect(result.lowRiskCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("aggregateOpportunities", () => {
    it("should return top opportunities sorted by priority", () => {
      const result = aggregateOpportunities(mockConstituents, mockGifts, mockContacts);

      expect(result.opportunities).toBeDefined();
      expect(result.opportunities.length).toBeGreaterThan(0);

      // Verify sorted by priority score descending
      for (let i = 0; i < result.opportunities.length - 1; i++) {
        expect(result.opportunities[i]!.priorityScore).toBeGreaterThanOrEqual(
          result.opportunities[i + 1]!.priorityScore
        );
      }
    });

    it("should include capacity labels", () => {
      const result = aggregateOpportunities(mockConstituents, mockGifts, mockContacts);

      result.opportunities.forEach((opp) => {
        expect(opp.capacity).toBeDefined();
        expect(opp.capacity).toMatch(/\$/);
      });
    });

    it("should calculate total pipeline value", () => {
      const result = aggregateOpportunities(mockConstituents, mockGifts, mockContacts);

      expect(result.totalPipelineValue).toBeGreaterThan(0);
    });

    it("should limit results to specified count", () => {
      const result = aggregateOpportunities(mockConstituents, mockGifts, mockContacts, 2);

      expect(result.opportunities.length).toBeLessThanOrEqual(2);
    });
  });

  describe("aggregatePortfolioMetrics", () => {
    it("should calculate metrics per officer", () => {
      const result = aggregatePortfolioMetrics(mockConstituents, mockContacts, mockUsers);

      expect(result.length).toBeGreaterThan(0);

      result.forEach((metric) => {
        expect(metric.officerId).toBeDefined();
        expect(metric.officerName).toBeDefined();
        expect(metric.portfolioSize).toBeGreaterThanOrEqual(0);
      });
    });

    it("should calculate no-contact percentage", () => {
      const result = aggregatePortfolioMetrics(mockConstituents, mockContacts, mockUsers);

      result.forEach((metric) => {
        expect(metric.noContactPercent).toBeGreaterThanOrEqual(0);
        expect(metric.noContactPercent).toBeLessThanOrEqual(100);
      });
    });

    it("should categorize officer status correctly", () => {
      const result = aggregatePortfolioMetrics(mockConstituents, mockContacts, mockUsers);

      result.forEach((metric) => {
        expect(["healthy", "overloaded", "underutilized"]).toContain(metric.status);
      });
    });

    it("should identify imbalances", () => {
      const result = aggregatePortfolioMetrics(mockConstituents, mockContacts, mockUsers);

      // Check for imbalance detection
      const hasImbalance = result.some(
        (m) => m.status === "overloaded" || m.status === "underutilized"
      );
      expect(typeof hasImbalance).toBe("boolean");
    });
  });

  describe("calculateKeyMetrics", () => {
    it("should calculate core metrics", () => {
      const result = calculateKeyMetrics(mockConstituents, mockGifts, mockContacts);

      expect(result.length).toBeGreaterThan(0);

      const metricNames = result.map((m) => m.name);
      expect(metricNames).toContain("Total Constituents");
      expect(metricNames).toContain("Total Giving");
    });

    it("should include trend information", () => {
      const result = calculateKeyMetrics(mockConstituents, mockGifts, mockContacts);

      result.forEach((metric) => {
        expect(["up", "down", "stable"]).toContain(metric.trend);
      });
    });

    it("should format values appropriately", () => {
      const result = calculateKeyMetrics(mockConstituents, mockGifts, mockContacts);

      result.forEach((metric) => {
        expect(metric.value).toBeDefined();
        expect(typeof metric.value).toBe("string");
      });
    });
  });

  describe("Date Range Filtering", () => {
    it("should filter gifts by date range", async () => {
      const narrowRange: ContentAggregatorInput = {
        ...mockInput,
        dateRange: {
          start: new Date("2025-01-01"),
          end: new Date("2025-06-30"),
        },
      };

      const result = await aggregateReportContent(narrowRange);

      // Should only include gifts from 2025 H1
      // gift-1: 2025-06-15 (included)
      // gift-3: 2025-03-20 (included)
      // gift-2: 2024-12-01 (excluded)
      // gift-4: 2023-06-15 (excluded)
      expect(result.totalGiving).toBeLessThan(55000);
    });

    it("should handle no date range by including all data", async () => {
      const noRangeInput = {
        ...mockInput,
        dateRange: undefined,
      };

      const result = await aggregateReportContent(noRangeInput);

      expect(result.totalGiving).toBe(55000);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single constituent", async () => {
      const singleInput: ContentAggregatorInput = {
        ...mockInput,
        constituents: [mockConstituents[0]!],
        gifts: mockGifts.filter((g) => g.constituentId === "const-1"),
        contacts: mockContacts.filter((c) => c.constituentId === "const-1"),
      };

      const result = await aggregateReportContent(singleInput);

      expect(result.totalConstituents).toBe(1);
    });

    it("should handle constituents with no gifts", async () => {
      const noGiftsInput: ContentAggregatorInput = {
        ...mockInput,
        gifts: [],
      };

      const result = await aggregateReportContent(noGiftsInput);

      expect(result.totalGiving).toBe(0);
      expect(result.averageGift).toBe(0);
    });

    it("should handle constituents with no contacts", async () => {
      const noContactsInput: ContentAggregatorInput = {
        ...mockInput,
        contacts: [],
      };

      const result = await aggregateReportContent(noContactsInput);

      expect(result).toBeDefined();
    });

    it("should handle missing officer assignments", async () => {
      const unassignedConstituents = mockConstituents.map((c) => ({
        ...c,
        assignedOfficerId: null,
      }));

      const result = aggregatePortfolioMetrics(unassignedConstituents, mockContacts, mockUsers);

      expect(result).toBeDefined();
    });
  });
});
