// T098: Unit tests for health scorer
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateHealthScore,
  getOverallScore,
  aggregateHealthScores,
  getHealthGrade,
  type HealthScoreInput,
  type HealthScoreResult,
} from "@/server/services/analysis/health-scorer";

describe("Health Scorer", () => {
  describe("calculateHealthScore", () => {
    it("calculates overall health score from category scores", () => {
      const input: HealthScoreInput = {
        completeness: 0.85,
        freshness: 0.72,
        consistency: 0.9,
        coverage: 0.65,
      };

      const result = calculateHealthScore(input);

      // Weighted average: completeness 30%, freshness 25%, consistency 25%, coverage 20%
      // 0.85 * 0.30 + 0.72 * 0.25 + 0.9 * 0.25 + 0.65 * 0.20 = 0.79
      expect(result.overall).toBeCloseTo(0.79, 2);
      expect(result.completeness).toBe(0.85);
      expect(result.freshness).toBe(0.72);
      expect(result.consistency).toBe(0.9);
      expect(result.coverage).toBe(0.65);
    });

    it("handles perfect scores", () => {
      const input: HealthScoreInput = {
        completeness: 1.0,
        freshness: 1.0,
        consistency: 1.0,
        coverage: 1.0,
      };

      const result = calculateHealthScore(input);

      expect(result.overall).toBe(1.0);
    });

    it("handles zero scores", () => {
      const input: HealthScoreInput = {
        completeness: 0,
        freshness: 0,
        consistency: 0,
        coverage: 0,
      };

      const result = calculateHealthScore(input);

      expect(result.overall).toBe(0);
    });

    it("clamps scores to valid range", () => {
      const input: HealthScoreInput = {
        completeness: 1.5, // over 1
        freshness: -0.2, // negative
        consistency: 0.8,
        coverage: 0.7,
      };

      const result = calculateHealthScore(input);

      expect(result.completeness).toBe(1.0);
      expect(result.freshness).toBe(0);
      expect(result.overall).toBeLessThanOrEqual(1.0);
      expect(result.overall).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getOverallScore", () => {
    it("applies custom weights when provided", () => {
      const scores = {
        completeness: 0.8,
        freshness: 0.6,
        consistency: 0.7,
        coverage: 0.5,
      };

      const customWeights = {
        completeness: 0.5,
        freshness: 0.2,
        consistency: 0.2,
        coverage: 0.1,
      };

      const result = getOverallScore(scores, customWeights);

      // 0.8 * 0.5 + 0.6 * 0.2 + 0.7 * 0.2 + 0.5 * 0.1 = 0.71
      expect(result).toBeCloseTo(0.71, 2);
    });

    it("normalizes weights that don't sum to 1", () => {
      const scores = {
        completeness: 0.8,
        freshness: 0.6,
        consistency: 0.7,
        coverage: 0.5,
      };

      const unnormalizedWeights = {
        completeness: 1,
        freshness: 1,
        consistency: 1,
        coverage: 1,
      };

      const result = getOverallScore(scores, unnormalizedWeights);

      // Should normalize to equal weights (0.25 each)
      // 0.8 * 0.25 + 0.6 * 0.25 + 0.7 * 0.25 + 0.5 * 0.25 = 0.65
      expect(result).toBeCloseTo(0.65, 2);
    });
  });

  describe("aggregateHealthScores", () => {
    it("aggregates multiple health scores into a single result", () => {
      const scores: HealthScoreResult[] = [
        { overall: 0.8, completeness: 0.9, freshness: 0.7, consistency: 0.8, coverage: 0.8 },
        { overall: 0.6, completeness: 0.5, freshness: 0.7, consistency: 0.6, coverage: 0.6 },
        { overall: 0.7, completeness: 0.7, freshness: 0.8, consistency: 0.7, coverage: 0.6 },
      ];

      const result = aggregateHealthScores(scores);

      // Average of each category
      expect(result.completeness).toBeCloseTo(0.7, 2);
      expect(result.freshness).toBeCloseTo(0.733, 2);
      expect(result.consistency).toBeCloseTo(0.7, 2);
      expect(result.coverage).toBeCloseTo(0.667, 2);
    });

    it("handles empty array", () => {
      const result = aggregateHealthScores([]);

      expect(result.overall).toBe(0);
      expect(result.completeness).toBe(0);
      expect(result.freshness).toBe(0);
      expect(result.consistency).toBe(0);
      expect(result.coverage).toBe(0);
    });

    it("handles single score", () => {
      const scores: HealthScoreResult[] = [
        { overall: 0.75, completeness: 0.8, freshness: 0.7, consistency: 0.75, coverage: 0.75 },
      ];

      const result = aggregateHealthScores(scores);

      expect(result.overall).toBeCloseTo(0.75, 1);
      expect(result.completeness).toBe(0.8);
    });
  });

  describe("getHealthGrade", () => {
    it("returns A for scores >= 0.9", () => {
      expect(getHealthGrade(0.95)).toBe("A");
      expect(getHealthGrade(0.9)).toBe("A");
      expect(getHealthGrade(1.0)).toBe("A");
    });

    it("returns B for scores >= 0.8", () => {
      expect(getHealthGrade(0.89)).toBe("B");
      expect(getHealthGrade(0.8)).toBe("B");
      expect(getHealthGrade(0.85)).toBe("B");
    });

    it("returns C for scores >= 0.7", () => {
      expect(getHealthGrade(0.79)).toBe("C");
      expect(getHealthGrade(0.7)).toBe("C");
      expect(getHealthGrade(0.75)).toBe("C");
    });

    it("returns D for scores >= 0.6", () => {
      expect(getHealthGrade(0.69)).toBe("D");
      expect(getHealthGrade(0.6)).toBe("D");
      expect(getHealthGrade(0.65)).toBe("D");
    });

    it("returns F for scores < 0.6", () => {
      expect(getHealthGrade(0.59)).toBe("F");
      expect(getHealthGrade(0.3)).toBe("F");
      expect(getHealthGrade(0)).toBe("F");
    });
  });
});
