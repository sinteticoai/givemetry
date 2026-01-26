// T154: Unit tests for citation validator
import { describe, it, expect } from "vitest";
import {
  validateCitations,
  extractCitations,
  createCitation,
  verifyCitationSource,
  type Citation,
  type CitationSource,
  type BriefContent,
} from "@/server/services/ai/citation-validator";

describe("Citation Validator", () => {
  describe("createCitation", () => {
    it("creates a valid citation object", () => {
      const citation = createCitation({
        text: "Has made 12 gifts totaling $125,000",
        source: "gift",
        sourceId: "gift-123",
        date: "2025-12-01",
      });

      expect(citation).toEqual({
        text: "Has made 12 gifts totaling $125,000",
        source: "gift",
        sourceId: "gift-123",
        date: "2025-12-01",
      });
    });

    it("creates citation without optional date", () => {
      const citation = createCitation({
        text: "Engineering alumnus",
        source: "profile",
        sourceId: "constituent-456",
      });

      expect(citation.date).toBeUndefined();
    });

    it("validates required fields", () => {
      expect(() =>
        createCitation({
          text: "",
          source: "profile",
          sourceId: "123",
        })
      ).toThrow("Citation text is required");

      expect(() =>
        createCitation({
          text: "Some text",
          source: "" as CitationSource,
          sourceId: "123",
        })
      ).toThrow("Citation source is required");

      expect(() =>
        createCitation({
          text: "Some text",
          source: "profile",
          sourceId: "",
        })
      ).toThrow("Citation sourceId is required");
    });
  });

  describe("extractCitations", () => {
    it("extracts all citations from brief content", () => {
      const briefContent: BriefContent = {
        summary: {
          text: "Dr. Smith is a valued donor.",
          citations: [
            { text: "valued donor", source: "profile", sourceId: "c1" },
          ],
        },
        givingHistory: {
          text: "Made 5 gifts.",
          totalLifetime: 50000,
          citations: [
            { text: "5 gifts", source: "gift", sourceId: "g1" },
            { text: "5 gifts", source: "gift", sourceId: "g2" },
          ],
        },
        relationshipHighlights: {
          text: "Strong relationship.",
          citations: [
            { text: "meeting in Nov", source: "contact", sourceId: "ct1" },
          ],
        },
        conversationStarters: {
          items: ["Thank for gift", "Discuss project"],
          citations: [],
        },
        recommendedAsk: {
          amount: 10000,
          purpose: "Annual Fund",
          rationale: "Based on history",
          citations: [
            { text: "giving pattern", source: "prediction", sourceId: "p1" },
          ],
        },
      };

      const citations = extractCitations(briefContent);

      expect(citations).toHaveLength(5);
      expect(citations.map((c) => c.sourceId)).toEqual(
        expect.arrayContaining(["c1", "g1", "g2", "ct1", "p1"])
      );
    });

    it("handles brief with no citations", () => {
      const briefContent: BriefContent = {
        summary: { text: "Summary", citations: [] },
        givingHistory: { text: "History", totalLifetime: 0, citations: [] },
        relationshipHighlights: { text: "Highlights", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const citations = extractCitations(briefContent);
      expect(citations).toHaveLength(0);
    });

    it("deduplicates citations with same sourceId", () => {
      const briefContent: BriefContent = {
        summary: {
          text: "Summary",
          citations: [{ text: "Text 1", source: "gift", sourceId: "g1" }],
        },
        givingHistory: {
          text: "History",
          totalLifetime: 1000,
          citations: [{ text: "Text 2", source: "gift", sourceId: "g1" }], // Same sourceId
        },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const citations = extractCitations(briefContent, { deduplicate: true });
      expect(citations).toHaveLength(1);
    });
  });

  describe("verifyCitationSource", () => {
    const sourceData = {
      constituent: {
        id: "c123",
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        constituentType: "alumni",
        classYear: 1995,
      },
      gifts: [
        { id: "g1", amount: 10000, giftDate: new Date("2025-12-01"), fundName: "Annual Fund" },
        { id: "g2", amount: 5000, giftDate: new Date("2024-12-01"), fundName: "Scholarship" },
      ],
      contacts: [
        { id: "ct1", contactType: "meeting", contactDate: new Date("2025-11-15"), notes: "Discussed giving" },
      ],
      predictions: [
        { id: "p1", predictionType: "priority", score: 0.85 },
      ],
    };

    it("verifies valid profile citation", () => {
      const citation: Citation = {
        text: "John Smith",
        source: "profile",
        sourceId: "c123",
      };

      const result = verifyCitationSource(citation, sourceData);
      expect(result.valid).toBe(true);
      expect(result.matchedData).toBeDefined();
    });

    it("verifies valid gift citation", () => {
      const citation: Citation = {
        text: "Annual Fund gift",
        source: "gift",
        sourceId: "g1",
      };

      const result = verifyCitationSource(citation, sourceData);
      expect(result.valid).toBe(true);
      expect(result.matchedData).toHaveProperty("amount", 10000);
    });

    it("verifies valid contact citation", () => {
      const citation: Citation = {
        text: "Meeting notes",
        source: "contact",
        sourceId: "ct1",
      };

      const result = verifyCitationSource(citation, sourceData);
      expect(result.valid).toBe(true);
    });

    it("verifies valid prediction citation", () => {
      const citation: Citation = {
        text: "High priority score",
        source: "prediction",
        sourceId: "p1",
      };

      const result = verifyCitationSource(citation, sourceData);
      expect(result.valid).toBe(true);
    });

    it("rejects citation with non-existent source", () => {
      const citation: Citation = {
        text: "Some text",
        source: "gift",
        sourceId: "nonexistent",
      };

      const result = verifyCitationSource(citation, sourceData);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("rejects citation with wrong constituent id", () => {
      const citation: Citation = {
        text: "Some text",
        source: "profile",
        sourceId: "wrong-id",
      };

      const result = verifyCitationSource(citation, sourceData);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateCitations", () => {
    const sourceData = {
      constituent: {
        id: "c123",
        firstName: "John",
        lastName: "Smith",
      },
      gifts: [
        { id: "g1", amount: 10000, giftDate: new Date("2025-12-01") },
      ],
      contacts: [
        { id: "ct1", contactType: "meeting", contactDate: new Date("2025-11-15") },
      ],
      predictions: [],
    };

    it("validates all citations in a brief", () => {
      const briefContent: BriefContent = {
        summary: {
          text: "John Smith summary",
          citations: [{ text: "John Smith", source: "profile", sourceId: "c123" }],
        },
        givingHistory: {
          text: "One gift of $10,000",
          totalLifetime: 10000,
          citations: [{ text: "$10,000 gift", source: "gift", sourceId: "g1" }],
        },
        relationshipHighlights: {
          text: "Meeting in November",
          citations: [{ text: "meeting", source: "contact", sourceId: "ct1" }],
        },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = validateCitations(briefContent, sourceData);

      expect(result.valid).toBe(true);
      expect(result.validCount).toBe(3);
      expect(result.invalidCount).toBe(0);
      expect(result.invalidCitations).toHaveLength(0);
    });

    it("identifies invalid citations", () => {
      const briefContent: BriefContent = {
        summary: {
          text: "Summary",
          citations: [
            { text: "Valid", source: "profile", sourceId: "c123" },
            { text: "Invalid", source: "gift", sourceId: "nonexistent" },
          ],
        },
        givingHistory: { text: "", totalLifetime: 0, citations: [] },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = validateCitations(briefContent, sourceData);

      expect(result.valid).toBe(false);
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(1);
      expect(result.invalidCitations).toHaveLength(1);
      expect(result.invalidCitations[0].sourceId).toBe("nonexistent");
    });

    it("returns valid for brief with no citations", () => {
      const briefContent: BriefContent = {
        summary: { text: "Summary", citations: [] },
        givingHistory: { text: "", totalLifetime: 0, citations: [] },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = validateCitations(briefContent, sourceData);

      expect(result.valid).toBe(true);
      expect(result.validCount).toBe(0);
      expect(result.invalidCount).toBe(0);
    });

    it("provides detailed error messages for invalid citations", () => {
      const briefContent: BriefContent = {
        summary: {
          text: "Summary",
          citations: [{ text: "Wrong ID", source: "profile", sourceId: "wrong-id" }],
        },
        givingHistory: { text: "", totalLifetime: 0, citations: [] },
        relationshipHighlights: { text: "", citations: [] },
        conversationStarters: { items: [], citations: [] },
        recommendedAsk: { amount: null, purpose: "", rationale: "", citations: [] },
      };

      const result = validateCitations(briefContent, sourceData);

      expect(result.invalidCitations[0]).toHaveProperty("error");
      expect(result.invalidCitations[0].error).toBeDefined();
    });
  });
});
