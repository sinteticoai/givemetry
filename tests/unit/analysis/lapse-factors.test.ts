// T116: Unit tests for lapse factors (recency, frequency, monetary, contact)
import { describe, it, expect } from "vitest";
import {
  calculateRecencyScore,
  getRecencyCategory,
} from "@/server/services/analysis/lapse-factors/recency";
import {
  calculateFrequencyScore,
  analyzeGiftFrequency,
} from "@/server/services/analysis/lapse-factors/frequency";
import {
  calculateMonetaryScore,
  analyzeGiftAmounts,
} from "@/server/services/analysis/lapse-factors/monetary";
import {
  calculateContactScore,
  analyzeContactPatterns,
} from "@/server/services/analysis/lapse-factors/contact";

describe("Lapse Factors", () => {
  const referenceDate = new Date("2026-01-15");

  describe("Recency Factor", () => {
    describe("calculateRecencyScore", () => {
      it("returns low score for recent gifts", () => {
        const result = calculateRecencyScore({
          gifts: [{ amount: 1000, date: new Date("2026-01-01") }],
          referenceDate,
        });

        expect(result.score).toBeLessThan(0.2);
        expect(result.daysSinceLastGift).toBe(14);
      });

      it("returns medium score for gifts 12-18 months ago", () => {
        const result = calculateRecencyScore({
          gifts: [{ amount: 1000, date: new Date("2024-10-01") }], // ~15 months
          referenceDate,
        });

        expect(result.score).toBeGreaterThanOrEqual(0.4);
        expect(result.score).toBeLessThan(0.7);
      });

      it("returns high score for very old gifts", () => {
        const result = calculateRecencyScore({
          gifts: [{ amount: 1000, date: new Date("2022-01-01") }], // 4 years ago
          referenceDate,
        });

        expect(result.score).toBeGreaterThan(0.8);
      });

      it("returns maximum score for no gifts", () => {
        const result = calculateRecencyScore({
          gifts: [],
          referenceDate,
        });

        expect(result.score).toBe(1.0);
        expect(result.daysSinceLastGift).toBeNull();
      });

      it("provides human-readable description", () => {
        const recentResult = calculateRecencyScore({
          gifts: [{ amount: 500, date: new Date("2026-01-10") }],
          referenceDate,
        });

        expect(recentResult.description).toContain("5 days");

        const oldResult = calculateRecencyScore({
          gifts: [{ amount: 500, date: new Date("2024-01-01") }],
          referenceDate,
        });

        expect(oldResult.description).toMatch(/2.*year/i);
      });
    });

    describe("getRecencyCategory", () => {
      it("categorizes months correctly", () => {
        expect(getRecencyCategory(3)).toBe("recent");
        expect(getRecencyCategory(9)).toBe("active");
        expect(getRecencyCategory(15)).toBe("lapsed");
        expect(getRecencyCategory(21)).toBe("at_risk");
        expect(getRecencyCategory(30)).toBe("dormant");
        expect(getRecencyCategory(null)).toBe("no_gifts");
      });
    });
  });

  describe("Frequency Factor", () => {
    describe("calculateFrequencyScore", () => {
      it("returns low score for frequent givers", () => {
        const result = calculateFrequencyScore({
          gifts: [
            { amount: 100, date: new Date("2025-12-01") },
            { amount: 100, date: new Date("2025-06-01") },
            { amount: 100, date: new Date("2024-12-01") },
            { amount: 100, date: new Date("2024-06-01") },
          ],
          referenceDate,
        });

        expect(result.score).toBeLessThan(0.4);
        expect(result.currentAnnualFrequency).toBeGreaterThanOrEqual(1);
        expect(result.trend).not.toBe("stopped");
      });

      it("detects declining frequency", () => {
        const result = calculateFrequencyScore({
          gifts: [
            // Recent period: only 1 gift
            { amount: 100, date: new Date("2025-12-01") },
            // Historical period: multiple gifts
            { amount: 100, date: new Date("2023-12-01") },
            { amount: 100, date: new Date("2023-06-01") },
            { amount: 100, date: new Date("2023-01-01") },
            { amount: 100, date: new Date("2022-06-01") },
          ],
          referenceDate,
        });

        expect(result.trend).toBe("decreasing");
        expect(result.currentAnnualFrequency).toBeLessThan(result.historicalAnnualFrequency);
      });

      it("detects stopped giving", () => {
        const result = calculateFrequencyScore({
          gifts: [
            { amount: 100, date: new Date("2022-12-01") },
            { amount: 100, date: new Date("2022-06-01") },
          ],
          referenceDate,
        });

        expect(result.trend).toBe("stopped");
        expect(result.score).toBeGreaterThan(0.7);
      });

      it("handles single gift", () => {
        const result = calculateFrequencyScore({
          gifts: [{ amount: 500, date: new Date("2025-06-01") }],
          referenceDate,
        });

        expect(result.trend).toBe("stable");
        expect(result.description).toContain("Single gift");
      });

      it("handles no gifts", () => {
        const result = calculateFrequencyScore({
          gifts: [],
          referenceDate,
        });

        expect(result.score).toBe(1.0);
        expect(result.trend).toBe("stopped");
      });
    });

    describe("analyzeGiftFrequency", () => {
      it("calculates gap statistics", () => {
        const result = analyzeGiftFrequency(
          [
            { date: new Date("2025-01-01") },
            { date: new Date("2025-04-01") }, // 90 days
            { date: new Date("2025-07-01") }, // 91 days
            { date: new Date("2025-10-01") }, // 92 days
          ],
          referenceDate
        );

        expect(result.averageGapDays).toBeCloseTo(91, 0);
        expect(result.consistency).toBeGreaterThan(0.8); // Very consistent
      });

      it("handles single gift", () => {
        const result = analyzeGiftFrequency(
          [{ date: new Date("2025-06-01") }],
          referenceDate
        );

        expect(result.averageGapDays).toBe(0);
        expect(result.consistency).toBe(0);
      });
    });
  });

  describe("Monetary Factor", () => {
    describe("calculateMonetaryScore", () => {
      it("returns low score for stable/increasing giving", () => {
        const result = calculateMonetaryScore({
          gifts: [
            // Recent period (last 2 years): higher amounts
            { amount: 2000, date: new Date("2025-12-01") },
            { amount: 1800, date: new Date("2025-06-01") },
            { amount: 1500, date: new Date("2024-12-01") },
            { amount: 1200, date: new Date("2024-06-01") },
            // Historical period (2-5 years): lower amounts
            { amount: 600, date: new Date("2023-12-01") },
            { amount: 500, date: new Date("2023-06-01") },
            { amount: 400, date: new Date("2022-12-01") },
            { amount: 300, date: new Date("2022-06-01") },
          ],
          referenceDate,
        });

        expect(result.score).toBeLessThan(0.4);
        expect(result.trend).toBe("increasing");
      });

      it("detects declining monetary value", () => {
        const result = calculateMonetaryScore({
          gifts: [
            { amount: 200, date: new Date("2025-12-01") },
            { amount: 300, date: new Date("2025-06-01") },
            { amount: 1000, date: new Date("2023-12-01") },
            { amount: 1500, date: new Date("2023-06-01") },
          ],
          referenceDate,
        });

        expect(result.trend).toBe("decreasing");
        expect(result.score).toBeGreaterThan(0.3);
      });

      it("calculates lifetime total", () => {
        const result = calculateMonetaryScore({
          gifts: [
            { amount: 1000, date: new Date("2025-12-01") },
            { amount: 2000, date: new Date("2024-12-01") },
            { amount: 3000, date: new Date("2023-12-01") },
          ],
          referenceDate,
        });

        expect(result.totalLifetime).toBe(6000);
      });

      it("provides descriptive output", () => {
        const result = calculateMonetaryScore({
          gifts: [
            { amount: 50000, date: new Date("2025-12-01") },
          ],
          referenceDate,
        });

        expect(result.description).toContain("$");
        expect(result.lastGiftAmount).toBe(50000);
      });
    });

    describe("analyzeGiftAmounts", () => {
      it("calculates distribution statistics", () => {
        const result = analyzeGiftAmounts([
          { amount: 100 },
          { amount: 500 },
          { amount: 1000 },
          { amount: 2000 },
        ]);

        expect(result.min).toBe(100);
        expect(result.max).toBe(2000);
        expect(result.total).toBe(3600);
        expect(result.count).toBe(4);
        expect(result.average).toBe(900);
      });

      it("handles empty array", () => {
        const result = analyzeGiftAmounts([]);
        expect(result.total).toBe(0);
        expect(result.count).toBe(0);
      });
    });
  });

  describe("Contact Factor", () => {
    describe("calculateContactScore", () => {
      it("returns low score for recent contacts", () => {
        const result = calculateContactScore({
          contacts: [
            { date: new Date("2026-01-10"), type: "meeting" },
          ],
          referenceDate,
        });

        expect(result.score).toBeLessThan(0.3);
        expect(result.daysSinceLastContact).toBe(5);
      });

      it("returns higher score for old contacts", () => {
        const result = calculateContactScore({
          contacts: [
            { date: new Date("2024-06-01"), type: "email" }, // ~19 months ago
          ],
          referenceDate,
        });

        expect(result.score).toBeGreaterThan(0.5);
      });

      it("considers contact type weights", () => {
        const meetingResult = calculateContactScore({
          contacts: [
            { date: new Date("2025-10-01"), type: "meeting" },
            { date: new Date("2025-08-01"), type: "meeting" },
          ],
          referenceDate,
        });

        const emailResult = calculateContactScore({
          contacts: [
            { date: new Date("2025-10-01"), type: "email" },
            { date: new Date("2025-08-01"), type: "email" },
          ],
          referenceDate,
        });

        // Meetings should have slightly better (lower) score
        expect(meetingResult.score).toBeLessThanOrEqual(emailResult.score);
      });

      it("adjusts for positive outcomes", () => {
        const positiveResult = calculateContactScore({
          contacts: [
            { date: new Date("2025-10-01"), type: "meeting", outcome: "positive" },
          ],
          referenceDate,
        });

        const neutralResult = calculateContactScore({
          contacts: [
            { date: new Date("2025-10-01"), type: "meeting", outcome: "neutral" },
          ],
          referenceDate,
        });

        expect(positiveResult.score).toBeLessThan(neutralResult.score);
        expect(positiveResult.hasPositiveOutcome).toBe(true);
      });

      it("handles no contacts", () => {
        const result = calculateContactScore({
          contacts: [],
          referenceDate,
        });

        expect(result.score).toBeGreaterThan(0.7);
        expect(result.contactsLast12Months).toBe(0);
      });

      it("counts recent contacts", () => {
        const result = calculateContactScore({
          contacts: [
            { date: new Date("2025-12-01"), type: "call" },
            { date: new Date("2025-06-01"), type: "email" },
            { date: new Date("2025-03-01"), type: "meeting" },
            { date: new Date("2024-01-01"), type: "event" }, // Outside 12 months
          ],
          referenceDate,
        });

        expect(result.contactsLast12Months).toBe(3);
      });
    });

    describe("analyzeContactPatterns", () => {
      it("analyzes quarterly distribution", () => {
        const result = analyzeContactPatterns(
          [
            { date: new Date("2025-12-15"), type: "meeting" }, // Q0
            { date: new Date("2025-12-01"), type: "call" }, // Q0
            { date: new Date("2025-09-01"), type: "email" }, // Q1
            { date: new Date("2025-06-01"), type: "meeting" }, // Q2
          ],
          referenceDate
        );

        expect(result.contactsByQuarter[0]).toBe(2); // Most recent quarter
        expect(result.contactsByQuarter[1]).toBe(1);
        expect(result.contactsByQuarter[2]).toBe(1);
      });

      it("identifies dominant contact type", () => {
        const result = analyzeContactPatterns(
          [
            { date: new Date("2025-12-01"), type: "call" },
            { date: new Date("2025-11-01"), type: "call" },
            { date: new Date("2025-10-01"), type: "email" },
          ],
          referenceDate
        );

        expect(result.dominantType).toBe("call");
      });

      it("calculates positive outcome rate", () => {
        const result = analyzeContactPatterns(
          [
            { date: new Date("2025-12-01"), type: "call", outcome: "positive" },
            { date: new Date("2025-11-01"), type: "call", outcome: "positive" },
            { date: new Date("2025-10-01"), type: "email", outcome: "neutral" },
            { date: new Date("2025-09-01"), type: "email", outcome: "negative" },
          ],
          referenceDate
        );

        expect(result.positiveOutcomeRate).toBe(0.5);
      });

      it("handles empty contacts", () => {
        const result = analyzeContactPatterns([], referenceDate);

        expect(result.contactsByQuarter).toEqual([0, 0, 0, 0]);
        expect(result.dominantType).toBeNull();
      });
    });
  });
});
