// T100: Unit tests for freshness scoring
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateFreshnessScore,
  calculateGiftFreshness,
  calculateContactFreshness,
  calculateDataFreshness,
  analyzeDataAge,
  type FreshnessInput,
  type FreshnessResult,
  type DataAgeAnalysis,
} from "@/server/services/analysis/freshness";

describe("Freshness Scoring", () => {
  // Mock current date for consistent testing
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("calculateFreshnessScore", () => {
    it("returns 1.0 for recent data", () => {
      const input: FreshnessInput = {
        lastGiftDate: new Date("2026-01-15"), // 10 days ago
        lastContactDate: new Date("2026-01-20"), // 5 days ago
        lastUploadDate: new Date("2026-01-24"), // 1 day ago
      };

      const result = calculateFreshnessScore(input);

      expect(result.overall).toBeGreaterThan(0.9);
    });

    it("returns low score for stale data", () => {
      const input: FreshnessInput = {
        lastGiftDate: new Date("2023-01-01"), // 3 years ago
        lastContactDate: new Date("2024-01-01"), // 2 years ago
        lastUploadDate: new Date("2024-06-01"), // ~7 months ago
      };

      const result = calculateFreshnessScore(input);

      expect(result.overall).toBeLessThan(0.5);
    });

    it("handles missing dates gracefully", () => {
      const input: FreshnessInput = {
        lastGiftDate: null,
        lastContactDate: null,
        lastUploadDate: new Date("2026-01-24"),
      };

      const result = calculateFreshnessScore(input);

      // Should still return a score based on available data
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    });

    it("weights gift freshness higher than contact freshness", () => {
      const recentGift: FreshnessInput = {
        lastGiftDate: new Date("2026-01-20"),
        lastContactDate: new Date("2024-01-01"), // old contact
        lastUploadDate: new Date("2026-01-24"),
      };

      const recentContact: FreshnessInput = {
        lastGiftDate: new Date("2024-01-01"), // old gift
        lastContactDate: new Date("2026-01-20"),
        lastUploadDate: new Date("2026-01-24"),
      };

      const giftResult = calculateFreshnessScore(recentGift);
      const contactResult = calculateFreshnessScore(recentContact);

      // Recent gift should score higher than recent contact
      expect(giftResult.overall).toBeGreaterThan(contactResult.overall);
    });
  });

  describe("calculateGiftFreshness", () => {
    it("returns 1.0 for gift within 30 days", () => {
      const lastGiftDate = new Date("2026-01-10"); // 15 days ago

      const score = calculateGiftFreshness(lastGiftDate);

      expect(score).toBe(1.0);
    });

    it("returns 0.8 for gift within 90 days", () => {
      const lastGiftDate = new Date("2025-11-15"); // ~70 days ago

      const score = calculateGiftFreshness(lastGiftDate);

      expect(score).toBeGreaterThan(0.7);
      expect(score).toBeLessThan(1.0);
    });

    it("returns 0.5 for gift within 1 year", () => {
      const lastGiftDate = new Date("2025-07-01"); // ~7 months ago

      const score = calculateGiftFreshness(lastGiftDate);

      expect(score).toBeGreaterThan(0.4);
      expect(score).toBeLessThan(0.8);
    });

    it("returns 0.2 for gift within 2 years", () => {
      const lastGiftDate = new Date("2024-06-01"); // ~19 months ago

      const score = calculateGiftFreshness(lastGiftDate);

      expect(score).toBeGreaterThan(0.1);
      expect(score).toBeLessThan(0.5);
    });

    it("returns near 0 for gift older than 2 years", () => {
      const lastGiftDate = new Date("2022-01-01"); // 4 years ago

      const score = calculateGiftFreshness(lastGiftDate);

      expect(score).toBeLessThan(0.2);
    });

    it("returns 0 for null date", () => {
      const score = calculateGiftFreshness(null);

      expect(score).toBe(0);
    });
  });

  describe("calculateContactFreshness", () => {
    it("returns 1.0 for contact within 14 days", () => {
      const lastContactDate = new Date("2026-01-15"); // 10 days ago

      const score = calculateContactFreshness(lastContactDate);

      expect(score).toBe(1.0);
    });

    it("returns 0.8 for contact within 30 days", () => {
      const lastContactDate = new Date("2026-01-01"); // 24 days ago

      const score = calculateContactFreshness(lastContactDate);

      expect(score).toBeGreaterThan(0.7);
      expect(score).toBeLessThan(1.0);
    });

    it("returns 0.5 for contact within 90 days", () => {
      const lastContactDate = new Date("2025-11-01"); // ~3 months ago

      const score = calculateContactFreshness(lastContactDate);

      expect(score).toBeGreaterThan(0.4);
      expect(score).toBeLessThan(0.7);
    });

    it("returns low score for contact older than 6 months", () => {
      const lastContactDate = new Date("2025-05-01"); // ~8 months ago

      const score = calculateContactFreshness(lastContactDate);

      expect(score).toBeLessThan(0.4);
    });

    it("returns 0 for null date", () => {
      const score = calculateContactFreshness(null);

      expect(score).toBe(0);
    });
  });

  describe("calculateDataFreshness", () => {
    it("returns 1.0 for data uploaded today", () => {
      const lastUploadDate = new Date("2026-01-25");

      const score = calculateDataFreshness(lastUploadDate);

      expect(score).toBe(1.0);
    });

    it("returns 0.9 for data uploaded within a week", () => {
      const lastUploadDate = new Date("2026-01-20"); // 5 days ago

      const score = calculateDataFreshness(lastUploadDate);

      expect(score).toBeGreaterThan(0.85);
    });

    it("returns 0.7 for data uploaded within a month", () => {
      const lastUploadDate = new Date("2025-12-28"); // ~28 days ago

      const score = calculateDataFreshness(lastUploadDate);

      expect(score).toBeGreaterThan(0.6);
      expect(score).toBeLessThan(0.85);
    });

    it("returns low score for data older than 3 months", () => {
      const lastUploadDate = new Date("2025-09-01"); // ~5 months ago

      const score = calculateDataFreshness(lastUploadDate);

      expect(score).toBeLessThan(0.5);
    });
  });

  describe("analyzeDataAge", () => {
    it("identifies stale gifts", () => {
      const input: FreshnessInput = {
        lastGiftDate: new Date("2024-01-01"), // 2 years ago
        lastContactDate: new Date("2026-01-20"),
        lastUploadDate: new Date("2026-01-24"),
      };

      const analysis = analyzeDataAge(input);

      expect(analysis.issues).toContainEqual(
        expect.objectContaining({
          type: "stale_gifts",
          severity: "high",
        })
      );
    });

    it("identifies stale contacts", () => {
      const input: FreshnessInput = {
        lastGiftDate: new Date("2026-01-15"),
        lastContactDate: new Date("2025-01-01"), // 1 year ago
        lastUploadDate: new Date("2026-01-24"),
      };

      const analysis = analyzeDataAge(input);

      expect(analysis.issues).toContainEqual(
        expect.objectContaining({
          type: "stale_contacts",
          severity: "medium",
        })
      );
    });

    it("identifies outdated upload", () => {
      const input: FreshnessInput = {
        lastGiftDate: new Date("2026-01-15"),
        lastContactDate: new Date("2026-01-20"),
        lastUploadDate: new Date("2025-06-01"), // 7+ months ago
      };

      const analysis = analyzeDataAge(input);

      expect(analysis.issues).toContainEqual(
        expect.objectContaining({
          type: "outdated_upload",
          severity: "medium",
        })
      );
    });

    it("provides days since metrics", () => {
      const input: FreshnessInput = {
        lastGiftDate: new Date("2026-01-15"), // 10 days ago
        lastContactDate: new Date("2026-01-20"), // 5 days ago
        lastUploadDate: new Date("2026-01-24"), // 1 day ago
      };

      const analysis = analyzeDataAge(input);

      expect(analysis.daysSinceLastGift).toBe(10);
      expect(analysis.daysSinceLastContact).toBe(5);
      expect(analysis.daysSinceLastUpload).toBe(1);
    });

    it("handles null dates in analysis", () => {
      const input: FreshnessInput = {
        lastGiftDate: null,
        lastContactDate: null,
        lastUploadDate: new Date("2026-01-24"),
      };

      const analysis = analyzeDataAge(input);

      expect(analysis.daysSinceLastGift).toBeNull();
      expect(analysis.daysSinceLastContact).toBeNull();
      expect(analysis.issues).toContainEqual(
        expect.objectContaining({
          type: "no_gift_history",
        })
      );
    });

    it("returns no issues for fresh data", () => {
      const input: FreshnessInput = {
        lastGiftDate: new Date("2026-01-15"),
        lastContactDate: new Date("2026-01-20"),
        lastUploadDate: new Date("2026-01-24"),
      };

      const analysis = analyzeDataAge(input);

      expect(analysis.issues).toHaveLength(0);
    });
  });

  describe("Batch Processing", () => {
    it("calculates average freshness for multiple records", () => {
      const inputs: FreshnessInput[] = [
        {
          lastGiftDate: new Date("2026-01-20"),
          lastContactDate: new Date("2026-01-22"),
          lastUploadDate: new Date("2026-01-24"),
        },
        {
          lastGiftDate: new Date("2024-01-01"), // old
          lastContactDate: new Date("2024-06-01"), // old
          lastUploadDate: new Date("2026-01-24"),
        },
      ];

      const scores = inputs.map(calculateFreshnessScore);
      const avgScore = scores.reduce((a, b) => a + b.overall, 0) / scores.length;

      // Mix of fresh and stale should be moderate
      expect(avgScore).toBeGreaterThan(0.3);
      expect(avgScore).toBeLessThan(0.9);
    });
  });
});
