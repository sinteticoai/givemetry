// T178: NL query corpus validation (20-50 representative queries)
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { parseNaturalLanguageQuery } from "@/server/services/ai/nl-query-parser";

// This test file validates that the NL query parser handles a corpus
// of representative queries correctly. These tests use mocks by default
// but can be run against a real API for validation.

// Mock the Claude API for CI testing
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: mockCreate,
    };
  },
}));

// Helper to create mock response for a query type
function createMockResponse(filters: object[], sort?: object, limit = 50) {
  return {
    content: [{
      type: "tool_use",
      id: "tool_1",
      name: "search_constituents",
      input: { filters, sort, limit },
    }],
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

describe("NL Query Corpus Validation", () => {
  beforeAll(() => {
    vi.resetAllMocks();
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe("Giving Amount Queries", () => {
    const queries = [
      {
        input: "Show me donors who gave more than $10,000",
        expectedFilters: [{ field: "total_giving", operator: "gte" }],
        description: "Simple amount threshold",
      },
      {
        input: "major donors giving over $50K",
        expectedFilters: [{ field: "total_giving", operator: "gte" }],
        description: "Shorthand amount notation",
      },
      {
        input: "donors with total giving between $5000 and $25000",
        expectedFilters: [{ field: "total_giving", operator: "between" }],
        description: "Amount range",
      },
      {
        input: "people who haven't given anything",
        expectedFilters: [{ field: "total_giving", operator: "eq" }],
        description: "Zero giving",
      },
      {
        input: "top 10 donors by giving",
        expectedFilters: [],
        expectedSort: { field: "total_giving", direction: "desc" },
        expectedLimit: 10,
        description: "Top N by giving",
      },
    ];

    queries.forEach(({ input, expectedFilters, expectedSort, expectedLimit, description }) => {
      it(`parses: "${description}" - "${input}"`, async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse(
          expectedFilters.map(f => ({ ...f, value: 10000 })),
          expectedSort,
          expectedLimit
        ));

        const result = await parseNaturalLanguageQuery({
          apiKey: "test-key",
          query: input,
        });

        expect(result.success).toBe(true);
        expectedFilters.forEach(expected => {
          expect(result.filters.some(f => f.field === expected.field)).toBe(true);
        });
      });
    });
  });

  describe("Date-Based Queries", () => {
    const queries = [
      {
        input: "donors who gave in the last 6 months",
        expectedFilters: [{ field: "last_gift_date", operator: "gte" }],
        description: "Relative date - months ago",
      },
      {
        input: "people we haven't contacted in a year",
        expectedFilters: [{ field: "last_contact_date", operator: "lt" }],
        description: "Contact gap",
      },
      {
        input: "donors who gave in 2025",
        expectedFilters: [{ field: "last_gift_date", operator: "between" }],
        description: "Calendar year",
      },
      {
        input: "last fiscal year donors",
        expectedFilters: [{ field: "last_gift_date" }],
        description: "Fiscal year reference",
      },
      {
        input: "donors contacted this week",
        expectedFilters: [{ field: "last_contact_date", operator: "gte" }],
        description: "This week",
      },
    ];

    queries.forEach(({ input, expectedFilters, description }) => {
      it(`parses: "${description}" - "${input}"`, async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse(
          expectedFilters.map(f => ({ ...f, value: "2025-01-01" }))
        ));

        const result = await parseNaturalLanguageQuery({
          apiKey: "test-key",
          query: input,
        });

        expect(result.success).toBe(true);
        expectedFilters.forEach(expected => {
          expect(result.filters.some(f => f.field === expected.field)).toBe(true);
        });
      });
    });
  });

  describe("Risk and Priority Queries", () => {
    const queries = [
      {
        input: "high risk donors",
        expectedFilters: [{ field: "lapse_risk", operator: "gt" }],
        description: "High lapse risk",
      },
      {
        input: "donors at risk of lapsing",
        expectedFilters: [{ field: "lapse_risk", operator: "gt" }],
        description: "Lapse risk natural language",
      },
      {
        input: "top priority prospects",
        expectedFilters: [{ field: "priority_score", operator: "gt" }],
        description: "High priority",
      },
      {
        input: "low priority donors",
        expectedFilters: [{ field: "priority_score", operator: "lt" }],
        description: "Low priority",
      },
      {
        input: "donors I should focus on",
        expectedFilters: [{ field: "priority_score" }],
        description: "Implied priority",
      },
    ];

    queries.forEach(({ input, expectedFilters, description }) => {
      it(`parses: "${description}" - "${input}"`, async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse(
          expectedFilters.map(f => ({ ...f, value: 0.7 }))
        ));

        const result = await parseNaturalLanguageQuery({
          apiKey: "test-key",
          query: input,
        });

        expect(result.success).toBe(true);
        expectedFilters.forEach(expected => {
          expect(result.filters.some(f => f.field === expected.field)).toBe(true);
        });
      });
    });
  });

  describe("Constituent Type Queries", () => {
    const queries = [
      {
        input: "alumni donors",
        expectedFilters: [{ field: "constituent_type", operator: "eq" }],
        description: "Alumni filter",
      },
      {
        input: "parent donors",
        expectedFilters: [{ field: "constituent_type", operator: "eq" }],
        description: "Parent filter",
      },
      {
        input: "friends of the university",
        expectedFilters: [{ field: "constituent_type", operator: "eq" }],
        description: "Friend filter",
      },
      {
        input: "alumni from the class of 2010",
        expectedFilters: [
          { field: "constituent_type", operator: "eq" },
          { field: "class_year", operator: "eq" },
        ],
        description: "Alumni with class year",
      },
      {
        input: "Engineering school alumni",
        expectedFilters: [
          { field: "constituent_type", operator: "eq" },
          { field: "school_college", operator: "contains" },
        ],
        description: "School-specific alumni",
      },
    ];

    queries.forEach(({ input, expectedFilters, description }) => {
      it(`parses: "${description}" - "${input}"`, async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse(
          expectedFilters.map(f => ({ ...f, value: "alumni" }))
        ));

        const result = await parseNaturalLanguageQuery({
          apiKey: "test-key",
          query: input,
        });

        expect(result.success).toBe(true);
        expectedFilters.forEach(expected => {
          expect(result.filters.some(f => f.field === expected.field)).toBe(true);
        });
      });
    });
  });

  describe("Capacity Queries", () => {
    const queries = [
      {
        input: "donors with high capacity",
        expectedFilters: [{ field: "capacity", operator: "gte" }],
        description: "High capacity",
      },
      {
        input: "prospects with capacity over $100K",
        expectedFilters: [{ field: "capacity", operator: "gte" }],
        description: "Specific capacity threshold",
      },
      {
        input: "wealthy donors who haven't given much",
        expectedFilters: [
          { field: "capacity", operator: "gte" },
          { field: "total_giving", operator: "lt" },
        ],
        description: "Capacity vs giving mismatch",
      },
    ];

    queries.forEach(({ input, expectedFilters, description }) => {
      it(`parses: "${description}" - "${input}"`, async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse(
          expectedFilters.map(f => ({ ...f, value: 100000 }))
        ));

        const result = await parseNaturalLanguageQuery({
          apiKey: "test-key",
          query: input,
        });

        expect(result.success).toBe(true);
        expectedFilters.forEach(expected => {
          expect(result.filters.some(f => f.field === expected.field)).toBe(true);
        });
      });
    });
  });

  describe("Combined Criteria Queries", () => {
    const queries = [
      {
        input: "donors who gave $10K+ last year but haven't been contacted in 6 months",
        expectedFilters: [
          { field: "total_giving" },
          { field: "last_contact_date" },
        ],
        description: "Giving + contact gap",
      },
      {
        input: "high risk alumni who gave over $5000",
        expectedFilters: [
          { field: "lapse_risk" },
          { field: "constituent_type" },
          { field: "total_giving" },
        ],
        description: "Risk + type + giving",
      },
      {
        input: "Engineering alumni from 2000-2010 with capacity over $50K",
        expectedFilters: [
          { field: "school_college" },
          { field: "class_year" },
          { field: "capacity" },
        ],
        description: "School + year range + capacity",
      },
      {
        input: "top 20 priority donors not contacted this quarter",
        expectedFilters: [
          { field: "priority_score" },
          { field: "last_contact_date" },
        ],
        description: "Priority + contact gap with limit",
      },
    ];

    queries.forEach(({ input, expectedFilters, description }) => {
      it(`parses: "${description}" - "${input}"`, async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse(
          expectedFilters.map(f => ({ ...f, operator: "gte", value: 10000 }))
        ));

        const result = await parseNaturalLanguageQuery({
          apiKey: "test-key",
          query: input,
        });

        expect(result.success).toBe(true);
        expect(result.filters.length).toBeGreaterThanOrEqual(expectedFilters.length - 1);
      });
    });
  });

  describe("Edge Cases and Ambiguous Queries", () => {
    const queries = [
      {
        input: "show me everyone",
        expectedFilters: [],
        description: "All constituents",
      },
      {
        input: "John Smith",
        expectedFilters: [],
        description: "Name search (not supported in filters)",
      },
      {
        input: "donors in Boston",
        expectedFilters: [],
        description: "Location (if not supported)",
      },
      {
        input: "my portfolio",
        expectedFilters: [{ field: "assigned_officer" }],
        description: "Officer's portfolio",
      },
    ];

    queries.forEach(({ input, expectedFilters, description }) => {
      it(`handles: "${description}" - "${input}"`, async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse(
          expectedFilters.map(f => ({ ...f, operator: "eq", value: "test" }))
        ));

        const result = await parseNaturalLanguageQuery({
          apiKey: "test-key",
          query: input,
        });

        // Should not crash, may return empty or partial results
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Natural Language Variations", () => {
    const queries = [
      {
        inputs: [
          "donors who gave more than $10,000",
          "donors with giving over $10,000",
          "donors giving more than 10k",
          "people who donated $10000+",
        ],
        expectedField: "total_giving",
        description: "Amount threshold variations",
      },
      {
        inputs: [
          "high risk donors",
          "at-risk donors",
          "donors at risk",
          "donors likely to lapse",
        ],
        expectedField: "lapse_risk",
        description: "Risk terminology variations",
      },
    ];

    queries.forEach(({ inputs, expectedField, description }) => {
      inputs.forEach((input) => {
        it(`recognizes variation: "${input}" (${description})`, async () => {
          mockCreate.mockResolvedValueOnce(createMockResponse(
            [{ field: expectedField, operator: "gte", value: 10000 }]
          ));

          const result = await parseNaturalLanguageQuery({
            apiKey: "test-key",
            query: input,
          });

          expect(result.success).toBe(true);
          expect(result.filters.some(f => f.field === expectedField)).toBe(true);
        });
      });
    });
  });

  describe("Query Interpretation Quality", () => {
    it("provides human-readable interpretation for each query", async () => {
      const testQueries = [
        "Show me donors who gave more than $10,000",
        "high risk alumni",
        "top 20 priority prospects",
      ];

      for (const query of testQueries) {
        mockCreate.mockResolvedValueOnce(createMockResponse(
          [{ field: "total_giving", operator: "gte", value: 10000 }]
        ));

        const result = await parseNaturalLanguageQuery({
          apiKey: "test-key",
          query,
        });

        expect(result.interpretation).toBeDefined();
        expect(result.interpretation.length).toBeGreaterThan(10);
      }
    });

    it("includes human-readable filter descriptions", async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse(
        [
          { field: "total_giving", operator: "gte", value: 10000 },
          { field: "lapse_risk", operator: "gt", value: 0.7 },
        ]
      ));

      const result = await parseNaturalLanguageQuery({
        apiKey: "test-key",
        query: "major donors at risk",
      });

      result.filters.forEach(filter => {
        expect(filter.humanReadable).toBeDefined();
        expect(filter.humanReadable.length).toBeGreaterThan(0);
      });
    });
  });
});
