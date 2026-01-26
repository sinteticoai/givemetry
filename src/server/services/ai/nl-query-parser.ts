// T179: NL query parsing service with Claude function calling
import Anthropic from "@anthropic-ai/sdk";
import { QUERY_FUNCTION_SCHEMA, QUERY_SYSTEM_PROMPT } from "@/lib/ai/prompts/query-function";

export interface QueryFilter {
  field: string;
  operator: string;
  value: unknown;
  humanReadable: string;
}

export interface ParsedQuery {
  success: boolean;
  filters: QueryFilter[];
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
  limit: number;
  interpretation: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ParseQueryOptions {
  apiKey: string;
  query: string;
  timeout?: number;
}

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

// Map field names to human-readable descriptions
const FIELD_DESCRIPTIONS: Record<string, string> = {
  total_giving: "total lifetime giving",
  last_gift_date: "last gift date",
  last_contact_date: "last contact date",
  lapse_risk: "lapse risk score",
  priority_score: "priority score",
  capacity: "estimated giving capacity",
  constituent_type: "constituent type",
  assigned_officer: "assigned gift officer",
  class_year: "graduation year",
  school_college: "school or college",
};

// Map operators to human-readable descriptions
const OPERATOR_DESCRIPTIONS: Record<string, string> = {
  eq: "equals",
  gt: "greater than",
  gte: "greater than or equal to",
  lt: "less than",
  lte: "less than or equal to",
  between: "between",
  in: "is one of",
  contains: "contains",
};

function formatValue(value: unknown, field: string): string {
  if (value === null || value === undefined) return "none";

  // Format currency for giving/capacity fields
  if (field === "total_giving" || field === "capacity") {
    const num = Number(value);
    if (!isNaN(num)) {
      return `$${num.toLocaleString()}`;
    }
  }

  // Format percentages for score fields
  if (field === "lapse_risk" || field === "priority_score") {
    const num = Number(value);
    if (!isNaN(num)) {
      return `${(num * 100).toFixed(0)}%`;
    }
  }

  // Format dates
  if (typeof value === "string" && value.includes("_ago")) {
    return value.replace(/_/g, " ");
  }

  // Format arrays for between operator
  if (Array.isArray(value)) {
    return value.map(v => formatValue(v, field)).join(" and ");
  }

  return String(value);
}

function generateHumanReadable(filter: { field: string; operator: string; value: unknown }): string {
  const fieldDesc = FIELD_DESCRIPTIONS[filter.field] || filter.field;
  const opDesc = OPERATOR_DESCRIPTIONS[filter.operator] || filter.operator;
  const valueStr = formatValue(filter.value, filter.field);

  return `${fieldDesc} ${opDesc} ${valueStr}`;
}

function generateInterpretation(filters: QueryFilter[], sort?: { field: string; direction: string }, limit?: number): string {
  if (filters.length === 0) {
    return "Showing all constituents";
  }

  const filterParts = filters.map(f => f.humanReadable);
  let interpretation = `Showing constituents where ${filterParts.join(" AND ")}`;

  if (sort) {
    const sortField = FIELD_DESCRIPTIONS[sort.field] || sort.field;
    const sortDir = sort.direction === "desc" ? "highest first" : "lowest first";
    interpretation += `, sorted by ${sortField} (${sortDir})`;
  }

  if (limit && limit < 50) {
    interpretation += `, limited to ${limit} results`;
  }

  return interpretation;
}

export async function parseNaturalLanguageQuery(
  options: ParseQueryOptions
): Promise<ParsedQuery> {
  const { apiKey, query, timeout } = options;

  // Validate minimum query length
  if (query.length < 3) {
    return {
      success: false,
      filters: [],
      limit: 50,
      interpretation: "",
      error: "Query too short - please provide at least 3 characters",
    };
  }

  try {
    const client = new Anthropic({ apiKey });

    // Create the tool definition for function calling
    const tools: Anthropic.Tool[] = [
      {
        name: QUERY_FUNCTION_SCHEMA.name,
        description: QUERY_FUNCTION_SCHEMA.description,
        input_schema: QUERY_FUNCTION_SCHEMA.parameters as Anthropic.Tool.InputSchema,
      },
    ];

    // Make the API call with timeout
    const response = await Promise.race([
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: QUERY_SYSTEM_PROMPT,
        tools,
        tool_choice: { type: "tool", name: "search_constituents" },
        messages: [
          {
            role: "user",
            content: `Parse this natural language query into structured search parameters: "${query}"`,
          },
        ],
      }),
      timeout
        ? new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), timeout)
          )
        : Promise.resolve(null as never),
    ]);

    if (!response) {
      throw new Error("No response from API");
    }

    // Extract the tool use result
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (!toolUse) {
      return {
        success: false,
        filters: [],
        limit: 50,
        interpretation: "",
        error: "Could not parse query - please try rephrasing",
        usage: {
          inputTokens: response.usage?.input_tokens || 0,
          outputTokens: response.usage?.output_tokens || 0,
        },
      };
    }

    const input = toolUse.input as {
      filters?: Array<{ field: string; operator: string; value: unknown }>;
      sort?: { field: string; direction: "asc" | "desc" };
      limit?: number;
    };

    // Transform filters with human-readable descriptions
    const filters: QueryFilter[] = (input.filters || []).map((f) => ({
      field: f.field,
      operator: f.operator,
      value: f.value,
      humanReadable: generateHumanReadable(f),
    }));

    const sort = input.sort;
    const limit = input.limit || 50;
    const interpretation = generateInterpretation(filters, sort, limit);

    return {
      success: true,
      filters,
      sort,
      limit,
      interpretation,
      usage: {
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      success: false,
      filters: [],
      limit: 50,
      interpretation: "",
      error: errorMessage,
    };
  }
}

