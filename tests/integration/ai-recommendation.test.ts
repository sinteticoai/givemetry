// T194: Integration tests for recommendation procedures
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateRecommendation,
  buildConstituentContext,
} from "@/server/services/ai/recommendation-engine";

describe("AI Router - Recommendation Procedures", () => {
  const mockConstituentData = {
    id: "c3c3c3c3-c3c3-4c3c-ac3c-c3c3c3c3c3c3",
    organizationId: "22222222-2222-4222-a222-222222222222",
    externalId: "EXT-001",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    constituentType: "alumni",
    classYear: 1995,
    estimatedCapacity: 150000,
    portfolioTier: "major",
    lapseRiskScore: 0.35,
    priorityScore: 0.75,
    assignedOfficerId: "33333333-3333-4333-a333-333333333333",
    isActive: true,
  };

  const mockGifts = [
    {
      id: "55555555-5555-4555-a555-555555555551",
      amount: 5000,
      giftDate: new Date("2025-06-15"),
      giftType: "cash",
      fundName: "Annual Fund",
    },
    {
      id: "55555555-5555-4555-a555-555555555552",
      amount: 10000,
      giftDate: new Date("2024-12-01"),
      giftType: "cash",
      fundName: "Scholarship Fund",
    },
  ];

  const mockContacts = [
    {
      id: "66666666-6666-4666-a666-666666666661",
      contactType: "meeting",
      contactDate: new Date("2025-11-15"),
      subject: "Annual Fund discussion",
    },
  ];

  const mockPredictions = [
    {
      id: "cccccccc-cccc-4ccc-accc-cccccccccc01",
      predictionType: "lapse_risk",
      score: 0.35,
      confidence: 0.85,
    },
    {
      id: "cccccccc-cccc-4ccc-accc-cccccccccc02",
      predictionType: "priority",
      score: 0.75,
      confidence: 0.82,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("buildConstituentContext", () => {
    it("should build context from database records correctly", () => {
      const context = buildConstituentContext({
        constituent: {
          id: mockConstituentData.id,
          firstName: mockConstituentData.firstName,
          lastName: mockConstituentData.lastName,
          constituentType: mockConstituentData.constituentType,
          priorityScore: mockConstituentData.priorityScore,
          lapseRiskScore: mockConstituentData.lapseRiskScore,
          estimatedCapacity: mockConstituentData.estimatedCapacity,
        },
        gifts: mockGifts.map((g) => ({
          amount: g.amount,
          giftDate: g.giftDate,
        })),
        contacts: mockContacts.map((c) => ({
          contactDate: c.contactDate,
          contactType: c.contactType,
        })),
        predictions: mockPredictions.map((p) => ({
          predictionType: p.predictionType,
          score: p.score,
          confidence: p.confidence,
        })),
        fiscalYearEnd: new Date("2026-06-30"),
        activeCampaigns: ["Annual Fund 2026"],
      });

      expect(context.id).toBe("c3c3c3c3-c3c3-4c3c-ac3c-c3c3c3c3c3c3");
      expect(context.name).toBe("John Smith");
      expect(context.priorityScore).toBe(0.75);
      expect(context.lapseRiskScore).toBe(0.35);
      expect(context.lapseRiskLevel).toBe("low");
      expect(context.capacity.label).toBe("$100K-$250K");
      expect(context.engagement.giftCount).toBe(2);
      expect(context.engagement.totalGiving).toBe(15000);
      expect(context.timing.activeCampaigns).toContain("Annual Fund 2026");
    });

    it("should handle missing optional fields", () => {
      const context = buildConstituentContext({
        constituent: {
          id: "c4c4c4c4-c4c4-4c4c-ac4c-c4c4c4c4c4c4",
          firstName: null,
          lastName: "Doe",
          constituentType: null,
          priorityScore: null,
          lapseRiskScore: null,
          estimatedCapacity: null,
        },
        gifts: [],
        contacts: [],
        predictions: [],
        fiscalYearEnd: new Date("2026-06-30"),
      });

      expect(context.name).toBe("Doe");
      expect(context.priorityScore).toBe(0);
      expect(context.lapseRiskScore).toBeNull();
      expect(context.capacity.label).toBe("< $10K");
      expect(context.engagement.giftCount).toBe(0);
    });

    it("should calculate correct capacity labels for different amounts", () => {
      const testCases = [
        { capacity: 2000000, expected: "$1M+" },
        { capacity: 750000, expected: "$500K-$1M" },
        { capacity: 300000, expected: "$250K-$500K" },
        { capacity: 150000, expected: "$100K-$250K" },
        { capacity: 75000, expected: "$50K-$100K" },
        { capacity: 35000, expected: "$25K-$50K" },
        { capacity: 15000, expected: "$10K-$25K" },
        { capacity: 5000, expected: "< $10K" },
      ];

      for (const { capacity, expected } of testCases) {
        const context = buildConstituentContext({
          constituent: {
            id: "test",
            firstName: "Test",
            lastName: "User",
            constituentType: null,
            priorityScore: null,
            lapseRiskScore: null,
            estimatedCapacity: capacity,
          },
          gifts: [],
          contacts: [],
          predictions: [],
          fiscalYearEnd: new Date("2026-06-30"),
        });

        expect(context.capacity.label).toBe(expected);
      }
    });
  });

  describe("generateRecommendation integration", () => {
    it("should generate valid recommendation from full context", () => {
      const context = buildConstituentContext({
        constituent: {
          id: mockConstituentData.id,
          firstName: mockConstituentData.firstName,
          lastName: mockConstituentData.lastName,
          constituentType: mockConstituentData.constituentType,
          priorityScore: mockConstituentData.priorityScore,
          lapseRiskScore: mockConstituentData.lapseRiskScore,
          estimatedCapacity: mockConstituentData.estimatedCapacity,
        },
        gifts: mockGifts.map((g) => ({
          amount: g.amount,
          giftDate: g.giftDate,
        })),
        contacts: mockContacts.map((c) => ({
          contactDate: c.contactDate,
          contactType: c.contactType,
        })),
        predictions: mockPredictions.map((p) => ({
          predictionType: p.predictionType,
          score: p.score,
          confidence: p.confidence,
        })),
        fiscalYearEnd: new Date("2026-06-30"),
        activeCampaigns: ["Annual Fund 2026"],
      });

      const recommendation = generateRecommendation(context);

      expect(recommendation).toBeDefined();
      expect(recommendation.actionType).toBeTruthy();
      expect(recommendation.actionLabel).toBeTruthy();
      expect(recommendation.reasoning).toBeTruthy();
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
      expect(recommendation.nextSteps.length).toBeGreaterThan(0);
    });

    it("should recommend stewardship for recent gift without follow-up", () => {
      const recentGiftContext = buildConstituentContext({
        constituent: {
          id: "11112222-3333-4444-a555-666677778888",
          firstName: "Jane",
          lastName: "Donor",
          constituentType: "alumni",
          priorityScore: 0.7,
          lapseRiskScore: 0.2,
          estimatedCapacity: 100000,
        },
        gifts: [
          { amount: 5000, giftDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, // 5 days ago
        ],
        contacts: [
          { contactDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), contactType: "call" }, // 60 days ago
        ],
        predictions: [],
        fiscalYearEnd: new Date("2026-06-30"),
      });

      const recommendation = generateRecommendation(recentGiftContext);

      expect(recommendation).toBeDefined();
      // Should recommend stewardship-related actions
      expect(["stewardship_call", "thank_you_visit", "schedule_meeting"]).toContain(recommendation.actionType);
    });

    it("should recommend re-engagement for high lapse risk", () => {
      const highRiskContext = buildConstituentContext({
        constituent: {
          id: "22223333-4444-4555-a666-777788889999",
          firstName: "At",
          lastName: "Risk",
          constituentType: "alumni",
          priorityScore: 0.5,
          lapseRiskScore: 0.85,
          estimatedCapacity: 75000,
        },
        gifts: [
          { amount: 1000, giftDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) }, // Over a year ago
        ],
        contacts: [
          { contactDate: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000), contactType: "email" }, // 10 months ago
        ],
        predictions: [
          { predictionType: "lapse_risk", score: 0.85, confidence: 0.8 },
        ],
        fiscalYearEnd: new Date("2026-06-30"),
      });

      const recommendation = generateRecommendation(highRiskContext);

      expect(recommendation).toBeDefined();
      // Should recommend re-engagement actions
      expect(["re_engagement_call", "schedule_meeting", "send_impact_report"]).toContain(recommendation.actionType);
    });

    it("should provide campaign-aligned recommendations when campaigns are active", () => {
      const campaignContext = buildConstituentContext({
        constituent: {
          id: "33334444-5555-4666-a777-888899990000",
          firstName: "Campaign",
          lastName: "Target",
          constituentType: "alumni",
          priorityScore: 0.8,
          lapseRiskScore: 0.3,
          estimatedCapacity: 200000,
        },
        gifts: [
          { amount: 10000, giftDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }, // 6 months ago
        ],
        contacts: [
          { contactDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), contactType: "meeting" },
        ],
        predictions: [],
        fiscalYearEnd: new Date("2026-06-30"),
        activeCampaigns: ["Capital Campaign", "Annual Fund 2026"],
      });

      const recommendation = generateRecommendation(campaignContext);

      expect(recommendation).toBeDefined();
      // Should mention campaign in reasoning or next steps
      const hasCampaignReference =
        recommendation.reasoning.toLowerCase().includes("campaign") ||
        recommendation.nextSteps.some((s) => s.toLowerCase().includes("campaign")) ||
        recommendation.context.supportingFactors.some((f) => f.toLowerCase().includes("campaign"));

      expect(hasCampaignReference).toBe(true);
    });
  });

  describe("Recommendation Consistency", () => {
    it("should provide consistent recommendations for same input", () => {
      const context = buildConstituentContext({
        constituent: {
          id: "44445555-6666-4777-a888-999900001111",
          firstName: "Test",
          lastName: "Consistency",
          constituentType: "alumni",
          priorityScore: 0.7,
          lapseRiskScore: 0.4,
          estimatedCapacity: 100000,
        },
        gifts: [{ amount: 5000, giftDate: new Date("2025-06-15") }],
        contacts: [{ contactDate: new Date("2025-10-01"), contactType: "call" }],
        predictions: [],
        fiscalYearEnd: new Date("2026-06-30"),
        referenceDate: new Date("2026-01-15"),
      });

      const recommendation1 = generateRecommendation(context);
      const recommendation2 = generateRecommendation(context);

      // Same input should produce same output
      expect(recommendation1.actionType).toBe(recommendation2.actionType);
      expect(recommendation1.urgencyLevel).toBe(recommendation2.urgencyLevel);
    });

    it("should include all required fields in recommendation", () => {
      const context = buildConstituentContext({
        constituent: {
          id: "55556666-7777-4888-a999-000011112222",
          firstName: "Required",
          lastName: "Fields",
          constituentType: null,
          priorityScore: 0.5,
          lapseRiskScore: 0.5,
          estimatedCapacity: 50000,
        },
        gifts: [],
        contacts: [],
        predictions: [],
        fiscalYearEnd: new Date("2026-06-30"),
      });

      const recommendation = generateRecommendation(context);

      // Check all required fields are present
      expect(recommendation.actionType).toBeDefined();
      expect(recommendation.actionLabel).toBeDefined();
      expect(recommendation.actionDescription).toBeDefined();
      expect(recommendation.reasoning).toBeDefined();
      expect(typeof recommendation.confidence).toBe("number");
      expect(["high", "medium", "low"]).toContain(recommendation.urgencyLevel);
      expect(Array.isArray(recommendation.nextSteps)).toBe(true);
      expect(Array.isArray(recommendation.alternatives)).toBe(true);
      expect(recommendation.context.primaryFactor).toBeDefined();
      expect(Array.isArray(recommendation.context.supportingFactors)).toBe(true);
    });
  });
});
