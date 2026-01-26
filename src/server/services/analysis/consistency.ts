// T105: Consistency scoring service
// Calculates data consistency scores based on format validation and pattern matching

export interface ConsistencyResult {
  score: number;
  emailScore: number;
  phoneScore: number;
  addressScore: number;
  nameScore: number;
  issues: ConsistencyIssue[];
}

export interface ConsistencyIssue {
  field: string;
  type: "invalid_format" | "inconsistent_pattern" | "suspicious_value" | "duplicate";
  severity: "high" | "medium" | "low";
  message: string;
  examples?: string[];
  count?: number;
}

// Regex patterns for validation
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_PATTERNS = [
  /^\(\d{3}\)\s?\d{3}-\d{4}$/, // (555) 123-4567
  /^\d{3}-\d{3}-\d{4}$/, // 555-123-4567
  /^\d{10}$/, // 5551234567
  /^\+\d{1,3}\s?\(\d{3}\)\s?\d{3}-\d{4}$/, // +1 (555) 123-4567
  /^\+\d{1,3}[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}$/, // +1-555-123-4567
];
const STATE_PATTERN = /^[A-Z]{2}$/;
const POSTAL_CODE_PATTERNS = [
  /^\d{5}$/, // US: 12345
  /^\d{5}-\d{4}$/, // US: 12345-6789
  /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, // Canada: A1A 1A1
];

// Weights for consistency scoring
const CONSISTENCY_WEIGHTS = {
  email: 0.30,
  phone: 0.20,
  address: 0.25,
  name: 0.25,
};

/**
 * Validate email format
 */
export function validateEmail(email: string | null): boolean {
  if (!email) return true; // Null is considered consistent (just missing)
  return EMAIL_PATTERN.test(email.trim());
}

/**
 * Validate phone format
 */
export function validatePhone(phone: string | null): boolean {
  if (!phone) return true;
  const cleaned = phone.trim();
  return PHONE_PATTERNS.some((pattern) => pattern.test(cleaned));
}

/**
 * Validate state abbreviation
 */
export function validateState(state: string | null): boolean {
  if (!state) return true;
  return STATE_PATTERN.test(state.trim().toUpperCase());
}

/**
 * Validate postal code format
 */
export function validatePostalCode(postalCode: string | null): boolean {
  if (!postalCode) return true;
  const cleaned = postalCode.trim();
  return POSTAL_CODE_PATTERNS.some((pattern) => pattern.test(cleaned));
}

/**
 * Validate name format (basic checks)
 */
export function validateName(name: string | null): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!name) return { valid: true, issues };

  const trimmed = name.trim();

  // Check for all caps
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 2) {
    issues.push("Name appears to be all caps");
  }

  // Check for all lowercase
  if (trimmed === trimmed.toLowerCase() && trimmed.length > 2) {
    issues.push("Name appears to be all lowercase");
  }

  // Check for numbers in name
  if (/\d/.test(trimmed)) {
    issues.push("Name contains numbers");
  }

  // Check for excessive special characters
  if (/[^a-zA-Z\s'-]/.test(trimmed)) {
    issues.push("Name contains unusual characters");
  }

  // Check for placeholder values
  const placeholders = ["test", "unknown", "n/a", "na", "none", "xxx"];
  if (placeholders.includes(trimmed.toLowerCase())) {
    issues.push("Name appears to be a placeholder");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Check for address consistency
 */
export function validateAddress(address: {
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let validFields = 0;
  let totalFields = 0;

  // Check state format
  if (address.state) {
    totalFields++;
    if (validateState(address.state)) {
      validFields++;
    } else {
      issues.push(`Invalid state format: "${address.state}"`);
    }
  }

  // Check postal code format
  if (address.postalCode) {
    totalFields++;
    if (validatePostalCode(address.postalCode)) {
      validFields++;
    } else {
      issues.push(`Invalid postal code format: "${address.postalCode}"`);
    }
  }

  // Check for partial addresses
  const hasAddress = Boolean(address.addressLine1);
  const hasCity = Boolean(address.city);
  const hasState = Boolean(address.state);
  const hasPostal = Boolean(address.postalCode);

  if (hasAddress && (!hasCity || !hasState || !hasPostal)) {
    issues.push("Address is incomplete");
  }

  if ((hasCity || hasState || hasPostal) && !hasAddress) {
    issues.push("City/state/postal present without street address");
  }

  const score = totalFields > 0 ? validFields / totalFields : 1.0;

  return { score, issues };
}

/**
 * Calculate consistency score for a single constituent
 */
export function calculateConsistencyScore(constituent: {
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}): ConsistencyResult {
  const issues: ConsistencyIssue[] = [];

  // Email validation
  let emailScore = 1.0;
  if (constituent.email && !validateEmail(constituent.email)) {
    emailScore = 0;
    issues.push({
      field: "email",
      type: "invalid_format",
      severity: "medium",
      message: `Invalid email format: "${constituent.email}"`,
    });
  }

  // Phone validation
  let phoneScore = 1.0;
  if (constituent.phone && !validatePhone(constituent.phone)) {
    phoneScore = 0.5; // Partial credit for having a phone, even if format is unusual
    issues.push({
      field: "phone",
      type: "inconsistent_pattern",
      severity: "low",
      message: `Phone format may be inconsistent: "${constituent.phone}"`,
    });
  }

  // Name validation
  let nameScore = 1.0;
  const firstNameValidation = validateName(constituent.firstName);
  const lastNameValidation = validateName(constituent.lastName);

  if (!firstNameValidation.valid || !lastNameValidation.valid) {
    const nameIssues = [...firstNameValidation.issues, ...lastNameValidation.issues];
    nameScore = Math.max(0, 1 - nameIssues.length * 0.2);
    for (const issue of nameIssues) {
      issues.push({
        field: "name",
        type: "suspicious_value",
        severity: "low",
        message: issue,
      });
    }
  }

  // Address validation
  const addressValidation = validateAddress({
    addressLine1: constituent.addressLine1,
    city: constituent.city,
    state: constituent.state,
    postalCode: constituent.postalCode,
  });

  const addressScore = addressValidation.score;
  for (const issue of addressValidation.issues) {
    issues.push({
      field: "address",
      type: "invalid_format",
      severity: "low",
      message: issue,
    });
  }

  // Calculate overall score
  const overall =
    emailScore * CONSISTENCY_WEIGHTS.email +
    phoneScore * CONSISTENCY_WEIGHTS.phone +
    addressScore * CONSISTENCY_WEIGHTS.address +
    nameScore * CONSISTENCY_WEIGHTS.name;

  return {
    score: overall,
    emailScore,
    phoneScore,
    addressScore,
    nameScore,
    issues,
  };
}

/**
 * Calculate aggregate consistency for multiple constituents
 */
export function calculateBatchConsistency(
  constituents: Array<{
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  }>
): {
  averageScore: number;
  emailConsistency: number;
  phoneConsistency: number;
  addressConsistency: number;
  nameConsistency: number;
  totalIssues: number;
  issuesByType: Record<string, number>;
} {
  if (constituents.length === 0) {
    return {
      averageScore: 0,
      emailConsistency: 0,
      phoneConsistency: 0,
      addressConsistency: 0,
      nameConsistency: 0,
      totalIssues: 0,
      issuesByType: {},
    };
  }

  let totalScore = 0;
  let totalEmail = 0;
  let totalPhone = 0;
  let totalAddress = 0;
  let totalName = 0;
  let totalIssues = 0;
  const issuesByType: Record<string, number> = {};

  for (const constituent of constituents) {
    const result = calculateConsistencyScore(constituent);
    totalScore += result.score;
    totalEmail += result.emailScore;
    totalPhone += result.phoneScore;
    totalAddress += result.addressScore;
    totalName += result.nameScore;
    totalIssues += result.issues.length;

    for (const issue of result.issues) {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    }
  }

  const n = constituents.length;

  return {
    averageScore: totalScore / n,
    emailConsistency: totalEmail / n,
    phoneConsistency: totalPhone / n,
    addressConsistency: totalAddress / n,
    nameConsistency: totalName / n,
    totalIssues,
    issuesByType,
  };
}

/**
 * Detect duplicate values in a field
 */
export function detectDuplicates(
  values: string[],
  _threshold: number = 0.8
): {
  duplicates: string[];
  count: number;
} {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (value) {
      const normalized = value.toLowerCase().trim();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  const duplicates: string[] = [];
  let count = 0;

  for (const [value, valueCount] of Array.from(counts.entries())) {
    if (valueCount > 1) {
      duplicates.push(value);
      count += valueCount - 1; // Count extra occurrences
    }
  }

  return { duplicates, count };
}
