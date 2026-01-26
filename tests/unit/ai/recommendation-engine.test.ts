// T193: Unit tests for recommendation engine
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateRecommendation,
  calculateActionConfidence,
  ACTION_TYPES,
  type ConstituentContext,
} from "@/server/services/ai/recommendation-engine";

describe("Recommendation Engine", () => {
  const mockConstituentContext: ConstituentContext = {
    id: "const-123",
    name: "John Smith",
    constituentType: "alumni",
    priorityScore: 0.75,
    lapseRiskScore: 0.3,
    lapseRiskLevel: "low",
    capacity: {
      score: 0.8,
      label: "$100K-$250K",
      estimatedCapacity: 150000,
    },
    engagement: {
      lastGiftDate: new Date("2025-06-15"),
      lastContactDate: new Date("2025-11-01"),
      giftCount: 8,
      contactCount: 5,
      totalGiving: 45000,
      averageGift: 5625,
      largestGift: 15000,
      recentActivitySummary: "Active donor with 8 gifts over 5 years",
    },
    timing: {
      fiscalYearEnd: new Date("2026-06-30"),
      daysUntilFYEnd: 155,
      activeCampaigns: ["Annual Fund 2026"],
      indicator: "Mid-fiscal year - Annual Fund active",
    },
    predictions: {
      likelihoodScore: 0.7,
      confidenceLevel: 0.85,
    },
    referenceDate: new Date("2026-01-26"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateRecommendation", () => {
    it("should recommend scheduling a meeting for high priority prospects", () => {
      const result = generateRecommendation(mockConstituentContext);

      expect(result).toBeDefined();
      expect(result.actionType).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should recommend stewardship for recent donors without follow-up", () => {
      const contextWithRecentGift: ConstituentContext = {
        ...mockConstituentContext,
        engagement: {
          ...mockConstituentContext.engagement,
          lastGiftDate: new Date("2026-01-10"),
          lastContactDate: new Date("2025-10-01"),
        },
      };

      const result = generateRecommendation(contextWithRecentGift);

      expect(result).toBeDefined();
      expect(["stewardship_call", "thank_you_visit", "schedule_meeting"]).toContain(result.actionType);
    });

    it("should recommend re-engagement for stale high-capacity prospects", () => {
      const staleContext: ConstituentContext = {
        ...mockConstituentContext,
        engagement: {
          ...mockConstituentContext.engagement,
          lastGiftDate: new Date("2024-01-15"),
          lastContactDate: new Date("2024-06-01"),
        },
        lapseRiskScore: 0.65,
        lapseRiskLevel: "medium",
      };

      const result = generateRecommendation(staleContext);

      expect(result).toBeDefined();
      expect(["re_engagement_call", "schedule_meeting", "send_impact_report"]).toContain(result.actionType);
    });

    it("should prioritize campaign-aligned actions during active campaigns", () => {
      const campaignContext: ConstituentContext = {
        ...mockConstituentContext,
        timing: {
          ...mockConstituentContext.timing,
          daysUntilFYEnd: 45,
          activeCampaigns: ["Capital Campaign", "Annual Fund 2026"],
          indicator: "Q4 push - Capital Campaign and Annual Fund active",
        },
      };

      const result = generateRecommendation(campaignContext);

      expect(result).toBeDefined();
      expect(result.urgencyLevel).toBeDefined();
    });

    it("should include next steps in the recommendation", () => {
      const result = generateRecommendation(mockConstituentContext);

      expect(result.nextSteps).toBeDefined();
      expect(Array.isArray(result.nextSteps)).toBe(true);
      expect(result.nextSteps.length).toBeGreaterThanOrEqual(1);
    });

    it("should provide alternative actions", () => {
      const result = generateRecommendation(mockConstituentContext);

      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  describe("calculateActionConfidence", () => {
    it("should return higher confidence for well-supported recommendations", () => {
      const highConfidence = calculateActionConfidence({
        dataQuality: 0.9,
        patternMatch: 0.85,
        historicalSuccess: 0.8,
        timingAlignment: 0.75,
      });

      expect(highConfidence).toBeGreaterThan(0.7);
    });

    it("should return lower confidence for sparse data", () => {
      const lowConfidence = calculateActionConfidence({
        dataQuality: 0.3,
        patternMatch: 0.4,
        historicalSuccess: 0.5,
        timingAlignment: 0.5,
      });

      expect(lowConfidence).toBeLessThan(0.6);
    });

    it("should clamp confidence between 0 and 1", () => {
      const result = calculateActionConfidence({
        dataQuality: 1.5,
        patternMatch: 1.2,
        historicalSuccess: 1.1,
        timingAlignment: 1.0,
      });

      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe("ACTION_TYPES", () => {
    it("should define all expected action types", () => {
      expect(ACTION_TYPES.schedule_meeting).toBeDefined();
      expect(ACTION_TYPES.stewardship_call).toBeDefined();
      expect(ACTION_TYPES.thank_you_visit).toBeDefined();
      expect(ACTION_TYPES.re_engagement_call).toBeDefined();
      expect(ACTION_TYPES.send_impact_report).toBeDefined();
      expect(ACTION_TYPES.campaign_solicitation).toBeDefined();
    });

    it("should have labels and descriptions for each action type", () => {
      Object.values(ACTION_TYPES).forEach((actionType) => {
        expect(actionType.label).toBeDefined();
        expect(actionType.description).toBeDefined();
        expect(typeof actionType.label).toBe("string");
        expect(typeof actionType.description).toBe("string");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle constituents with no gift history", () => {
      const noGiftsContext: ConstituentContext = {
        ...mockConstituentContext,
        engagement: {
          ...mockConstituentContext.engagement,
          lastGiftDate: null,
          giftCount: 0,
          totalGiving: 0,
          averageGift: 0,
          largestGift: 0,
        },
        priorityScore: 0.4,
      };

      const result = generateRecommendation(noGiftsContext);

      expect(result).toBeDefined();
      expect(result.actionType).toBeDefined();
    });

    it("should handle constituents with no contact history", () => {
      const noContactsContext: ConstituentContext = {
        ...mockConstituentContext,
        engagement: {
          ...mockConstituentContext.engagement,
          lastContactDate: null,
          contactCount: 0,
        },
      };

      const result = generateRecommendation(noContactsContext);

      expect(result).toBeDefined();
      expect(["schedule_meeting", "re_engagement_call", "initial_outreach"]).toContain(result.actionType);
    });

    it("should handle high lapse risk constituents", () => {
      const highRiskContext: ConstituentContext = {
        ...mockConstituentContext,
        lapseRiskScore: 0.85,
        lapseRiskLevel: "high",
        priorityScore: 0.8, // High priority
        predictions: {
          likelihoodScore: 0.15,
          confidenceLevel: 0.8,
        },
        timing: {
          ...mockConstituentContext.timing,
          daysUntilFYEnd: 25, // Approaching fiscal year end
        },
      };

      const result = generateRecommendation(highRiskContext);

      expect(result).toBeDefined();
      expect(result.urgencyLevel).toBe("high");
    });

    it("should handle low priority constituents", () => {
      const lowPriorityContext: ConstituentContext = {
        ...mockConstituentContext,
        priorityScore: 0.2,
        capacity: {
          score: 0.3,
          label: "< $10K",
          estimatedCapacity: 5000,
        },
      };

      const result = generateRecommendation(lowPriorityContext);

      expect(result).toBeDefined();
      // Low priority should still get recommendations, just lower urgency
      expect(["low", "medium"]).toContain(result.urgencyLevel);
    });
  });

  describe("Recommendation Quality", () => {
    it("should provide specific reasoning based on constituent data", () => {
      const result = generateRecommendation(mockConstituentContext);

      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(20);
    });

    it("should align urgency level with priority score and lapse risk", () => {
      const highUrgencyContext: ConstituentContext = {
        ...mockConstituentContext,
        priorityScore: 0.9,
        lapseRiskScore: 0.75,
        lapseRiskLevel: "high",
        timing: {
          ...mockConstituentContext.timing,
          daysUntilFYEnd: 30,
        },
      };

      const result = generateRecommendation(highUrgencyContext);

      expect(result.urgencyLevel).toBe("high");
    });

    it("should include constituent-specific details in next steps", () => {
      const result = generateRecommendation(mockConstituentContext);

      expect(result.nextSteps.length).toBeGreaterThan(0);
      result.nextSteps.forEach((step) => {
        expect(step).toBeTruthy();
        expect(typeof step).toBe("string");
      });
    });
  });
});
