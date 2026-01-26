// Brief accuracy validation service (for golden dataset tests)
import type { BriefContent, Citation } from "./citation-validator";

export type { BriefContent, Citation };

export interface GoldenDataset {
  constituent: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    prefix?: string | null;
    email?: string | null;
    constituentType?: string | null;
    classYear?: number | null;
    schoolCollege?: string | null;
    estimatedCapacity?: number | null;
  };
  gifts: Array<{
    id: string;
    amount: number;
    giftDate: Date;
    fundName?: string | null;
  }>;
  contacts: Array<{
    id: string;
    contactType: string;
    contactDate: Date;
    notes?: string | null;
  }>;
  totalLifetime: number;
  giftCount: number;
  lastGiftDate: Date | null;
}

export interface AmountAccuracyResult {
  valid: boolean;
  totalLifetimeMatch: boolean;
  discrepancy?: number;
  expectedAmount?: number;
  actualAmount?: number;
}

export interface DateAccuracyResult {
  lastGiftDateValid: boolean;
  expectedLastGiftDate?: Date | null;
  mentionedDate?: string;
}

export interface FactualClaimsResult {
  validClaims: string[];
  invalidClaims: string[];
}

export interface ValidationResult {
  overallValid: boolean;
  amountAccuracy: AmountAccuracyResult;
  dateAccuracy: DateAccuracyResult;
  factualClaims: FactualClaimsResult;
  errors: string[];
}

export function verifyAmountAccuracy(
  brief: BriefContent,
  dataset: GoldenDataset,
  options: { tolerance?: number } = {}
): AmountAccuracyResult {
  const { tolerance = 0.001 } = options; // 0.1% default tolerance

  const expectedAmount = dataset.totalLifetime;
  const actualAmount = brief.givingHistory?.totalLifetime ?? 0;

  if (expectedAmount === 0 && actualAmount === 0) {
    return {
      valid: true,
      totalLifetimeMatch: true,
      expectedAmount,
      actualAmount,
    };
  }

  const discrepancy = Math.abs(expectedAmount - actualAmount) / (expectedAmount || 1);
  const isMatch = discrepancy <= tolerance;

  return {
    valid: isMatch,
    totalLifetimeMatch: isMatch,
    discrepancy,
    expectedAmount,
    actualAmount,
  };
}

export function verifyDateAccuracy(
  brief: BriefContent,
  dataset: GoldenDataset
): DateAccuracyResult {
  const expectedLastGiftDate = dataset.lastGiftDate;

  // If no gifts, no last gift date should be mentioned as a specific date
  if (!expectedLastGiftDate) {
    return {
      lastGiftDateValid: true,
      expectedLastGiftDate: null,
    };
  }

  // Check if the brief mentions the correct date (simple text-based check)
  // In a real implementation, you might use more sophisticated date extraction
  const briefText = [
    brief.summary?.text,
    brief.givingHistory?.text,
  ].filter(Boolean).join(" ");

  const expectedYear = expectedLastGiftDate.getFullYear();
  const expectedMonth = expectedLastGiftDate.toLocaleString("en", { month: "long" });
  const expectedMonthShort = expectedLastGiftDate.toLocaleString("en", { month: "short" });

  // Check if the year and month are mentioned
  const hasYear = briefText.includes(expectedYear.toString());
  const hasMonth = briefText.toLowerCase().includes(expectedMonth.toLowerCase()) ||
                   briefText.toLowerCase().includes(expectedMonthShort.toLowerCase());

  return {
    lastGiftDateValid: hasYear || hasMonth || !briefText.includes("most recent"),
    expectedLastGiftDate,
    mentionedDate: briefText.match(/\d{4}/)?.[0],
  };
}

export function checkFactualClaims(
  brief: BriefContent,
  dataset: GoldenDataset
): FactualClaimsResult {
  const validClaims: string[] = [];
  const invalidClaims: string[] = [];

  const briefText = [
    brief.summary?.text,
    brief.givingHistory?.text,
    brief.relationshipHighlights?.text,
  ].filter(Boolean).join(" ");

  const briefTextLower = briefText.toLowerCase();

  // Check class year
  if (dataset.constituent.classYear) {
    const yearStr = dataset.constituent.classYear.toString();
    if (briefText.includes(yearStr)) {
      validClaims.push(`classYear:${yearStr}`);
    } else {
      // Check if a wrong year is mentioned
      const yearMatch = briefText.match(/\b(19|20)\d{2}\b/g);
      if (yearMatch && !yearMatch.includes(yearStr)) {
        invalidClaims.push(`classYear: expected ${yearStr}, found ${yearMatch.join(", ")}`);
      }
    }
  }

  // Check school/college
  if (dataset.constituent.schoolCollege) {
    const school = dataset.constituent.schoolCollege.toLowerCase();
    if (briefTextLower.includes(school)) {
      validClaims.push(`schoolCollege:${dataset.constituent.schoolCollege}`);
    } else {
      // Check for common school name patterns
      const schoolPatterns = ["school of", "college of", "department of"];
      for (const pattern of schoolPatterns) {
        const idx = briefTextLower.indexOf(pattern);
        if (idx !== -1 && !briefTextLower.includes(school)) {
          invalidClaims.push(`schoolCollege: mentioned but doesn't match "${dataset.constituent.schoolCollege}"`);
          break;
        }
      }
    }
  }

  // Check constituent type
  if (dataset.constituent.constituentType) {
    const type = dataset.constituent.constituentType.toLowerCase();
    if (briefTextLower.includes(type)) {
      validClaims.push(`constituentType:${dataset.constituent.constituentType}`);
    }
  }

  // Check name
  const name = [dataset.constituent.firstName, dataset.constituent.lastName]
    .filter(Boolean)
    .join(" ");
  if (name && briefText.includes(name)) {
    validClaims.push(`name:${name}`);
  }

  return { validClaims, invalidClaims };
}

export function validateBriefAccuracy(
  brief: BriefContent,
  dataset: GoldenDataset,
  options: { tolerancePercent?: number } = {}
): ValidationResult {
  const errors: string[] = [];

  // Validate amount accuracy
  const amountAccuracy = verifyAmountAccuracy(brief, dataset, {
    tolerance: (options.tolerancePercent || 1) / 100,
  });
  if (!amountAccuracy.valid) {
    errors.push(
      `Lifetime giving mismatch: expected $${amountAccuracy.expectedAmount?.toLocaleString()}, ` +
      `got $${amountAccuracy.actualAmount?.toLocaleString()} ` +
      `(${((amountAccuracy.discrepancy || 0) * 100).toFixed(1)}% difference)`
    );
  }

  // Validate date accuracy
  const dateAccuracy = verifyDateAccuracy(brief, dataset);
  if (!dateAccuracy.lastGiftDateValid) {
    errors.push(
      `Last gift date may be incorrect: expected ${dateAccuracy.expectedLastGiftDate?.toLocaleDateString()}`
    );
  }

  // Validate factual claims
  const factualClaims = checkFactualClaims(brief, dataset);
  for (const invalidClaim of factualClaims.invalidClaims) {
    errors.push(`Factual error: ${invalidClaim}`);
  }

  return {
    overallValid: errors.length === 0,
    amountAccuracy,
    dateAccuracy,
    factualClaims,
    errors,
  };
}
