// T203: Unit tests for report generator
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateExecutiveReport,
  generatePortfolioHealthReport,
  generateLapseRiskReport,
  generatePrioritiesReport,
  type ReportGeneratorInput,
  type ExecutiveReportContent,
} from "@/server/services/report/report-generator";

describe("Report Generator", () => {
  const mockInput: ReportGeneratorInput = {
    organizationId: "org-123",
    organizationName: "Test University",
    userId: "user-123",
    reportType: "executive_summary",
    sections: [
      "portfolioHealth",
      "topOpportunities",
      "riskAlerts",
      "keyMetrics",
      "recommendedActions",
      "portfolioBalance",
    ],
    dateRange: {
      start: new Date("2025-01-01"),
      end: new Date("2025-12-31"),
    },
    aggregatedData: {
      totalConstituents: 1500,
      totalGiving: 2500000,
      averageGift: 1667,
      healthScore: 0.78,
      healthBreakdown: {
        completeness: 0.82,
        freshness: 0.75,
        consistency: 0.80,
        coverage: 0.73,
      },
      lapseRiskSummary: {
        highRiskCount: 45,
        mediumRiskCount: 120,
        lowRiskCount: 335,
        totalAtRiskValue: 450000,
      },
      topOpportunities: [
        {
          id: "const-1",
          name: "John Smith",
          capacity: "$250K-$500K",
          priorityScore: 0.92,
          recommendedAction: "Schedule meeting",
          reason: "High capacity, recent engagement",
        },
        {
          id: "const-2",
          name: "Jane Doe",
          capacity: "$100K-$250K",
          priorityScore: 0.88,
          recommendedAction: "Thank you visit",
          reason: "Major gift potential",
        },
      ],
      topRisks: [
        {
          id: "const-3",
          name: "Robert Johnson",
          riskLevel: "high",
          lastGift: "2023-06-15",
          lifetimeValue: 75000,
          primaryFactor: "18 months since last gift",
        },
      ],
      portfolioMetrics: [
        {
          officerId: "user-1",
          officerName: "Alice Williams",
          portfolioSize: 150,
          totalCapacity: "$15M",
          noContactPercent: 12,
          status: "healthy" as const,
        },
        {
          officerId: "user-2",
          officerName: "Bob Chen",
          portfolioSize: 220,
          totalCapacity: "$22M",
          noContactPercent: 28,
          status: "overloaded" as const,
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateExecutiveReport", () => {
    it("should generate a complete executive report", async () => {
      const result = await generateExecutiveReport(mockInput);

      expect(result).toBeDefined();
      expect(result.header).toBeDefined();
      expect(result.header.title).toContain("Executive");
      expect(result.header.organization).toBe("Test University");
    });

    it("should include all requested sections", async () => {
      const result = await generateExecutiveReport(mockInput);

      expect(result.portfolioHealth).toBeDefined();
      expect(result.topOpportunities).toBeDefined();
      expect(result.riskAlerts).toBeDefined();
      expect(result.keyMetrics).toBeDefined();
      expect(result.recommendedActions).toBeDefined();
      expect(result.portfolioBalance).toBeDefined();
    });

    it("should exclude sections not in the request", async () => {
      const limitedInput = {
        ...mockInput,
        sections: ["portfolioHealth", "keyMetrics"],
      };

      const result = await generateExecutiveReport(limitedInput);

      expect(result.portfolioHealth).toBeDefined();
      expect(result.keyMetrics).toBeDefined();
      expect(result.topOpportunities).toBeUndefined();
      expect(result.riskAlerts).toBeUndefined();
    });

    it("should include footer with disclaimer", async () => {
      const result = await generateExecutiveReport(mockInput);

      expect(result.footer).toBeDefined();
      expect(result.footer.disclaimer).toBeTruthy();
      expect(result.footer.generatedBy).toBe("GiveMetry");
      expect(result.footer.confidentiality).toBeTruthy();
    });

    it("should calculate correct health score breakdown", async () => {
      const result = await generateExecutiveReport(mockInput);

      expect(result.portfolioHealth?.overallScore).toBe(0.78);
      expect(result.portfolioHealth?.scoreBreakdown).toHaveLength(4);
    });
  });

  describe("generatePortfolioHealthReport", () => {
    it("should generate portfolio health report", async () => {
      const result = await generatePortfolioHealthReport(mockInput);

      expect(result).toBeDefined();
      expect(result.header.title).toContain("Portfolio Health");
    });

    it("should include detailed health metrics", async () => {
      const result = await generatePortfolioHealthReport(mockInput);

      expect(result.portfolioHealth).toBeDefined();
      expect(result.portfolioHealth?.scoreBreakdown).toBeDefined();
      expect(result.portfolioHealth?.keyIssues).toBeDefined();
    });
  });

  describe("generateLapseRiskReport", () => {
    it("should generate lapse risk report", async () => {
      const result = await generateLapseRiskReport(mockInput);

      expect(result).toBeDefined();
      expect(result.header.title).toContain("Lapse Risk");
    });

    it("should include risk summary", async () => {
      const result = await generateLapseRiskReport(mockInput);

      expect(result.riskAlerts).toBeDefined();
      expect(result.riskAlerts?.highRiskCount).toBe(45);
      expect(result.riskAlerts?.totalAtRiskValue).toBe(450000);
    });
  });

  describe("generatePrioritiesReport", () => {
    it("should generate priorities report", async () => {
      const result = await generatePrioritiesReport(mockInput);

      expect(result).toBeDefined();
      expect(result.header.title).toContain("Priorities");
    });

    it("should include top opportunities", async () => {
      const result = await generatePrioritiesReport(mockInput);

      expect(result.topOpportunities).toBeDefined();
      expect(result.topOpportunities?.opportunities).toHaveLength(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty aggregated data", async () => {
      const emptyInput: ReportGeneratorInput = {
        ...mockInput,
        aggregatedData: {
          totalConstituents: 0,
          totalGiving: 0,
          averageGift: 0,
          healthScore: 0,
          healthBreakdown: {
            completeness: 0,
            freshness: 0,
            consistency: 0,
            coverage: 0,
          },
          lapseRiskSummary: {
            highRiskCount: 0,
            mediumRiskCount: 0,
            lowRiskCount: 0,
            totalAtRiskValue: 0,
          },
          topOpportunities: [],
          topRisks: [],
          portfolioMetrics: [],
        },
      };

      const result = await generateExecutiveReport(emptyInput);

      expect(result).toBeDefined();
      expect(result.keyMetrics?.metrics).toBeDefined();
    });

    it("should handle missing date range", async () => {
      const noDateRangeInput = {
        ...mockInput,
        dateRange: undefined,
      };

      const result = await generateExecutiveReport(noDateRangeInput);

      expect(result).toBeDefined();
      expect(result.header.dateRange).toBeTruthy();
    });

    it("should handle custom title and commentary", async () => {
      const customInput = {
        ...mockInput,
        customTitle: "Q4 Board Report",
        customCommentary: "Strong performance this quarter.",
      };

      const result = await generateExecutiveReport(customInput);

      expect(result.header.title).toBe("Q4 Board Report");
    });
  });

  describe("Data Formatting", () => {
    it("should format currency values correctly", async () => {
      const result = await generateExecutiveReport(mockInput);

      // Check that opportunity capacities are formatted
      const opportunity = result.topOpportunities?.opportunities[0];
      expect(opportunity?.capacity).toMatch(/\$/);
    });

    it("should format dates consistently", async () => {
      const result = await generateExecutiveReport(mockInput);

      expect(result.header.generatedAt).toBeDefined();
      expect(new Date(result.header.generatedAt).getTime()).not.toBeNaN();
    });

    it("should calculate trend indicators", async () => {
      const result = await generateExecutiveReport(mockInput);

      expect(result.portfolioHealth?.trend).toMatch(/up|down|stable/);
    });
  });
});
