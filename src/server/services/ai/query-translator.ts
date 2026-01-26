// T181: Query to Prisma filter translation
import type { Prisma } from "@prisma/client";

export interface QueryFilter {
  field: string;
  operator: string;
  value: unknown;
  humanReadable?: string;
}

export interface PrismaWhereClause {
  organizationId: string;
  isActive: boolean;
  lapseRiskScore?: Prisma.DecimalFilter<"Constituent"> | number;
  priorityScore?: Prisma.DecimalFilter<"Constituent"> | number;
  estimatedCapacity?: Prisma.DecimalFilter<"Constituent"> | number;
  constituentType?: string | Prisma.StringFilter<"Constituent">;
  assignedOfficerId?: string;
  classYear?: number | Prisma.IntFilter<"Constituent">;
  schoolCollege?: Prisma.StringFilter<"Constituent">;
  _rawAggregation?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  [key: string]: unknown;
}

// Field name mapping from NL query fields to Prisma schema fields
const FIELD_MAPPING: Record<string, string> = {
  total_giving: "_aggregate_total_giving", // Requires aggregation
  last_gift_date: "_aggregate_last_gift_date", // Requires aggregation
  last_contact_date: "_aggregate_last_contact_date", // Requires aggregation
  lapse_risk: "lapseRiskScore",
  priority_score: "priorityScore",
  capacity: "estimatedCapacity",
  constituent_type: "constituentType",
  assigned_officer: "assignedOfficerId",
  class_year: "classYear",
  school_college: "schoolCollege",
};

// Fields that require raw SQL aggregation (gift/contact sums)
const AGGREGATION_FIELDS = new Set([
  "total_giving",
  "last_gift_date",
  "last_contact_date",
]);

/**
 * Translate relative date strings to actual dates
 */
export function translateRelativeDate(value: string, referenceDate?: Date): Date {
  const now = referenceDate || new Date();

  // Handle already formatted ISO dates
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value);
  }

  // Handle relative date formats like "6_months_ago", "1_year_ago", "30_days_ago"
  const monthMatch = value.match(/^(\d+)_months?_ago$/);
  if (monthMatch && monthMatch[1]) {
    const months = parseInt(monthMatch[1], 10);
    const result = new Date(now);
    result.setMonth(result.getMonth() - months);
    return result;
  }

  const yearMatch = value.match(/^(\d+)_years?_ago$/);
  if (yearMatch && yearMatch[1]) {
    const years = parseInt(yearMatch[1], 10);
    const result = new Date(now);
    result.setFullYear(result.getFullYear() - years);
    return result;
  }

  const dayMatch = value.match(/^(\d+)_days?_ago$/);
  if (dayMatch && dayMatch[1]) {
    const days = parseInt(dayMatch[1], 10);
    const result = new Date(now);
    result.setDate(result.getDate() - days);
    return result;
  }

  // Handle fiscal year references (assuming July 1 - June 30)
  if (value === "last_fiscal_year") {
    const fiscalYearStart = new Date(now);
    // If we're before July, last fiscal year started 2 years ago
    // If we're July or after, last fiscal year started 1 year ago
    if (fiscalYearStart.getMonth() < 6) {
      fiscalYearStart.setFullYear(fiscalYearStart.getFullYear() - 2);
    } else {
      fiscalYearStart.setFullYear(fiscalYearStart.getFullYear() - 1);
    }
    fiscalYearStart.setMonth(6); // July
    fiscalYearStart.setDate(1);
    return fiscalYearStart;
  }

  if (value === "this_fiscal_year") {
    const fiscalYearStart = new Date(now);
    if (fiscalYearStart.getMonth() < 6) {
      fiscalYearStart.setFullYear(fiscalYearStart.getFullYear() - 1);
    }
    fiscalYearStart.setMonth(6); // July
    fiscalYearStart.setDate(1);
    return fiscalYearStart;
  }

  throw new Error(`Invalid relative date format: ${value}`);
}

/**
 * Translate a single filter operator to Prisma filter format
 */
function translateOperator(operator: string, value: unknown, field: string): unknown {
  // Convert numeric strings for numeric fields
  const numericFields = ["lapse_risk", "priority_score", "capacity", "class_year"];
  let processedValue = value;

  if (numericFields.includes(field) && typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      processedValue = parsed;
    }
  }

  switch (operator) {
    case "eq":
      return processedValue;

    case "gt":
      return { gt: processedValue };

    case "gte":
      return { gte: processedValue };

    case "lt":
      return { lt: processedValue };

    case "lte":
      return { lte: processedValue };

    case "between":
      if (Array.isArray(processedValue) && processedValue.length === 2) {
        return {
          gte: processedValue[0],
          lte: processedValue[1],
        };
      }
      return processedValue;

    case "in":
      if (Array.isArray(processedValue)) {
        return { in: processedValue };
      }
      return { in: [processedValue] };

    case "contains":
      return {
        contains: String(processedValue),
        mode: "insensitive" as const,
      };

    default:
      return processedValue;
  }
}

/**
 * Translate NL query filters to Prisma where clause
 */
export function translateQueryToPrisma(
  filters: QueryFilter[],
  organizationId: string
): PrismaWhereClause {
  const where: PrismaWhereClause = {
    organizationId,
    isActive: true,
  };

  // Collect aggregation filters separately
  const aggregationFilters: Array<{
    field: string;
    operator: string;
    value: unknown;
  }> = [];

  for (const filter of filters) {
    const { field, operator, value } = filter;

    // Skip invalid or null values
    if (value === null || value === undefined) {
      continue;
    }

    // Check if this is an aggregation field
    if (AGGREGATION_FIELDS.has(field)) {
      aggregationFilters.push({ field, operator, value });
      continue;
    }

    // Map field name to Prisma schema field
    const prismaField = FIELD_MAPPING[field];
    if (!prismaField || prismaField.startsWith("_aggregate")) {
      // Skip unknown fields or aggregate fields
      continue;
    }

    // Translate the operator and value
    const translatedValue = translateOperator(operator, value, field);

    // Set the filter on the where clause
    (where as Record<string, unknown>)[prismaField] = translatedValue;
  }

  // Add aggregation filters as a hint for raw query building
  if (aggregationFilters.length > 0) {
    where._rawAggregation = aggregationFilters;
  }

  return where;
}

/**
 * Build a raw SQL query for aggregation-based filters
 * This is used when we need to filter by total_giving, last_gift_date, etc.
 */
export function buildAggregationQuery(
  filters: Array<{ field: string; operator: string; value: unknown }>,
  organizationId: string,
  limit: number = 50,
  sort?: { field: string; direction: string }
): { sql: string; params: unknown[] } {
  const params: unknown[] = [organizationId];
  let paramIndex = 2;

  // Base query with constituent data
  let sql = `
    SELECT
      c.id,
      c."firstName",
      c."lastName",
      c.email,
      c."lapseRiskScore",
      c."priorityScore",
      c."estimatedCapacity",
      c."constituentType",
      c."classYear",
      c."schoolCollege",
      COALESCE(g.total_giving, 0) as total_giving,
      g.last_gift_date,
      ct.last_contact_date
    FROM "Constituent" c
    LEFT JOIN (
      SELECT
        "constituentId",
        SUM(amount) as total_giving,
        MAX("giftDate") as last_gift_date
      FROM "Gift"
      WHERE "organizationId" = $1
      GROUP BY "constituentId"
    ) g ON c.id = g."constituentId"
    LEFT JOIN (
      SELECT
        "constituentId",
        MAX("contactDate") as last_contact_date
      FROM "Contact"
      WHERE "organizationId" = $1
      GROUP BY "constituentId"
    ) ct ON c.id = ct."constituentId"
    WHERE c."organizationId" = $1 AND c."isActive" = true
  `;

  // Add aggregation filters
  for (const filter of filters) {
    const { field, operator, value } = filter;
    let columnName: string;
    let processedValue = value;

    switch (field) {
      case "total_giving":
        columnName = "COALESCE(g.total_giving, 0)";
        break;
      case "last_gift_date":
        columnName = "g.last_gift_date";
        // Translate relative dates
        if (typeof value === "string" && value.includes("_ago")) {
          processedValue = translateRelativeDate(value);
        }
        break;
      case "last_contact_date":
        columnName = "ct.last_contact_date";
        if (typeof value === "string" && value.includes("_ago")) {
          processedValue = translateRelativeDate(value);
        }
        break;
      default:
        continue;
    }

    // Add the filter condition
    switch (operator) {
      case "gte":
        sql += ` AND ${columnName} >= $${paramIndex}`;
        params.push(processedValue);
        paramIndex++;
        break;
      case "gt":
        sql += ` AND ${columnName} > $${paramIndex}`;
        params.push(processedValue);
        paramIndex++;
        break;
      case "lte":
        sql += ` AND ${columnName} <= $${paramIndex}`;
        params.push(processedValue);
        paramIndex++;
        break;
      case "lt":
        sql += ` AND ${columnName} < $${paramIndex}`;
        params.push(processedValue);
        paramIndex++;
        break;
      case "between":
        if (Array.isArray(processedValue) && processedValue.length === 2) {
          sql += ` AND ${columnName} BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
          params.push(processedValue[0], processedValue[1]);
          paramIndex += 2;
        }
        break;
    }
  }

  // Add sorting
  if (sort) {
    let sortColumn: string;
    switch (sort.field) {
      case "total_giving":
        sortColumn = "total_giving";
        break;
      case "last_gift_date":
        sortColumn = "last_gift_date";
        break;
      case "last_contact_date":
        sortColumn = "last_contact_date";
        break;
      case "lapse_risk":
        sortColumn = '"lapseRiskScore"';
        break;
      case "priority_score":
        sortColumn = '"priorityScore"';
        break;
      default:
        sortColumn = "total_giving";
    }
    sql += ` ORDER BY ${sortColumn} ${sort.direction === "asc" ? "ASC" : "DESC"} NULLS LAST`;
  } else {
    sql += ` ORDER BY total_giving DESC NULLS LAST`;
  }

  // Add limit
  sql += ` LIMIT $${paramIndex}`;
  params.push(limit);

  return { sql, params };
}

