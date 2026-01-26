// T136: Unit tests for priority scoring engine
import { describe, it, expect } from "vitest";
import {
  calculatePriorityScore,
  calculateBatchPriorityScore,
  getPrioritySummary,
  DEFAULT_PRIORITY_WEIGHTS,
  type PriorityScoreInput,
} from "@/server/services/analysis/priority-scorer";

describe("Priority Scorer", () => {
  const referenceDate = new Date("2026-01-15");

  describe("calculatePriorityScore", () => {
    it("calculates high priority for high capacity, low lapse risk donors", () => {
      const input: PriorityScoreInput = {
        capacity: {
          estimatedCapacity: 500000, // $500K
        },
        lapseRisk: {
          score: 0.2, // Low lapse risk = high likelihood
        },
        timing: {
          fiscalYearEnd: new Date("2026-06-30"),
          campaigns: ["Annual Fund 2026"],
        },
        engagement: {
          gifts: [
            { amount: 5000, date: new Date("2025-12-01") },
            { amount: 5000, date: new Date("2025-06-01") },
          ],
          contacts: [
            { date: new Date("2025-11-15"), type: "meeting" },
          ],
        },
        referenceDate,
      };

      const result = calculatePriorityScore(input);

      expect(result.score).toBeGreaterThan(0.6);
      expect(result.factors).toBeDefined();
      expect(result.factors.length).toBeGreaterThanOrEqual(4);
    });

    it("calculates low priority for low capacity donors with high lapse risk", () => {
      const input: PriorityScoreInput = {
        capacity: {
          estimatedCapacity: 5000, // $5K - lower capacity
        },
        lapseRisk: {
          score: 0.8, // High lapse risk = low likelihood
        },
        timing: {
          fiscalYearEnd: new Date("2026-06-30"),
          campaigns: [],
        },
        engagement: {
          gifts: [
            { amount: 100, date: new Date("2023-06-01") }, // Old gift
          ],
          contacts: [],
        },
        referenceDate,
      };

      const result = calculatePriorityScore(input);

      expect(result.score).toBeLessThan(0.5);
    });

    it("provides explainable factors", () => {
      const input: PriorityScoreInput = {
        capacity: { estimatedCapacity: 100000 },
        lapseRisk: { score: 0.3 },
        timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
        engagement: {
          gifts: [{ amount: 1000, date: new Date("2025-10-01") }],
          contacts: [{ date: new Date("2025-12-01"), type: "call" }],
        },
        referenceDate,
      };

      const result = calculatePriorityScore(input);

      expect(result.factors).toHaveLength(4);
      expect(result.factors.map(f => f.name)).toEqual(
        expect.arrayContaining(["capacity", "likelihood", "timing", "recency"])
      );

      for (const factor of result.factors) {
        expect(factor).toHaveProperty("value");
        expect(factor).toHaveProperty("impact");
        expect(["high", "medium", "low"]).toContain(factor.impact);
        expect(factor).toHaveProperty("rawScore");
        expect(factor.rawScore).toBeGreaterThanOrEqual(0);
        expect(factor.rawScore).toBeLessThanOrEqual(1);
      }
    });

    it("handles missing capacity data with neutral score", () => {
      const input: PriorityScoreInput = {
        capacity: {
          estimatedCapacity: null,
        },
        lapseRisk: { score: 0.3 },
        timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
        engagement: {
          gifts: [{ amount: 1000, date: new Date("2025-10-01") }],
          contacts: [],
        },
        referenceDate,
      };

      const result = calculatePriorityScore(input);

      // Should still produce a valid score
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);

      // Capacity factor should indicate unknown
      const capacityFactor = result.factors.find(f => f.name === "capacity");
      expect(capacityFactor?.value).toContain("Unknown");
    });

    it("handles donors with no gifts", () => {
      const input: PriorityScoreInput = {
        capacity: { estimatedCapacity: 250000 },
        lapseRisk: { score: 0.5 },
        timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
        engagement: {
          gifts: [],
          contacts: [{ date: new Date("2025-12-01"), type: "meeting" }],
        },
        referenceDate,
      };

      const result = calculatePriorityScore(input);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it("handles donors with no contacts", () => {
      const input: PriorityScoreInput = {
        capacity: { estimatedCapacity: 250000 },
        lapseRisk: { score: 0.3 },
        timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
        engagement: {
          gifts: [{ amount: 5000, date: new Date("2025-10-01") }],
          contacts: [],
        },
        referenceDate,
      };

      const result = calculatePriorityScore(input);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it("supports custom weights", () => {
      const input: PriorityScoreInput = {
        capacity: { estimatedCapacity: 1000000 },
        lapseRisk: { score: 0.8 }, // High lapse risk
        timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
        engagement: {
          gifts: [{ amount: 10000, date: new Date("2024-01-01") }],
          contacts: [],
        },
        referenceDate,
        weights: {
          capacity: 0.6, // Prioritize capacity heavily
          likelihood: 0.1,
          timing: 0.2,
          recency: 0.1,
        },
      };

      const result = calculatePriorityScore(input);

      // With high capacity weight, should still score higher despite high lapse risk
      expect(result.score).toBeGreaterThan(0.4);
    });

    it("calculates confidence based on data quality", () => {
      // High data quality
      const highDataInput: PriorityScoreInput = {
        capacity: { estimatedCapacity: 250000, source: "wealth_screening" },
        lapseRisk: { score: 0.3, confidence: 0.9 },
        timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: ["Annual Fund"] },
        engagement: {
          gifts: [
            { amount: 5000, date: new Date("2025-12-01") },
            { amount: 5000, date: new Date("2025-06-01") },
            { amount: 5000, date: new Date("2024-12-01") },
          ],
          contacts: [
            { date: new Date("2025-11-01"), type: "meeting" },
            { date: new Date("2025-08-01"), type: "call" },
          ],
        },
        referenceDate,
      };

      const highDataResult = calculatePriorityScore(highDataInput);

      // Low data quality
      const lowDataInput: PriorityScoreInput = {
        capacity: { estimatedCapacity: null },
        lapseRisk: { score: 0.5, confidence: 0.3 },
        timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
        engagement: {
          gifts: [],
          contacts: [],
        },
        referenceDate,
      };

      const lowDataResult = calculatePriorityScore(lowDataInput);

      expect(highDataResult.confidence).toBeGreaterThan(lowDataResult.confidence);
    });

    it("generates recommended action", () => {
      const input: PriorityScoreInput = {
        capacity: { estimatedCapacity: 500000 },
        lapseRisk: { score: 0.2 },
        timing: { fiscalYearEnd: new Date("2026-02-15"), campaigns: ["Capital Campaign"] },
        engagement: {
          gifts: [{ amount: 10000, date: new Date("2025-12-01") }],
          contacts: [{ date: new Date("2025-11-01"), type: "meeting" }],
        },
        referenceDate,
      };

      const result = calculatePriorityScore(input);

      expect(result.recommendedAction).toBeDefined();
      expect(result.recommendedAction?.action).toBeDefined();
      expect(result.recommendedAction?.reason).toBeDefined();
    });
  });

  describe("DEFAULT_PRIORITY_WEIGHTS", () => {
    it("weights sum to 1.0", () => {
      const sum = Object.values(DEFAULT_PRIORITY_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it("has expected factors", () => {
      expect(DEFAULT_PRIORITY_WEIGHTS).toHaveProperty("capacity");
      expect(DEFAULT_PRIORITY_WEIGHTS).toHaveProperty("likelihood");
      expect(DEFAULT_PRIORITY_WEIGHTS).toHaveProperty("timing");
      expect(DEFAULT_PRIORITY_WEIGHTS).toHaveProperty("recency");
    });
  });

  describe("calculateBatchPriorityScore", () => {
    it("processes multiple constituents", () => {
      const constituents = [
        {
          id: "c1",
          capacity: { estimatedCapacity: 500000 },
          lapseRisk: { score: 0.2 },
          timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
          engagement: {
            gifts: [{ amount: 5000, date: new Date("2025-12-01") }],
            contacts: [],
          },
        },
        {
          id: "c2",
          capacity: { estimatedCapacity: 50000 },
          lapseRisk: { score: 0.6 },
          timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
          engagement: {
            gifts: [{ amount: 500, date: new Date("2024-06-01") }],
            contacts: [],
          },
        },
        {
          id: "c3",
          capacity: { estimatedCapacity: null },
          lapseRisk: { score: 0.5 },
          timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
          engagement: {
            gifts: [],
            contacts: [],
          },
        },
      ];

      const results = calculateBatchPriorityScore(constituents, referenceDate);

      expect(results).toHaveLength(3);
      expect(results[0]?.id).toBe("c1");
      expect(results[0]?.result.score).toBeGreaterThan(results[1]?.result.score ?? 0);
    });

    it("handles empty array", () => {
      const results = calculateBatchPriorityScore([], referenceDate);
      expect(results).toHaveLength(0);
    });

    it("returns results sorted by score descending", () => {
      const constituents = [
        {
          id: "low",
          capacity: { estimatedCapacity: 10000 },
          lapseRisk: { score: 0.8 },
          timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
          engagement: { gifts: [], contacts: [] },
        },
        {
          id: "high",
          capacity: { estimatedCapacity: 1000000 },
          lapseRisk: { score: 0.1 },
          timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
          engagement: {
            gifts: [{ amount: 10000, date: new Date("2025-12-01") }],
            contacts: [{ date: new Date("2025-12-01"), type: "meeting" }],
          },
        },
        {
          id: "medium",
          capacity: { estimatedCapacity: 100000 },
          lapseRisk: { score: 0.4 },
          timing: { fiscalYearEnd: new Date("2026-06-30"), campaigns: [] },
          engagement: {
            gifts: [{ amount: 1000, date: new Date("2025-06-01") }],
            contacts: [],
          },
        },
      ];

      const results = calculateBatchPriorityScore(constituents, referenceDate);

      // Results should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]?.result.score).toBeGreaterThanOrEqual(results[i]?.result.score ?? 0);
      }
    });
  });

  describe("getPrioritySummary", () => {
    it("summarizes priority distribution", () => {
      const results = [
        { score: 0.9, confidence: 0.8, factors: [], recommendedAction: null },
        { score: 0.85, confidence: 0.7, factors: [], recommendedAction: null },
        { score: 0.6, confidence: 0.6, factors: [], recommendedAction: null },
        { score: 0.4, confidence: 0.5, factors: [], recommendedAction: null },
        { score: 0.2, confidence: 0.9, factors: [], recommendedAction: null },
      ];

      const summary = getPrioritySummary(results);

      expect(summary.highPriorityCount).toBe(2); // >= 0.7
      expect(summary.mediumPriorityCount).toBe(2); // >= 0.4 < 0.7
      expect(summary.lowPriorityCount).toBe(1); // < 0.4
      expect(summary.averageScore).toBeCloseTo(0.59, 2);
      expect(summary.averageConfidence).toBeCloseTo(0.7, 2);
    });

    it("handles empty results", () => {
      const summary = getPrioritySummary([]);

      expect(summary.highPriorityCount).toBe(0);
      expect(summary.mediumPriorityCount).toBe(0);
      expect(summary.lowPriorityCount).toBe(0);
      expect(summary.averageScore).toBe(0);
      expect(summary.averageConfidence).toBe(0);
    });
  });
});
