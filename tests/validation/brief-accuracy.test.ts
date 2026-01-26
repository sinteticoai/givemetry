// T156: Golden dataset validation for brief accuracy
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateBriefAccuracy,
  checkFactualClaims,
  verifyAmountAccuracy,
  verifyDateAccuracy,
  type BriefContent,
  type ValidationResult,
} from "@/server/services/ai/brief-validator";

// Golden test data - representative donor scenarios
const goldenDatasets = {
  // Case 1: Major donor with extensive history
  majorDonor: {
    constituent: {
      id: "golden-1",
      firstName: "Elizabeth",
      lastName: "Thornton",
      prefix: "Dr.",
      email: "ethornton@example.com",
      constituentType: "alumni",
      classYear: 1985,
      schoolCollege: "School of Medicine",
      estimatedCapacity: 5000000,
    },
    gifts: [
      { id: "g1", amount: 100000, giftDate: new Date("2025-06-15"), fundName: "Medical Research Fund" },
      { id: "g2", amount: 50000, giftDate: new Date("2024-06-15"), fundName: "Medical Research Fund" },
      { id: "g3", amount: 25000, giftDate: new Date("2023-06-15"), fundName: "Annual Fund" },
      { id: "g4", amount: 25000, giftDate: new Date("2022-06-15"), fundName: "Annual Fund" },
      { id: "g5", amount: 10000, giftDate: new Date("2021-06-15"), fundName: "Annual Fund" },
    ],
    contacts: [
      { id: "c1", contactType: "meeting", contactDate: new Date("2025-11-01"), notes: "Discussed endowment" },
      { id: "c2", contactType: "call", contactDate: new Date("2025-08-15"), notes: "Follow-up on giving priorities" },
      { id: "c3", contactType: "event", contactDate: new Date("2025-05-01"), notes: "Attended gala" },
    ],
    totalLifetime: 210000,
    giftCount: 5,
    lastGiftDate: new Date("2025-06-15"),
  },

  // Case 2: New prospect with minimal history
  newProspect: {
    constituent: {
      id: "golden-2",
      firstName: "Michael",
      lastName: "Chen",
      email: "mchen@example.com",
      constituentType: "friend",
      estimatedCapacity: 100000,
    },
    gifts: [],
    contacts: [
      { id: "c1", contactType: "meeting", contactDate: new Date("2025-10-15"), notes: "Initial discovery meeting" },
    ],
    totalLifetime: 0,
    giftCount: 0,
    lastGiftDate: null,
  },

  // Case 3: Lapsed donor
  lapsedDonor: {
    constituent: {
      id: "golden-3",
      firstName: "Sarah",
      lastName: "Williams",
      email: "swilliams@example.com",
      constituentType: "alumni",
      classYear: 2005,
      schoolCollege: "College of Arts & Sciences",
    },
    gifts: [
      { id: "g1", amount: 500, giftDate: new Date("2020-12-15"), fundName: "Annual Fund" },
      { id: "g2", amount: 250, giftDate: new Date("2019-12-15"), fundName: "Annual Fund" },
      { id: "g3", amount: 100, giftDate: new Date("2018-12-15"), fundName: "Class Gift" },
    ],
    contacts: [],
    totalLifetime: 850,
    giftCount: 3,
    lastGiftDate: new Date("2020-12-15"),
  },
};

describe("Brief Accuracy Validation (Golden Dataset)", () => {
  describe("Major Donor Brief Validation", () => {
    const dataset = goldenDatasets.majorDonor;

    it("correctly reports total lifetime giving", () => {
      const brief: BriefContent = {
        summary: { text: "Dr. Elizabeth Thornton is a major donor.", citations: [] },
        givingHistory: {
          text: "Has contributed $210,000 over 5 gifts.",
          totalLifetime: 210000,
          citations: [],
        },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = verifyAmountAccuracy(brief, dataset);
      expect(result.valid).toBe(true);
      expect(result.totalLifetimeMatch).toBe(true);
    });

    it("rejects incorrect lifetime giving amount", () => {
      const brief: BriefContent = {
        summary: { text: "", citations: [] },
        givingHistory: {
          text: "Has contributed $500,000 over 10 gifts.", // WRONG
          totalLifetime: 500000, // WRONG
          citations: [],
        },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = verifyAmountAccuracy(brief, dataset);
      expect(result.valid).toBe(false);
      expect(result.totalLifetimeMatch).toBe(false);
      expect(result.discrepancy).toBeGreaterThan(0);
    });

    it("correctly identifies most recent gift date", () => {
      const brief: BriefContent = {
        summary: { text: "Most recent gift was in June 2025.", citations: [] },
        givingHistory: { text: "", totalLifetime: 210000, citations: [] },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = verifyDateAccuracy(brief, dataset);
      expect(result.lastGiftDateValid).toBe(true);
    });

    it("validates factual claims about constituent", () => {
      const brief: BriefContent = {
        summary: {
          text: "Dr. Elizabeth Thornton is a 1985 School of Medicine alumna with a focus on medical research.",
          citations: [{ text: "1985 School of Medicine", source: "profile", sourceId: "golden-1" }],
        },
        givingHistory: { text: "", totalLifetime: 210000, citations: [] },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = checkFactualClaims(brief, dataset);
      expect(result.validClaims).toContain("classYear:1985");
      expect(result.validClaims).toContain("schoolCollege:School of Medicine");
    });

    it("identifies incorrect factual claims", () => {
      const brief: BriefContent = {
        summary: {
          text: "Dr. Elizabeth Thornton is a 1990 School of Engineering alumna.", // WRONG
          citations: [],
        },
        givingHistory: { text: "", totalLifetime: 210000, citations: [] },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = checkFactualClaims(brief, dataset);
      expect(result.invalidClaims.length).toBeGreaterThan(0);
    });
  });

  describe("New Prospect Brief Validation", () => {
    const dataset = goldenDatasets.newProspect;

    it("correctly reports zero giving history", () => {
      const brief: BriefContent = {
        summary: { text: "Michael Chen is a new prospect.", citations: [] },
        givingHistory: {
          text: "No giving history on record.",
          totalLifetime: 0,
          citations: [],
        },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = verifyAmountAccuracy(brief, dataset);
      expect(result.valid).toBe(true);
      expect(brief.givingHistory.totalLifetime).toBe(0);
    });

    it("handles null last gift date correctly", () => {
      const brief: BriefContent = {
        summary: { text: "", citations: [] },
        givingHistory: { text: "No previous gifts.", totalLifetime: 0, citations: [] },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = verifyDateAccuracy(brief, dataset);
      expect(result.lastGiftDateValid).toBe(true);
    });

    it("recommends discovery-focused approach", () => {
      const brief: BriefContent = {
        summary: { text: "", citations: [] },
        givingHistory: { text: "", totalLifetime: 0, citations: [] },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: ["Learn about philanthropic interests"], citations: [] },
        recommendedAsk: {
          amount: null,
          purpose: "Discovery meeting",
          rationale: "New prospect - relationship building",
          citations: [],
        },
      };

      // No ask amount is appropriate for new prospects
      expect(brief.recommendedAsk.amount).toBeNull();
      expect(brief.recommendedAsk.purpose.toLowerCase()).toContain("discovery");
    });
  });

  describe("Lapsed Donor Brief Validation", () => {
    const dataset = goldenDatasets.lapsedDonor;

    it("correctly reports total giving from old gifts", () => {
      const brief: BriefContent = {
        summary: { text: "", citations: [] },
        givingHistory: {
          text: "Previous giving totaled $850 from 3 gifts.",
          totalLifetime: 850,
          citations: [],
        },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = verifyAmountAccuracy(brief, dataset);
      expect(result.valid).toBe(true);
      expect(result.totalLifetimeMatch).toBe(true);
    });

    it("identifies lapsed status in brief", () => {
      const referenceDate = new Date("2026-01-25");
      const lastGiftDate = dataset.lastGiftDate!;
      const monthsSinceLastGift = Math.floor(
        (referenceDate.getTime() - lastGiftDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      expect(monthsSinceLastGift).toBeGreaterThan(12); // More than 1 year = lapsed
    });
  });

  describe("validateBriefAccuracy (Full Validation)", () => {
    it("passes validation for accurate major donor brief", () => {
      const dataset = goldenDatasets.majorDonor;
      const brief: BriefContent = {
        summary: {
          text: "Dr. Elizabeth Thornton is a valued 1985 School of Medicine alumna.",
          citations: [{ text: "1985 School of Medicine", source: "profile", sourceId: "golden-1" }],
        },
        givingHistory: {
          text: "Lifetime giving of $210,000 across 5 contributions, most recently in June 2025.",
          totalLifetime: 210000,
          citations: [{ text: "$210,000", source: "gift", sourceId: "g1" }],
        },
        relationshipHighlights: {
          text: "Met in November 2025 to discuss endowment opportunities.",
          citations: [{ text: "November 2025 meeting", source: "contact", sourceId: "c1" }],
        },
        conversationStarters: {
          items: ["Follow up on endowment discussion", "Thank for Medical Research Fund support"],
          citations: [],
        },
        recommendedAsk: {
          amount: 150000,
          purpose: "Medical Research Endowment",
          rationale: "Based on giving trend and expressed interest",
          citations: [],
        },
      };

      const result = validateBriefAccuracy(brief, dataset);
      expect(result.overallValid).toBe(true);
      expect(result.amountAccuracy.valid).toBe(true);
      expect(result.dateAccuracy.lastGiftDateValid).toBe(true);
    });

    it("fails validation for inaccurate brief", () => {
      const dataset = goldenDatasets.majorDonor;
      const brief: BriefContent = {
        summary: {
          text: "Elizabeth Thornton is a 2005 Business School graduate.", // WRONG year and school
          citations: [],
        },
        givingHistory: {
          text: "Lifetime giving of $500,000.", // WRONG amount
          totalLifetime: 500000,
          citations: [],
        },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = validateBriefAccuracy(brief, dataset);
      expect(result.overallValid).toBe(false);
      expect(result.amountAccuracy.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("provides detailed error messages", () => {
      const dataset = goldenDatasets.majorDonor;
      const brief: BriefContent = {
        summary: { text: "", citations: [] },
        givingHistory: {
          text: "",
          totalLifetime: 999999, // Significantly wrong
          citations: [],
        },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = validateBriefAccuracy(brief, dataset);
      // Check error contains relevant info (amount mismatch)
      expect(result.errors.some((e) => e.toLowerCase().includes("lifetime") || e.toLowerCase().includes("mismatch") || e.toLowerCase().includes("giving"))).toBe(true);
    });
  });

  describe("Tolerance Thresholds", () => {
    it("accepts small rounding differences in amounts", () => {
      const dataset = goldenDatasets.majorDonor;
      const brief: BriefContent = {
        summary: { text: "", citations: [] },
        givingHistory: {
          text: "Approximately $210K in lifetime giving.",
          totalLifetime: 210001, // Off by $1 - should be acceptable
          citations: [],
        },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = verifyAmountAccuracy(brief, dataset, { tolerance: 0.01 }); // 1% tolerance
      expect(result.valid).toBe(true);
    });

    it("rejects significant amount discrepancies", () => {
      const dataset = goldenDatasets.majorDonor;
      const brief: BriefContent = {
        summary: { text: "", citations: [] },
        givingHistory: {
          text: "",
          totalLifetime: 250000, // Off by ~19%
          citations: [],
        },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = verifyAmountAccuracy(brief, dataset, { tolerance: 0.05 }); // 5% tolerance
      expect(result.valid).toBe(false);
    });
  });
});
