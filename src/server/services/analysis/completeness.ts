// T103: Completeness scoring service
// Calculates data completeness scores for constituents

export interface Constituent {
  externalId: string;
  firstName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  constituentType: string | null;
  classYear?: number | null;
  schoolCollege?: string | null;
  estimatedCapacity?: number | null;
  prefix?: string | null;
  suffix?: string | null;
  middleName?: string | null;
  addressLine2?: string | null;
  country?: string | null;
}

export interface CompletenessResult {
  score: number;
  requiredScore: number;
  optionalScore: number;
  fieldCompleteness: Record<string, boolean>;
  issues: CompletenessIssue[];
}

export interface CompletenessIssue {
  field: string;
  type: "missing_required" | "missing_contact" | "incomplete_address" | "missing_optional";
  severity: "high" | "medium" | "low";
  message: string;
}

// Field definitions
const REQUIRED_FIELDS = ["externalId", "lastName"] as const;

const OPTIONAL_FIELDS = [
  "firstName",
  "email",
  "phone",
  "addressLine1",
  "city",
  "state",
  "postalCode",
  "constituentType",
] as const;

const CONTACT_FIELDS = ["email", "phone"] as const;

const ADDRESS_FIELDS = ["addressLine1", "city", "state", "postalCode"] as const;

// Field weights for scoring
const FIELD_WEIGHTS: Record<string, number> = {
  externalId: 1.0,
  lastName: 1.0,
  firstName: 0.8,
  email: 0.9,
  phone: 0.6,
  addressLine1: 0.5,
  city: 0.4,
  state: 0.4,
  postalCode: 0.4,
  constituentType: 0.5,
};

/**
 * Check if a field value is considered "filled"
 */
function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

/**
 * Calculate completeness score for a single constituent
 * Returns a score between 0 and 1
 */
export function calculateCompletenessScore(constituent: Constituent): number {
  let totalWeight = 0;
  let filledWeight = 0;

  const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;

  for (const field of allFields) {
    const weight = FIELD_WEIGHTS[field] || 0.5;
    totalWeight += weight;

    const value = constituent[field as keyof Constituent];
    if (isFieldFilled(value)) {
      filledWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;
  return filledWeight / totalWeight;
}

/**
 * Get per-field completion status for a constituent
 */
export function getFieldCompleteness(constituent: Constituent): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;

  for (const field of allFields) {
    const value = constituent[field as keyof Constituent];
    result[field] = isFieldFilled(value);
  }

  return result;
}

/**
 * Calculate completeness for required fields only
 */
export function getRequiredFieldsCompleteness(constituent: Constituent): number {
  let filled = 0;

  for (const field of REQUIRED_FIELDS) {
    const value = constituent[field as keyof Constituent];
    if (isFieldFilled(value)) {
      filled++;
    }
  }

  return filled / REQUIRED_FIELDS.length;
}

/**
 * Calculate completeness for optional fields only
 */
export function getOptionalFieldsCompleteness(constituent: Constituent): number {
  let filled = 0;

  for (const field of OPTIONAL_FIELDS) {
    const value = constituent[field as keyof Constituent];
    if (isFieldFilled(value)) {
      filled++;
    }
  }

  return filled / OPTIONAL_FIELDS.length;
}

/**
 * Analyze completeness issues for a constituent
 */
export function analyzeCompletenessIssues(constituent: Constituent): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    const value = constituent[field as keyof Constituent];
    if (!isFieldFilled(value)) {
      issues.push({
        field,
        type: "missing_required",
        severity: "high",
        message: `Required field '${field}' is missing`,
      });
    }
  }

  // Check contact information
  const hasAnyContact = CONTACT_FIELDS.some((field) =>
    isFieldFilled(constituent[field as keyof Constituent])
  );

  if (!hasAnyContact) {
    issues.push({
      field: "contact",
      type: "missing_contact",
      severity: "medium",
      message: "No contact information (email or phone) available",
    });
  }

  // Check address completeness
  const filledAddressFields = ADDRESS_FIELDS.filter((field) =>
    isFieldFilled(constituent[field as keyof Constituent])
  );

  if (filledAddressFields.length > 0 && filledAddressFields.length < ADDRESS_FIELDS.length) {
    const missingFields = ADDRESS_FIELDS.filter(
      (field) => !isFieldFilled(constituent[field as keyof Constituent])
    );
    issues.push({
      field: "address",
      type: "incomplete_address",
      severity: "low",
      message: `Incomplete address - missing: ${missingFields.join(", ")}`,
    });
  }

  return issues;
}

/**
 * Calculate aggregate completeness statistics for multiple constituents
 */
export function calculateBatchCompleteness(constituents: Constituent[]): {
  averageScore: number;
  requiredScore: number;
  optionalScore: number;
  fieldStats: Record<string, { filled: number; total: number; percentage: number }>;
  issuesSummary: Record<string, number>;
} {
  if (constituents.length === 0) {
    return {
      averageScore: 0,
      requiredScore: 0,
      optionalScore: 0,
      fieldStats: {},
      issuesSummary: {},
    };
  }

  let totalScore = 0;
  let totalRequiredScore = 0;
  let totalOptionalScore = 0;
  const fieldStats: Record<string, { filled: number; total: number }> = {};
  const issuesSummary: Record<string, number> = {};

  const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;
  for (const field of allFields) {
    fieldStats[field] = { filled: 0, total: constituents.length };
  }

  for (const constituent of constituents) {
    totalScore += calculateCompletenessScore(constituent);
    totalRequiredScore += getRequiredFieldsCompleteness(constituent);
    totalOptionalScore += getOptionalFieldsCompleteness(constituent);

    // Count field completeness
    for (const field of allFields) {
      const value = constituent[field as keyof Constituent];
      const fieldStat = fieldStats[field];
      if (fieldStat && isFieldFilled(value)) {
        fieldStat.filled++;
      }
    }

    // Count issues
    const issues = analyzeCompletenessIssues(constituent);
    for (const issue of issues) {
      issuesSummary[issue.type] = (issuesSummary[issue.type] || 0) + 1;
    }
  }

  const n = constituents.length;

  return {
    averageScore: totalScore / n,
    requiredScore: totalRequiredScore / n,
    optionalScore: totalOptionalScore / n,
    fieldStats: Object.fromEntries(
      Object.entries(fieldStats).map(([field, stats]) => [
        field,
        { ...stats, percentage: stats.total > 0 ? stats.filled / stats.total : 0 },
      ])
    ),
    issuesSummary,
  };
}
