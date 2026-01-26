// T153: Unit tests for Claude API client wrapper
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createClaudeClient,
  generateCompletion,
  generateBriefContent,
  type ClaudeMessage,
  type ClaudeResponse,
  CLAUDE_MODELS,
} from "@/lib/ai/claude";

// Mock the Anthropic SDK
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: mockCreate,
    };
  },
}));

describe("Claude API Client", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createClaudeClient", () => {
    it("creates a client with API key", () => {
      const client = createClaudeClient("test-api-key");
      expect(client).toBeDefined();
    });

    it("throws error without API key", () => {
      expect(() => createClaudeClient("")).toThrow("API key is required");
    });
  });

  describe("generateCompletion", () => {
    it("sends message and returns response", async () => {
      const mockResponse: ClaudeResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Hello, this is a test response." }],
        model: "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const messages: ClaudeMessage[] = [
        { role: "user", content: "Hello" },
      ];

      const result = await generateCompletion({
        apiKey: "test-key",
        messages,
        model: CLAUDE_MODELS.SONNET,
      });

      expect(result).toBeDefined();
      expect(result.content).toBe("Hello, this is a test response.");
      expect(result.usage.inputTokens).toBe(10);
      expect(result.usage.outputTokens).toBe(20);
    });

    it("handles system message correctly", async () => {
      const mockResponse: ClaudeResponse = {
        id: "msg_124",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Response with system prompt" }],
        model: "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        usage: { input_tokens: 50, output_tokens: 30 },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await generateCompletion({
        apiKey: "test-key",
        messages: [{ role: "user", content: "Test" }],
        systemPrompt: "You are a helpful assistant.",
        model: CLAUDE_MODELS.SONNET,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "You are a helpful assistant.",
        })
      );
      expect(result.content).toBe("Response with system prompt");
    });

    it("respects max tokens setting", async () => {
      mockCreate.mockResolvedValue({
        id: "msg_125",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Response" }],
        model: "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 10 },
      });

      await generateCompletion({
        apiKey: "test-key",
        messages: [{ role: "user", content: "Test" }],
        model: CLAUDE_MODELS.SONNET,
        maxTokens: 500,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 500,
        })
      );
    });

    it("handles API errors gracefully", async () => {
      mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

      await expect(
        generateCompletion({
          apiKey: "test-key",
          messages: [{ role: "user", content: "Test" }],
          model: CLAUDE_MODELS.SONNET,
        })
      ).rejects.toThrow("API rate limit exceeded");
    });

    it("handles empty response content", async () => {
      mockCreate.mockResolvedValue({
        id: "msg_126",
        type: "message",
        role: "assistant",
        content: [],
        model: "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 0 },
      });

      const result = await generateCompletion({
        apiKey: "test-key",
        messages: [{ role: "user", content: "Test" }],
        model: CLAUDE_MODELS.SONNET,
      });

      expect(result.content).toBe("");
    });
  });

  describe("generateBriefContent", () => {
    it("generates structured brief content from donor data", async () => {
      const mockBriefJson = JSON.stringify({
        summary: {
          text: "Dr. John Smith is a valued Engineering alumnus with 15 years of giving history.",
          citations: [{ source: "profile", sourceId: "c123", text: "Engineering alumnus" }],
        },
        givingHistory: {
          text: "Has made 12 gifts totaling $125,000 over 15 years.",
          totalLifetime: 125000,
          citations: [{ source: "gift", sourceId: "g456", text: "$125,000 lifetime" }],
        },
        relationshipHighlights: {
          text: "Strong relationship with annual fund team.",
          citations: [],
        },
        conversationStarters: {
          items: [
            "Thank for the recent scholarship gift",
            "Discuss new Engineering building project",
            "Ask about experience at homecoming",
          ],
          citations: [],
        },
        recommendedAsk: {
          amount: 15000,
          purpose: "Engineering Excellence Fund",
          rationale: "Based on giving pattern and capacity",
          citations: [],
        },
      });

      mockCreate.mockResolvedValue({
        id: "msg_brief",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: mockBriefJson }],
        model: "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const constituentData = {
        id: "c123",
        firstName: "John",
        lastName: "Smith",
        prefix: "Dr.",
        email: "john.smith@example.com",
        constituentType: "alumni",
        classYear: 1995,
        schoolCollege: "Engineering",
      };

      const gifts = [
        { id: "g1", amount: 10000, giftDate: new Date("2025-12-01"), fundName: "Annual Fund" },
        { id: "g2", amount: 15000, giftDate: new Date("2024-12-01"), fundName: "Scholarship Fund" },
      ];

      const contacts = [
        { id: "ct1", contactType: "meeting", contactDate: new Date("2025-11-15"), notes: "Discussed giving goals" },
      ];

      const result = await generateBriefContent({
        apiKey: "test-key",
        constituent: constituentData,
        gifts,
        contacts,
      });

      expect(result.brief).toBeDefined();
      expect(result.brief.summary.text).toContain("John Smith");
      expect(result.brief.givingHistory.totalLifetime).toBe(125000);
      expect(result.brief.conversationStarters.items).toHaveLength(3);
      expect(result.brief.recommendedAsk.amount).toBe(15000);
      expect(result.usage.inputTokens).toBe(500);
      expect(result.usage.outputTokens).toBe(300);
    });

    it("handles donors with no giving history", async () => {
      const mockBriefJson = JSON.stringify({
        summary: {
          text: "Jane Doe is a new prospect.",
          citations: [],
        },
        givingHistory: {
          text: "No giving history on record.",
          totalLifetime: 0,
          citations: [],
        },
        relationshipHighlights: {
          text: "No previous interactions recorded.",
          citations: [],
        },
        conversationStarters: {
          items: ["Introduce advancement priorities", "Discuss areas of interest"],
          citations: [],
        },
        recommendedAsk: {
          amount: null,
          purpose: "Discovery meeting",
          rationale: "Need to establish relationship first",
          citations: [],
        },
      });

      mockCreate.mockResolvedValue({
        id: "msg_brief2",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: mockBriefJson }],
        model: "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        usage: { input_tokens: 200, output_tokens: 150 },
      });

      const result = await generateBriefContent({
        apiKey: "test-key",
        constituent: {
          id: "c456",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane.doe@example.com",
        },
        gifts: [],
        contacts: [],
      });

      expect(result.brief.givingHistory.totalLifetime).toBe(0);
      expect(result.brief.givingHistory.text).toContain("No giving history");
    });

    it("throws error for invalid JSON response", async () => {
      mockCreate.mockResolvedValue({
        id: "msg_invalid",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "This is not valid JSON" }],
        model: "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        usage: { input_tokens: 100, output_tokens: 10 },
      });

      await expect(
        generateBriefContent({
          apiKey: "test-key",
          constituent: { id: "c789", firstName: "Test", lastName: "User" },
          gifts: [],
          contacts: [],
        })
      ).rejects.toThrow("Failed to parse brief content");
    });
  });

  describe("CLAUDE_MODELS", () => {
    it("exports available model identifiers", () => {
      expect(CLAUDE_MODELS.SONNET).toBeDefined();
      expect(CLAUDE_MODELS.HAIKU).toBeDefined();
      expect(typeof CLAUDE_MODELS.SONNET).toBe("string");
      expect(typeof CLAUDE_MODELS.HAIKU).toBe("string");
    });
  });
});
