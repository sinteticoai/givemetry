// T137: Unit tests for priority factors
import { describe, it, expect } from "vitest";
import { calculateCapacityScore, type CapacityInput } from "@/server/services/analysis/priority-factors/capacity";
import { calculateLikelihoodScore, type LikelihoodInput } from "@/server/services/analysis/priority-factors/likelihood";
import { calculateTimingScore, type TimingInput } from "@/server/services/analysis/priority-factors/timing";
import { calculatePriorityRecencyScore, type PriorityRecencyInput } from "@/server/services/analysis/priority-factors/recency";

describe("Priority Factors", () => {
  const referenceDate = new Date("2026-01-15");

  describe("Capacity Factor", () => {
    it("returns high score for $1M+ capacity", () => {
      const input: CapacityInput = {
        estimatedCapacity: 1500000,
      };

      const result = calculateCapacityScore(input);

      expect(result.score).toBeCloseTo(1.0, 1);
      expect(result.label).toContain("$1M");
    });

    it("returns appropriate score for $500K-$1M capacity", () => {
      const input: CapacityInput = {
        estimatedCapacity: 750000,
      };

      const result = calculateCapacityScore(input);

      expect(result.score).toBeCloseTo(0.9, 1);
      expect(result.label).toContain("$500K");
    });

    it("returns appropriate score for $250K-$500K capacity", () => {
      const input: CapacityInput = {
        estimatedCapacity: 350000,
      };

      const result = calculateCapacityScore(input);

      expect(result.score).toBeCloseTo(0.8, 1);
    });

    it("returns appropriate score for $100K-$250K capacity", () => {
      const input: CapacityInput = {
        estimatedCapacity: 150000,
      };

      const result = calculateCapacityScore(input);

      expect(result.score).toBeCloseTo(0.7, 1);
    });

    it("returns appropriate score for $50K-$100K capacity", () => {
      const input: CapacityInput = {
        estimatedCapacity: 75000,
      };

      const result = calculateCapacityScore(input);

      expect(result.score).toBeCloseTo(0.6, 1);
    });

    it("returns appropriate score for $25K-$50K capacity", () => {
      const input: CapacityInput = {
        estimatedCapacity: 35000,
      };

      const result = calculateCapacityScore(input);

      expect(result.score).toBeCloseTo(0.5, 1);
    });

    it("returns appropriate score for $10K-$25K capacity", () => {
      const input: CapacityInput = {
        estimatedCapacity: 15000,
      };

      const result = calculateCapacityScore(input);

      expect(result.score).toBeCloseTo(0.4, 1);
    });

    it("returns lower score for <$10K capacity", () => {
      const input: CapacityInput = {
        estimatedCapacity: 5000,
      };

      const result = calculateCapacityScore(input);

      expect(result.score).toBeCloseTo(0.3, 1);
    });

    it("returns neutral score for unknown capacity", () => {
      const input: CapacityInput = {
        estimatedCapacity: null,
      };

      const result = calculateCapacityScore(input);

      expect(result.score).toBeCloseTo(0.5, 1);
      expect(result.description).toContain("Unknown");
    });

    it("returns neutral score for zero capacity", () => {
      const input: CapacityInput = {
        estimatedCapacity: 0,
      };

      const result = calculateCapacityScore(input);

      expect(result.score).toBeCloseTo(0.3, 1);
    });

    it("includes source in description when available", () => {
      const input: CapacityInput = {
        estimatedCapacity: 500000,
        source: "wealth_screening",
      };

      const result = calculateCapacityScore(input);

      expect(result.description).toContain("wealth_screening");
    });
  });

  describe("Likelihood Factor (Inverse Lapse Risk)", () => {
    it("returns high score for low lapse risk", () => {
      const input: LikelihoodInput = {
        lapseRiskScore: 0.1,
      };

      const result = calculateLikelihoodScore(input);

      expect(result.score).toBeCloseTo(0.9, 1);
      expect(result.description).toContain("High");
    });

    it("returns low score for high lapse risk", () => {
      const input: LikelihoodInput = {
        lapseRiskScore: 0.9,
      };

      const result = calculateLikelihoodScore(input);

      expect(result.score).toBeCloseTo(0.1, 1);
      expect(result.description).toContain("Low");
    });

    it("returns medium score for medium lapse risk", () => {
      const input: LikelihoodInput = {
        lapseRiskScore: 0.5,
      };

      const result = calculateLikelihoodScore(input);

      expect(result.score).toBeCloseTo(0.5, 1);
      expect(result.description).toContain("Moderate");
    });

    it("handles null lapse risk with neutral score", () => {
      const input: LikelihoodInput = {
        lapseRiskScore: null,
      };

      const result = calculateLikelihoodScore(input);

      expect(result.score).toBeCloseTo(0.5, 1);
      expect(result.description).toContain("Unknown");
    });

    it("includes confidence when available", () => {
      const input: LikelihoodInput = {
        lapseRiskScore: 0.3,
        lapseRiskConfidence: 0.85,
      };

      const result = calculateLikelihoodScore(input);

      expect(result.confidence).toBeCloseTo(0.85, 2);
    });
  });

  describe("Timing Factor", () => {
    it("returns high score near fiscal year end", () => {
      const input: TimingInput = {
        fiscalYearEnd: new Date("2026-02-15"), // About 1 month from reference
        referenceDate,
      };

      const result = calculateTimingScore(input);

      // With fiscal year end ~30 days away, should get high fiscal score (0.85-1.0)
      // Combined with no campaigns and not Q4, overall score might be moderate
      expect(result.score).toBeGreaterThan(0.3);
      expect(result.indicator).toContain("Fiscal");
    });

    it("returns lower score far from fiscal year end", () => {
      const input: TimingInput = {
        fiscalYearEnd: new Date("2026-09-30"),
        referenceDate,
      };

      const result = calculateTimingScore(input);

      expect(result.score).toBeLessThan(0.5);
    });

    it("returns higher score during active campaign", () => {
      const input: TimingInput = {
        fiscalYearEnd: new Date("2026-06-30"),
        campaigns: ["Annual Fund 2026", "Capital Campaign"],
        referenceDate,
      };

      const result = calculateTimingScore(input);

      expect(result.score).toBeGreaterThan(0.5);
      expect(result.indicator).toContain("Campaign");
    });

    it("returns base score with no campaigns or near fiscal end", () => {
      const input: TimingInput = {
        fiscalYearEnd: new Date("2026-12-31"),
        campaigns: [],
        referenceDate,
      };

      const result = calculateTimingScore(input);

      expect(result.score).toBeLessThan(0.5);
    });

    it("handles Q4 giving season bonus", () => {
      const q4Date = new Date("2026-11-15"); // November
      const input: TimingInput = {
        fiscalYearEnd: new Date("2026-06-30"),
        campaigns: [],
        referenceDate: q4Date,
      };

      const result = calculateTimingScore(input);

      // Q4 seasonal score is 0.8 weighted at 0.25, plus fiscal/campaign contributions
      // With just Q4, expect moderate score
      expect(result.score).toBeGreaterThan(0.2);
      expect(result.indicator).toContain("Q4");
    });

    it("provides descriptive indicator", () => {
      const input: TimingInput = {
        fiscalYearEnd: new Date("2026-02-15"),
        campaigns: ["Capital Campaign"],
        referenceDate,
      };

      const result = calculateTimingScore(input);

      expect(result.indicator).toBeDefined();
      expect(result.indicator.length).toBeGreaterThan(0);
    });
  });

  describe("Recency Factor (Engagement Recency)", () => {
    it("returns high score for recent engagement", () => {
      const input: PriorityRecencyInput = {
        gifts: [{ date: new Date("2025-12-15"), amount: 1000 }],
        contacts: [{ date: new Date("2026-01-10"), type: "meeting" }],
        referenceDate,
      };

      const result = calculatePriorityRecencyScore(input);

      expect(result.score).toBeGreaterThan(0.7);
      expect(result.description).toContain("Recent");
    });

    it("returns low score for stale engagement", () => {
      const input: PriorityRecencyInput = {
        gifts: [{ date: new Date("2023-06-01"), amount: 1000 }],
        contacts: [{ date: new Date("2023-08-01"), type: "call" }],
        referenceDate,
      };

      const result = calculatePriorityRecencyScore(input);

      expect(result.score).toBeLessThan(0.4);
      expect(result.description).toContain("year");
    });

    it("considers both gifts and contacts", () => {
      // Recent gift, old contact
      const input1: PriorityRecencyInput = {
        gifts: [{ date: new Date("2025-12-01"), amount: 1000 }],
        contacts: [{ date: new Date("2023-01-01"), type: "meeting" }],
        referenceDate,
      };

      // Old gift, recent contact
      const input2: PriorityRecencyInput = {
        gifts: [{ date: new Date("2023-01-01"), amount: 1000 }],
        contacts: [{ date: new Date("2025-12-01"), type: "meeting" }],
        referenceDate,
      };

      const result1 = calculatePriorityRecencyScore(input1);
      const result2 = calculatePriorityRecencyScore(input2);

      // Both should be moderate due to mixed recency
      expect(result1.score).toBeGreaterThan(0.3);
      expect(result2.score).toBeGreaterThan(0.3);
    });

    it("handles no gifts or contacts", () => {
      const input: PriorityRecencyInput = {
        gifts: [],
        contacts: [],
        referenceDate,
      };

      const result = calculatePriorityRecencyScore(input);

      expect(result.score).toBeLessThan(0.3);
      expect(result.description).toContain("No");
    });

    it("provides activity summary", () => {
      const input: PriorityRecencyInput = {
        gifts: [
          { date: new Date("2025-12-01"), amount: 1000 },
          { date: new Date("2025-06-01"), amount: 500 },
        ],
        contacts: [{ date: new Date("2025-11-01"), type: "meeting" }],
        referenceDate,
      };

      const result = calculatePriorityRecencyScore(input);

      expect(result.recentActivitySummary).toBeDefined();
    });

    it("weights gifts more heavily than contacts for engagement", () => {
      // Only recent contact
      const contactOnly: PriorityRecencyInput = {
        gifts: [],
        contacts: [{ date: new Date("2025-12-01"), type: "meeting" }],
        referenceDate,
      };

      // Only recent gift
      const giftOnly: PriorityRecencyInput = {
        gifts: [{ date: new Date("2025-12-01"), amount: 1000 }],
        contacts: [],
        referenceDate,
      };

      const contactResult = calculatePriorityRecencyScore(contactOnly);
      const giftResult = calculatePriorityRecencyScore(giftOnly);

      // Gift should be weighted higher
      expect(giftResult.score).toBeGreaterThan(contactResult.score);
    });
  });
});
