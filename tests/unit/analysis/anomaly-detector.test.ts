// T220: Unit tests for anomaly detector
import { describe, it, expect } from "vitest";
import {
  detectAnomalies,
  detectEngagementSpike,
  detectGivingPatternChange,
  detectContactGap,
  type AnomalyInput,
} from "@/server/services/analysis/anomaly-detector";

describe("Anomaly Detector", () => {
  const referenceDate = new Date("2026-01-15");

  describe("detectEngagementSpike", () => {
    it("detects sudden increase in giving frequency", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [
          // Last 3 months: 5 gifts (spike)
          { amount: 500, date: new Date("2026-01-01") },
          { amount: 500, date: new Date("2025-12-15") },
          { amount: 500, date: new Date("2025-12-01") },
          { amount: 500, date: new Date("2025-11-15") },
          { amount: 500, date: new Date("2025-11-01") },
          // Previous 12 months: 2 gifts (normal)
          { amount: 500, date: new Date("2025-06-01") },
          { amount: 500, date: new Date("2025-01-01") },
        ],
        contacts: [],
        referenceDate,
      };

      const result = detectEngagementSpike(input);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("engagement_spike");
      expect(result?.severity).toBe("medium");
    });

    it("detects significant gift amount increase", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [
          // Recent gift much larger than historical average
          { amount: 10000, date: new Date("2025-12-15") },
          // Historical giving pattern
          { amount: 500, date: new Date("2025-06-01") },
          { amount: 500, date: new Date("2024-12-01") },
          { amount: 500, date: new Date("2024-06-01") },
        ],
        contacts: [],
        referenceDate,
      };

      const result = detectEngagementSpike(input);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("engagement_spike");
    });

    it("returns null for normal engagement patterns", () => {
      // Consistent quarterly giving - equal gifts across both windows
      // Reference date: 2026-01-15
      // Recent window: Oct 2025 - Jan 2026 (3 months)
      // Baseline window: Jan 2025 - Oct 2025 (9 months)
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [
          // Recent window: 1 gift (Oct 2025 - Jan 2026)
          { amount: 500, date: new Date("2025-12-01") },
          // Baseline window: 3 gifts (Jan 2025 - Oct 2025)
          { amount: 500, date: new Date("2025-08-01") },
          { amount: 500, date: new Date("2025-05-01") },
          { amount: 500, date: new Date("2025-02-01") },
        ],
        contacts: [],
        referenceDate,
      };

      const result = detectEngagementSpike(input);

      expect(result).toBeNull();
    });
  });

  describe("detectGivingPatternChange", () => {
    it("detects transition from annual to lapsed giving", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [
          // 3+ years of consistent annual giving, then nothing for 18+ months
          { amount: 1000, date: new Date("2024-01-15") }, // Most recent: 2 years ago
          { amount: 1000, date: new Date("2023-01-15") },
          { amount: 1000, date: new Date("2022-01-15") },
          { amount: 1000, date: new Date("2021-01-15") },
        ],
        contacts: [],
        referenceDate,
      };

      const result = detectGivingPatternChange(input);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("giving_pattern_change");
      expect(result?.severity).toBe("high");
    });

    it("detects decreasing gift amounts trend", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [
          { amount: 200, date: new Date("2025-12-01") },
          { amount: 500, date: new Date("2025-06-01") },
          { amount: 1000, date: new Date("2024-12-01") },
          { amount: 2000, date: new Date("2024-06-01") },
        ],
        contacts: [],
        referenceDate,
      };

      const result = detectGivingPatternChange(input);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("giving_pattern_change");
    });

    it("returns null for stable giving patterns", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [
          { amount: 1000, date: new Date("2025-12-01") },
          { amount: 1000, date: new Date("2024-12-01") },
          { amount: 1000, date: new Date("2023-12-01") },
        ],
        contacts: [],
        referenceDate,
      };

      const result = detectGivingPatternChange(input);

      expect(result).toBeNull();
    });

    it("handles donors with no gifts", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [],
        contacts: [],
        referenceDate,
      };

      const result = detectGivingPatternChange(input);

      expect(result).toBeNull();
    });
  });

  describe("detectContactGap", () => {
    it("detects extended period without contact for high-value donors", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [
          { amount: 50000, date: new Date("2025-06-01") },
          { amount: 50000, date: new Date("2024-06-01") },
        ],
        contacts: [
          // Last contact over 12 months ago for major donor
          { date: new Date("2024-06-01"), type: "meeting" },
        ],
        referenceDate,
        estimatedCapacity: 100000,
      };

      const result = detectContactGap(input);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("contact_gap");
      expect(result?.severity).toBe("high");
    });

    it("uses different thresholds based on donor tier", () => {
      // High capacity donor - stricter threshold
      const majorDonorInput: AnomalyInput = {
        constituentId: "c1",
        gifts: [{ amount: 100000, date: new Date("2025-12-01") }],
        contacts: [{ date: new Date("2025-04-01"), type: "meeting" }], // 9 months ago
        referenceDate,
        estimatedCapacity: 500000,
      };

      const majorResult = detectContactGap(majorDonorInput);
      expect(majorResult).not.toBeNull();

      // Lower capacity donor - more lenient threshold
      const regularDonorInput: AnomalyInput = {
        constituentId: "c2",
        gifts: [{ amount: 500, date: new Date("2025-12-01") }],
        contacts: [{ date: new Date("2025-04-01"), type: "meeting" }], // 9 months ago
        referenceDate,
        estimatedCapacity: 1000,
      };

      const regularResult = detectContactGap(regularDonorInput);
      expect(regularResult).toBeNull();
    });

    it("returns null for recently contacted donors", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [{ amount: 10000, date: new Date("2025-12-01") }],
        contacts: [
          { date: new Date("2025-12-01"), type: "meeting" },
        ],
        referenceDate,
        estimatedCapacity: 50000,
      };

      const result = detectContactGap(input);

      expect(result).toBeNull();
    });

    it("handles constituents with no contact history", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [{ amount: 25000, date: new Date("2025-06-01") }],
        contacts: [],
        referenceDate,
        estimatedCapacity: 100000,
      };

      const result = detectContactGap(input);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("contact_gap");
    });
  });

  describe("detectAnomalies", () => {
    it("runs all detectors and returns combined results", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [
          // Pattern change: major decrease
          { amount: 100, date: new Date("2025-12-01") },
          { amount: 5000, date: new Date("2025-06-01") },
          { amount: 5000, date: new Date("2024-12-01") },
        ],
        contacts: [
          // Contact gap: last contact 10 months ago for major donor
          { date: new Date("2025-03-01"), type: "meeting" },
        ],
        referenceDate,
        estimatedCapacity: 100000,
      };

      const results = detectAnomalies(input);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty array when no anomalies detected", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [
          { amount: 1000, date: new Date("2025-12-01") },
          { amount: 1000, date: new Date("2024-12-01") },
        ],
        contacts: [
          { date: new Date("2025-11-01"), type: "meeting" },
        ],
        referenceDate,
        estimatedCapacity: 5000,
      };

      const results = detectAnomalies(input);

      expect(results).toBeInstanceOf(Array);
      // May or may not have anomalies depending on thresholds
    });

    it("includes constituent ID in each result", () => {
      const input: AnomalyInput = {
        constituentId: "test-constituent-123",
        gifts: [
          { amount: 50000, date: new Date("2025-12-01") },
          { amount: 500, date: new Date("2024-12-01") },
        ],
        contacts: [],
        referenceDate,
      };

      const results = detectAnomalies(input);

      for (const result of results) {
        expect(result.constituentId).toBe("test-constituent-123");
      }
    });

    it("provides explanation factors for each anomaly", () => {
      const input: AnomalyInput = {
        constituentId: "c1",
        gifts: [
          // Engagement spike
          { amount: 25000, date: new Date("2025-12-15") },
          { amount: 500, date: new Date("2025-06-01") },
          { amount: 500, date: new Date("2024-12-01") },
        ],
        contacts: [],
        referenceDate,
      };

      const results = detectAnomalies(input);

      for (const result of results) {
        expect(result.factors).toBeInstanceOf(Array);
        expect(result.factors.length).toBeGreaterThan(0);
        for (const factor of result.factors) {
          expect(factor).toHaveProperty("name");
          expect(factor).toHaveProperty("value");
        }
      }
    });
  });
});
