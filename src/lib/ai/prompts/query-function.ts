// Query function schema for NL parsing (Phase 9, US6)
// Placeholder for Phase 9 implementation

export const QUERY_FUNCTION_SCHEMA = {
  name: "search_constituents",
  description: "Search constituent database based on natural language criteria",
  parameters: {
    type: "object",
    properties: {
      filters: {
        type: "array",
        description: "Search filters to apply",
        items: {
          type: "object",
          properties: {
            field: {
              type: "string",
              enum: [
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
              ],
              description: "Field to filter on",
            },
            operator: {
              type: "string",
              enum: ["eq", "gt", "gte", "lt", "lte", "between", "in", "contains"],
              description: "Comparison operator",
            },
            value: {
              description: "Value to compare against",
            },
          },
          required: ["field", "operator", "value"],
        },
      },
      sort: {
        type: "object",
        properties: {
          field: { type: "string" },
          direction: { type: "string", enum: ["asc", "desc"] },
        },
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
        default: 50,
      },
    },
    required: ["filters"],
  },
};

export const QUERY_SYSTEM_PROMPT = `You are a natural language query parser for a donor database.
Convert user queries into structured search parameters.

Available fields:
- total_giving: Lifetime giving amount (number)
- last_gift_date: Date of most recent gift
- last_contact_date: Date of most recent contact
- lapse_risk: Risk score 0-1 (higher = more likely to lapse)
- priority_score: Priority score 0-1 (higher = higher priority)
- capacity: Estimated giving capacity (number)
- constituent_type: Type (alumni, parent, friend, etc.)
- assigned_officer: Gift officer ID
- class_year: Graduation year
- school_college: School or college name

Examples:
- "donors who gave over $10K last year" → filter on total_giving > 10000 with date constraint
- "high risk donors" → filter on lapse_risk > 0.7
- "top priority prospects" → filter on priority_score > 0.7, sort by priority_score desc
- "alumni from 2010" → filter on class_year = 2010, constituent_type = "alumni"`;
