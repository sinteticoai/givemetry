// T180: Query function schema for NL parsing (Phase 9, US6)

export const QUERY_FUNCTION_SCHEMA = {
  name: "search_constituents",
  description: "Search constituent database based on natural language criteria. Parse the user's query and convert it to structured filters.",
  parameters: {
    type: "object" as const,
    properties: {
      filters: {
        type: "array" as const,
        description: "Search filters to apply. Each filter specifies a field, operator, and value.",
        items: {
          type: "object" as const,
          properties: {
            field: {
              type: "string" as const,
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
              type: "string" as const,
              enum: ["eq", "gt", "gte", "lt", "lte", "between", "in", "contains"],
              description: "Comparison operator: eq (equals), gt (greater than), gte (>=), lt (<), lte (<=), between (range), in (list), contains (substring)",
            },
            value: {
              description: "Value to compare against. For dates, use relative formats like '6_months_ago', '1_year_ago', '30_days_ago', or ISO dates 'YYYY-MM-DD'. For between, use array [min, max].",
            },
          },
          required: ["field", "operator", "value"],
        },
      },
      sort: {
        type: "object" as const,
        description: "Optional sorting specification",
        properties: {
          field: {
            type: "string" as const,
            enum: [
              "total_giving",
              "last_gift_date",
              "last_contact_date",
              "lapse_risk",
              "priority_score",
              "capacity",
              "class_year",
            ],
          },
          direction: { type: "string" as const, enum: ["asc", "desc"] },
        },
        required: ["field", "direction"],
      },
      limit: {
        type: "number" as const,
        description: "Maximum number of results to return",
        default: 50,
      },
    },
    required: ["filters"],
  },
};

export const QUERY_SYSTEM_PROMPT = `You are an expert natural language query parser for a university advancement donor database.
Your job is to convert natural language queries into structured search parameters using the search_constituents function.

AVAILABLE FIELDS:
- total_giving: Lifetime giving amount in dollars (numeric)
- last_gift_date: Date of most recent gift (date)
- last_contact_date: Date of most recent contact/interaction (date)
- lapse_risk: Risk of lapsing score 0-1 (higher = more likely to lapse, >0.7 is "high risk")
- priority_score: Priority for outreach 0-1 (higher = higher priority, >0.8 is "top priority")
- capacity: Estimated giving capacity in dollars (numeric)
- constituent_type: Type of constituent ("alumni", "parent", "friend", "faculty", "staff", "student")
- assigned_officer: Gift officer user ID (string)
- class_year: Graduation year (numeric, e.g., 2010)
- school_college: School or college name (string, use "contains" for partial matches)

DATE FORMATS:
- Use relative dates: "6_months_ago", "1_year_ago", "3_months_ago", "30_days_ago"
- For specific dates: use ISO format "YYYY-MM-DD"
- For year ranges in giving: use "last_gift_date" with between ["YYYY-01-01", "YYYY-12-31"]

AMOUNT PARSING:
- "$10K" or "10k" = 10000
- "$1M" or "1m" = 1000000
- "$50,000" = 50000

COMMON QUERY PATTERNS:

1. Giving amounts:
   - "donors who gave over $10K" → total_giving gte 10000
   - "major donors" → total_giving gte 10000
   - "donors between $5K and $50K" → total_giving between [5000, 50000]

2. Lapse risk:
   - "high risk donors" → lapse_risk gt 0.7
   - "at-risk donors" → lapse_risk gt 0.5
   - "donors likely to lapse" → lapse_risk gt 0.6

3. Priority:
   - "top priority prospects" → priority_score gt 0.8, sort by priority_score desc
   - "high priority donors" → priority_score gt 0.7
   - "top 20 prospects" → sort by priority_score desc, limit 20

4. Contact gaps:
   - "donors not contacted in 6 months" → last_contact_date lt 6_months_ago
   - "people we haven't contacted in a year" → last_contact_date lt 1_year_ago

5. Constituent types:
   - "alumni donors" → constituent_type eq "alumni"
   - "parent donors" → constituent_type eq "parent"
   - "class of 2010" → class_year eq 2010, constituent_type eq "alumni"

6. School/college:
   - "Engineering alumni" → school_college contains "Engineering", constituent_type eq "alumni"
   - "Business school donors" → school_college contains "Business"

7. Capacity:
   - "high capacity donors" → capacity gte 100000
   - "donors with capacity over $500K" → capacity gte 500000

8. Combined queries:
   - "high risk major donors" → lapse_risk gt 0.7, total_giving gte 10000
   - "alumni from 2010 who gave over $5K" → class_year eq 2010, constituent_type eq "alumni", total_giving gte 5000

ALWAYS:
- Use the most appropriate field for the query intent
- Default to descending sort when asked for "top" or "highest"
- Use appropriate operators (gte vs gt based on context like "over" vs "more than")
- Include all relevant filters from the query
- Return empty filters array if the query doesn't match any searchable criteria`;
