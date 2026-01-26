// T115: Unit tests for lapse risk engine
import { describe, it, expect } from "vitest";
import {
  calculateLapseRiskScore,
  calculateBatchLapseRisk,
  getLapseRiskSummary,
  getRiskLevel,
  type LapseRiskInput,
} from "@/server/services/analysis/lapse-risk";

describe("Lapse Risk Engine", () => {
  const referenceDate = new Date("2026-01-15");

  describe("calculateLapseRiskScore", () => {
    it("returns high risk for donors with no recent gifts or contacts", () => {
      const input: LapseRiskInput = {
        gifts: [
          { amount: 1000, date: new Date("2023-06-01") }, // 2.5 years ago
        ],
        contacts: [],
        referenceDate,
      };

      const result = calculateLapseRiskScore(input);

      expect(result.score).toBeGreaterThan(0.6);
      expect(result.riskLevel).toBe("high");
    });

    it("returns low risk for recently active donors", () => {
      const input: LapseRiskInput = {
        gifts: [
          { amount: 1000, date: new Date("2025-12-01") }, // 1.5 months ago
          { amount: 1000, date: new Date("2025-06-01") },
          { amount: 1000, date: new Date("2024-12-01") },
          { amount: 1000, date: new Date("2024-06-01") },
        ],
        contacts: [
          { date: new Date("2025-11-01"), type: "meeting" },
        ],
        referenceDate,
      };

      const result = calculateLapseRiskScore(input);

      expect(result.score).toBeLessThan(0.4);
      expect(result.riskLevel).toBe("low");
    });

    it("handles donors with no gift history", () => {
      const input: LapseRiskInput = {
        gifts: [],
        contacts: [{ date: new Date("2025-12-01"), type: "call" }],
        referenceDate,
      };

      const result = calculateLapseRiskScore(input);

      expect(result.score).toBeGreaterThanOrEqual(0.7);
      expect(result.factors).toHaveLength(4);
    });

    it("calculates confidence based on data availability", () => {
      // Low data = low confidence
      const lowDataInput: LapseRiskInput = {
        gifts: [{ amount: 500, date: new Date("2025-06-01") }],
        contacts: [],
        referenceDate,
      };

      const lowDataResult = calculateLapseRiskScore(lowDataInput);

      // High data = high confidence
      const highDataInput: LapseRiskInput = {
        gifts: [
          { amount: 1000, date: new Date("2025-12-01") },
          { amount: 1000, date: new Date("2025-06-01") },
          { amount: 1000, date: new Date("2024-12-01") },
          { amount: 1000, date: new Date("2024-06-01") },
          { amount: 1000, date: new Date("2023-12-01") },
          { amount: 1000, date: new Date("2023-06-01") },
          { amount: 1000, date: new Date("2022-12-01") },
          { amount: 1000, date: new Date("2022-06-01") },
          { amount: 1000, date: new Date("2021-12-01") },
          { amount: 1000, date: new Date("2021-06-01") },
        ],
        contacts: [
          { date: new Date("2025-11-01"), type: "meeting" },
          { date: new Date("2025-08-01"), type: "call" },
          { date: new Date("2025-05-01"), type: "email" },
        ],
        referenceDate,
      };

      const highDataResult = calculateLapseRiskScore(highDataInput);

      expect(highDataResult.confidence).toBeGreaterThan(lowDataResult.confidence);
    });

    it("provides explainable factors", () => {
      const input: LapseRiskInput = {
        gifts: [
          { amount: 1000, date: new Date("2024-06-01") }, // ~19 months ago
        ],
        contacts: [
          { date: new Date("2025-03-01"), type: "call" }, // ~10 months ago
        ],
        referenceDate,
      };

      const result = calculateLapseRiskScore(input);

      expect(result.factors).toHaveLength(4);
      expect(result.factors.map(f => f.name)).toEqual(
        expect.arrayContaining(["recency", "frequency", "monetary", "contact"])
      );

      // Each factor should have required fields
      for (const factor of result.factors) {
        expect(factor).toHaveProperty("value");
        expect(factor).toHaveProperty("impact");
        expect(["high", "medium", "low"]).toContain(factor.impact);
      }
    });

    it("predicts lapse window based on score", () => {
      // High risk should have shorter window
      const highRiskInput: LapseRiskInput = {
        gifts: [{ amount: 500, date: new Date("2023-01-01") }],
        contacts: [],
        referenceDate,
      };

      const highRiskResult = calculateLapseRiskScore(highRiskInput);

      // Low risk should have longer window
      const lowRiskInput: LapseRiskInput = {
        gifts: [
          { amount: 1000, date: new Date("2025-12-01") },
          { amount: 1000, date: new Date("2025-06-01") },
          { amount: 1000, date: new Date("2024-12-01") },
        ],
        contacts: [{ date: new Date("2025-11-01"), type: "meeting" }],
        referenceDate,
      };

      const lowRiskResult = calculateLapseRiskScore(lowRiskInput);

      expect(highRiskResult.predictedLapseWindow).toBeDefined();
      expect(lowRiskResult.predictedLapseWindow).toBeDefined();
    });

    it("supports custom weights", () => {
      const input: LapseRiskInput = {
        gifts: [{ amount: 1000, date: new Date("2024-06-01") }],
        contacts: [{ date: new Date("2025-10-01"), type: "meeting" }],
        referenceDate,
        weights: {
          recency: 0.5, // Higher weight on recency
          frequency: 0.2,
          monetary: 0.2,
          contact: 0.1,
        },
      };

      const resultWithCustomWeights = calculateLapseRiskScore(input);

      const inputDefault: LapseRiskInput = {
        gifts: [{ amount: 1000, date: new Date("2024-06-01") }],
        contacts: [{ date: new Date("2025-10-01"), type: "meeting" }],
        referenceDate,
      };

      const resultDefault = calculateLapseRiskScore(inputDefault);

      // Scores should differ due to weight changes
      expect(resultWithCustomWeights.score).not.toBe(resultDefault.score);
    });
  });

  describe("getRiskLevel", () => {
    it("returns high for scores >= 0.7", () => {
      expect(getRiskLevel(0.85)).toBe("high");
      expect(getRiskLevel(0.7)).toBe("high");
      expect(getRiskLevel(1.0)).toBe("high");
    });

    it("returns medium for scores 0.4-0.69", () => {
      expect(getRiskLevel(0.5)).toBe("medium");
      expect(getRiskLevel(0.4)).toBe("medium");
      expect(getRiskLevel(0.69)).toBe("medium");
    });

    it("returns low for scores < 0.4", () => {
      expect(getRiskLevel(0.3)).toBe("low");
      expect(getRiskLevel(0.1)).toBe("low");
      expect(getRiskLevel(0)).toBe("low");
    });
  });

  describe("calculateBatchLapseRisk", () => {
    it("processes multiple constituents", () => {
      const constituents = [
        {
          id: "c1",
          gifts: [{ amount: 1000, date: new Date("2025-12-01") }],
          contacts: [],
        },
        {
          id: "c2",
          gifts: [{ amount: 500, date: new Date("2023-06-01") }],
          contacts: [{ date: new Date("2024-01-01"), type: "call" }],
        },
        {
          id: "c3",
          gifts: [],
          contacts: [],
        },
      ];

      const results = calculateBatchLapseRisk(constituents, referenceDate);

      expect(results).toHaveLength(3);
      expect(results[0]?.id).toBe("c1");
      expect(results[1]?.id).toBe("c2");
      expect(results[2]?.id).toBe("c3");

      // Each result should have a valid result object
      for (const { result } of results) {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.riskLevel).toBeDefined();
      }
    });

    it("handles empty array", () => {
      const results = calculateBatchLapseRisk([], referenceDate);
      expect(results).toHaveLength(0);
    });
  });

  describe("getLapseRiskSummary", () => {
    it("summarizes risk distribution", () => {
      const results = [
        { score: 0.8, riskLevel: "high" as const, confidence: 0.7, factors: [], predictedLapseWindow: "3-6 months", details: {} as any },
        { score: 0.75, riskLevel: "high" as const, confidence: 0.6, factors: [], predictedLapseWindow: "3-6 months", details: {} as any },
        { score: 0.5, riskLevel: "medium" as const, confidence: 0.5, factors: [], predictedLapseWindow: "6-12 months", details: {} as any },
        { score: 0.3, riskLevel: "low" as const, confidence: 0.8, factors: [], predictedLapseWindow: "12-18 months", details: {} as any },
        { score: 0.2, riskLevel: "low" as const, confidence: 0.9, factors: [], predictedLapseWindow: "18+ months", details: {} as any },
      ];

      const summary = getLapseRiskSummary(results);

      expect(summary.highRiskCount).toBe(2);
      expect(summary.mediumRiskCount).toBe(1);
      expect(summary.lowRiskCount).toBe(2);
      expect(summary.averageScore).toBeCloseTo(0.51, 2);
      expect(summary.averageConfidence).toBeCloseTo(0.7, 2);
    });

    it("handles empty results", () => {
      const summary = getLapseRiskSummary([]);

      expect(summary.highRiskCount).toBe(0);
      expect(summary.mediumRiskCount).toBe(0);
      expect(summary.lowRiskCount).toBe(0);
      expect(summary.averageScore).toBe(0);
    });
  });
});
