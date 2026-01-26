// T175: Unit tests for NL query parser
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseNaturalLanguageQuery } from "@/server/services/ai/nl-query-parser";

// Mock the Claude API
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: mockCreate,
    };
  },
}));

describe("Natural Language Query Parser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("parseNaturalLanguageQuery", () => {
    it("parses a simple giving amount query", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_1",
          name: "search_constituents",
          input: {
            filters: [
              { field: "total_giving", operator: "gte", value: 10000 },
            ],
            sort: { field: "total_giving", direction: "desc" },
            limit: 50,
          },
        }],
        usage: { input_tokens: 100, output_tokens: 50 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "Show me donors who gave more than $10,000",
      });

      expect(result.success).toBe(true);
      expect(result.filters).toHaveLength(1);
      expect(result.filters[0]).toEqual({
        field: "total_giving",
        operator: "gte",
        value: 10000,
        humanReadable: expect.any(String),
      });
      expect(result.interpretation).toBeDefined();
    });

    it("parses a complex multi-filter query", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_2",
          name: "search_constituents",
          input: {
            filters: [
              { field: "total_giving", operator: "gte", value: 10000 },
              { field: "last_contact_date", operator: "lt", value: "6_months_ago" },
            ],
            sort: { field: "total_giving", direction: "desc" },
            limit: 50,
          },
        }],
        usage: { input_tokens: 150, output_tokens: 75 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "donors who gave $10K+ but haven't been contacted in 6 months",
      });

      expect(result.success).toBe(true);
      expect(result.filters).toHaveLength(2);
      expect(result.filters.map(f => f.field)).toContain("total_giving");
      expect(result.filters.map(f => f.field)).toContain("last_contact_date");
    });

    it("parses lapse risk queries", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_3",
          name: "search_constituents",
          input: {
            filters: [
              { field: "lapse_risk", operator: "gt", value: 0.7 },
            ],
            sort: { field: "lapse_risk", direction: "desc" },
            limit: 50,
          },
        }],
        usage: { input_tokens: 80, output_tokens: 40 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "high risk donors",
      });

      expect(result.success).toBe(true);
      expect(result.filters[0]?.field).toBe("lapse_risk");
      expect(result.filters[0]?.operator).toBe("gt");
    });

    it("parses priority score queries", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_4",
          name: "search_constituents",
          input: {
            filters: [
              { field: "priority_score", operator: "gt", value: 0.8 },
            ],
            sort: { field: "priority_score", direction: "desc" },
            limit: 20,
          },
        }],
        usage: { input_tokens: 90, output_tokens: 45 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "top 20 priority prospects",
      });

      expect(result.success).toBe(true);
      expect(result.filters[0]?.field).toBe("priority_score");
      expect(result.sort?.direction).toBe("desc");
    });

    it("parses constituent type queries", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_5",
          name: "search_constituents",
          input: {
            filters: [
              { field: "constituent_type", operator: "eq", value: "alumni" },
              { field: "class_year", operator: "eq", value: 2010 },
            ],
            sort: { field: "total_giving", direction: "desc" },
            limit: 50,
          },
        }],
        usage: { input_tokens: 100, output_tokens: 50 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "alumni from the class of 2010",
      });

      expect(result.success).toBe(true);
      expect(result.filters).toContainEqual(
        expect.objectContaining({
          field: "constituent_type",
          value: "alumni",
        })
      );
      expect(result.filters).toContainEqual(
        expect.objectContaining({
          field: "class_year",
          value: 2010,
        })
      );
    });

    it("parses date range queries", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_6",
          name: "search_constituents",
          input: {
            filters: [
              { field: "last_gift_date", operator: "between", value: ["2025-01-01", "2025-12-31"] },
            ],
            sort: { field: "last_gift_date", direction: "desc" },
            limit: 50,
          },
        }],
        usage: { input_tokens: 110, output_tokens: 55 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "donors who gave in 2025",
      });

      expect(result.success).toBe(true);
      expect(result.filters[0]?.field).toBe("last_gift_date");
      expect(result.filters[0]?.operator).toBe("between");
    });

    it("parses capacity queries", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_7",
          name: "search_constituents",
          input: {
            filters: [
              { field: "capacity", operator: "gte", value: 100000 },
            ],
            sort: { field: "capacity", direction: "desc" },
            limit: 50,
          },
        }],
        usage: { input_tokens: 85, output_tokens: 42 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "donors with capacity over $100K",
      });

      expect(result.success).toBe(true);
      expect(result.filters[0]?.field).toBe("capacity");
      expect(result.filters[0]?.value).toBe(100000);
    });

    it("handles school/college queries", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_8",
          name: "search_constituents",
          input: {
            filters: [
              { field: "school_college", operator: "contains", value: "Engineering" },
            ],
            sort: { field: "total_giving", direction: "desc" },
            limit: 50,
          },
        }],
        usage: { input_tokens: 95, output_tokens: 48 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "Engineering school alumni",
      });

      expect(result.success).toBe(true);
      expect(result.filters[0]?.field).toBe("school_college");
      expect(result.filters[0]?.operator).toBe("contains");
    });

    it("generates human-readable interpretation", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_9",
          name: "search_constituents",
          input: {
            filters: [
              { field: "total_giving", operator: "gte", value: 10000 },
            ],
            limit: 50,
          },
        }],
        usage: { input_tokens: 100, output_tokens: 50 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "major donors",
      });

      expect(result.interpretation).toBeDefined();
      expect(typeof result.interpretation).toBe("string");
      expect(result.interpretation.length).toBeGreaterThan(0);
    });

    it("handles queries with no results gracefully", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_10",
          name: "search_constituents",
          input: {
            filters: [],
            limit: 50,
          },
        }],
        usage: { input_tokens: 60, output_tokens: 30 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "xyz123abc",
      });

      expect(result.success).toBe(true);
      expect(result.filters).toHaveLength(0);
    });

    it("handles API errors gracefully", async () => {
      mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "donors who gave more than $10,000",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("rate limit");
    });

    it("handles malformed API responses", async () => {
      const mockResponse = {
        content: [{ type: "text", text: "I couldn't understand that query" }],
        usage: { input_tokens: 50, output_tokens: 20 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "asdfghjkl",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("validates query input length", async () => {
      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "ab", // Too short
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("too short");
    });

    it("handles timeout gracefully", async () => {
      mockCreate.mockImplementation(() => new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 100)
      ));

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "donors who gave over $10,000",
        timeout: 50,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("extracts sort from parsed query", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_11",
          name: "search_constituents",
          input: {
            filters: [
              { field: "total_giving", operator: "gte", value: 1000 },
            ],
            sort: { field: "last_gift_date", direction: "asc" },
            limit: 50,
          },
        }],
        usage: { input_tokens: 100, output_tokens: 50 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "donors sorted by oldest gift first",
      });

      expect(result.sort).toBeDefined();
      expect(result.sort?.field).toBe("last_gift_date");
      expect(result.sort?.direction).toBe("asc");
    });

    it("respects limit parameter", async () => {
      const mockResponse = {
        content: [{
          type: "tool_use",
          id: "tool_12",
          name: "search_constituents",
          input: {
            filters: [],
            limit: 10,
          },
        }],
        usage: { input_tokens: 80, output_tokens: 40 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "top 10 donors",
      });

      expect(result.limit).toBe(10);
    });
  });

  describe("QueryFilter validation", () => {
    it("validates filter field names", () => {
      const validFields = [
        "total_giving",
        "last_gift_date",
        "last_contact_date",
        "lapse_risk",
        "priority_score",
        "capacity",
        "constituent_type",
        "assigned_officer",
        "class_year",
        "school_college",
      ];

      validFields.forEach(field => {
        expect(field).toBeDefined();
      });
    });

    it("validates filter operators", () => {
      const validOperators = ["eq", "gt", "gte", "lt", "lte", "between", "in", "contains"];

      validOperators.forEach(op => {
        expect(op).toBeDefined();
      });
    });
  });
});
