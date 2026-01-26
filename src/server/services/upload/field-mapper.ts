// T082: Field mapping suggestions logic

export type DataType = "constituents" | "gifts" | "contacts";

export interface FieldMapping {
  [sourceColumn: string]: string | null;
}

export interface MappingSuggestion {
  mapping: FieldMapping;
  confidence: Record<string, number>;
  unmappedColumns: string[];
  requiredFields: string[];
  optionalFields: string[];
}

export interface ValidationError {
  type: string;
  field: string;
  message: string;
}

export interface ValidationWarning {
  type: string;
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface MatchResult {
  field: string;
  confidence: number;
}

export interface FindBestMatchOptions {
  minConfidence?: number;
}

// Field definitions by data type
const CONSTITUENT_FIELDS = {
  required: ["externalId", "lastName"],
  optional: [
    "firstName",
    "middleName",
    "prefix",
    "suffix",
    "email",
    "phone",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "country",
    "constituentType",
    "classYear",
    "schoolCollege",
    "estimatedCapacity",
    "capacitySource",
    "assignedOfficerId",
    "portfolioTier",
  ],
};

const GIFT_FIELDS = {
  required: ["constituentExternalId", "amount", "giftDate"],
  optional: [
    "externalId",
    "giftType",
    "fundName",
    "fundCode",
    "campaign",
    "appeal",
    "recognitionAmount",
    "isAnonymous",
  ],
};

const CONTACT_FIELDS = {
  required: ["constituentExternalId", "contactDate", "contactType"],
  optional: [
    "externalId",
    "subject",
    "notes",
    "outcome",
    "nextAction",
    "nextActionDate",
  ],
};

// Column name patterns for auto-mapping
const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  // Constituent ID patterns
  externalId: [
    /^(constituent|donor|account|contact|crm|lookup|key)[\s_-]*(id|number|#)?$/i,
    /^id$/i,
    /^keyid$/i,
    /^pidm$/i,
    /^cnbio[\s_-]*id$/i,
    /^account[\s_-]*id$/i,
  ],
  constituentExternalId: [
    /^(constituent|donor|account|contact|crm)[\s_-]*(id|number|#)?$/i,
    /^id$/i,
    /^keyid$/i,
    /^pidm$/i,
  ],

  // Name patterns
  firstName: [
    /^first[\s_-]*(name)?$/i,
    /^(given|forename)[\s_-]*(name)?$/i,
    /^fnm?$/i,
    /^f[\s_-]*name$/i,
    /^firstnm$/i,
    /^cnbio[\s_-]*first[\s_-]*name$/i,
    /^first[\s_-]*name[\s_-]*[_c]*$/i,
  ],
  lastName: [
    /^last[\s_-]*(name)?$/i,
    /^(sur|family)[\s_-]*(name)?$/i,
    /^lnm?$/i,
    /^l[\s_-]*name$/i,
    /^lastnm$/i,
    /^surname$/i,
    /^cnbio[\s_-]*last[\s_-]*name$/i,
    /^last[\s_-]*name[\s_-]*[_c]*$/i,
  ],
  middleName: [/^middle[\s_-]*(name)?$/i, /^mi$/i, /^middle[\s_-]*initial$/i],
  prefix: [/^prefix$/i, /^title$/i, /^salutation$/i, /^honorific$/i],
  suffix: [/^suffix$/i, /^jr|sr|iii?$/i],

  // Contact info patterns
  email: [
    /^(e[\s_-]*)?(mail|email)[\s_-]*(address)?$/i,
    /^(primary[\s_-]*)?email$/i,
    /^pref[\s_-]*email$/i,
    /^email[\s_-]*[_c]*$/i,
  ],
  phone: [
    /^(phone|tel|telephone)[\s_-]*(number|#)?$/i,
    /^(home|primary|pref)[\s_-]*phone$/i,
    /^cnph[\s_-]*.*phone/i,
  ],

  // Address patterns
  addressLine1: [
    /^address[\s_-]*(line[\s_-]*)?1$/i,
    /^(street|addr)[\s_-]*(address)?[\s_-]*1?$/i,
    /^home[\s_-]*addr[\s_-]*line[\s_-]*1$/i,
    /^cnadrprf[\s_-]*addrline1$/i,
  ],
  addressLine2: [
    /^address[\s_-]*(line[\s_-]*)?2$/i,
    /^(apt|suite|unit)$/i,
    /^addr[\s_-]*2$/i,
  ],
  city: [/^city$/i, /^town$/i, /^municipality$/i],
  state: [
    /^state$/i,
    /^(state|province)[\s_-]*(code)?$/i,
    /^st$/i,
    /^region$/i,
  ],
  postalCode: [
    /^(postal|zip|post)[\s_-]*(code)?$/i,
    /^postcode$/i,
    /^zip$/i,
  ],
  country: [/^country$/i, /^nation$/i],

  // Classification patterns
  constituentType: [
    /^(constituent|donor)[\s_-]*type$/i,
    /^type$/i,
    /^(record|entity)[\s_-]*type$/i,
    /^classification$/i,
  ],
  classYear: [
    /^class[\s_-]*(year|of)?$/i,
    /^(graduation|grad)[\s_-]*(year)?$/i,
    /^year$/i,
  ],
  schoolCollege: [
    /^school[\s_-]*(college)?$/i,
    /^college$/i,
    /^department$/i,
    /^division$/i,
  ],

  // Wealth patterns
  estimatedCapacity: [
    /^(estimated[\s_-]*)?(capacity|wealth)[\s_-]*(rating|score)?$/i,
    /^capacity$/i,
    /^wealth[\s_-]*rating$/i,
  ],
  capacitySource: [/^capacity[\s_-]*source$/i, /^wealth[\s_-]*source$/i],

  // Assignment patterns
  assignedOfficerId: [
    /^(assigned[\s_-]*)?(gift[\s_-]*)?officer[\s_-]*(id)?$/i,
    /^(mgo|manager)[\s_-]*(assignment|id)?$/i,
    /^portfolio[\s_-]*(manager|owner)$/i,
    /^relationship[\s_-]*manager$/i,
  ],
  portfolioTier: [/^portfolio[\s_-]*tier$/i, /^tier$/i, /^prospect[\s_-]*level$/i],

  // Gift patterns
  amount: [
    /^(gift[\s_-]*)?(amount|amt|value)$/i,
    /^(donation|total)[\s_-]*(amount)?$/i,
    /^cash[\s_-]*amount$/i,
  ],
  giftDate: [
    /^(gift|donation|transaction)[\s_-]*(date)?$/i,
    /^date[\s_-]*(received)?$/i,
    /^receive[\s_-]*date$/i,
  ],
  giftType: [
    /^(gift|donation)[\s_-]*type$/i,
    /^type$/i,
    /^payment[\s_-]*type$/i,
  ],
  fundName: [
    /^fund[\s_-]*(name)?$/i,
    /^designation$/i,
    /^account[\s_-]*name$/i,
  ],
  fundCode: [/^fund[\s_-]*(code|id)$/i, /^account[\s_-]*code$/i],
  campaign: [/^campaign$/i, /^campaign[\s_-]*name$/i],
  appeal: [/^appeal$/i, /^appeal[\s_-]*(code|name)$/i, /^solicitation$/i],
  recognitionAmount: [
    /^recognition[\s_-]*(amount|credit)$/i,
    /^soft[\s_-]*credit$/i,
  ],
  isAnonymous: [/^anonymous$/i, /^is[\s_-]*anonymous$/i],

  // Contact patterns
  contactDate: [
    /^(contact|interaction|activity)[\s_-]*(date)?$/i,
    /^date$/i,
  ],
  contactType: [
    /^(contact|interaction|activity)[\s_-]*type$/i,
    /^type$/i,
    /^method$/i,
  ],
  subject: [/^subject$/i, /^title$/i, /^topic$/i, /^regarding$/i],
  notes: [
    /^notes?$/i,
    /^(description|summary|details)$/i,
    /^comment(s)?$/i,
  ],
  outcome: [
    /^outcome$/i,
    /^(contact[\s_-]*)?result$/i,
    /^response$/i,
    /^status$/i,
  ],
  nextAction: [/^next[\s_-]*action$/i, /^follow[\s_-]*up$/i, /^todo$/i],
  nextActionDate: [
    /^next[\s_-]*action[\s_-]*date$/i,
    /^follow[\s_-]*up[\s_-]*date$/i,
    /^deadline$/i,
  ],
};

/**
 * Suggest field mappings based on column names
 */
export function suggestFieldMapping(
  columns: string[],
  dataType: DataType
): MappingSuggestion {
  const fields = getFieldsForDataType(dataType);
  const allTargetFields = [...fields.required, ...fields.optional];

  const mapping: FieldMapping = {};
  const confidence: Record<string, number> = {};
  const usedTargets = new Set<string>();

  // First pass: exact and high-confidence matches
  for (const column of columns) {
    const match = findBestMatch(column, allTargetFields);
    if (match && match.confidence >= 0.7) {
      if (!usedTargets.has(match.field)) {
        mapping[column] = match.field;
        confidence[column] = match.confidence;
        usedTargets.add(match.field);
      }
    }
  }

  // Second pass: lower confidence matches for unmapped columns
  for (const column of columns) {
    if (mapping[column]) continue;

    const match = findBestMatch(column, allTargetFields, { minConfidence: 0.3 });
    if (match && !usedTargets.has(match.field)) {
      mapping[column] = match.field;
      confidence[column] = match.confidence;
      usedTargets.add(match.field);
    }
  }

  // Identify unmapped columns
  const unmappedColumns = columns.filter((col) => !mapping[col]);

  return {
    mapping,
    confidence,
    unmappedColumns,
    requiredFields: fields.required,
    optionalFields: fields.optional,
  };
}

/**
 * Validate a field mapping
 */
export function validateFieldMapping(
  mapping: FieldMapping,
  dataType: DataType
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const fields = getFieldsForDataType(dataType);

  // Check for missing required fields
  const mappedTargets = new Set(
    Object.values(mapping).filter((v): v is string => v !== null)
  );

  for (const required of fields.required) {
    if (!mappedTargets.has(required)) {
      errors.push({
        type: "missing_required_field",
        field: required,
        message: `Required field "${required}" is not mapped`,
      });
    }
  }

  // Check for duplicate mappings
  const targetCounts: Record<string, number> = {};
  for (const target of Object.values(mapping)) {
    if (target) {
      targetCounts[target] = (targetCounts[target] || 0) + 1;
    }
  }

  for (const [target, count] of Object.entries(targetCounts)) {
    if (count > 1) {
      errors.push({
        type: "duplicate_mapping",
        field: target,
        message: `Field "${target}" is mapped to multiple columns`,
      });
    }
  }

  // Warn about unmapped recommended fields
  const recommendedFields = ["firstName", "email"]; // Subset of optional that we recommend
  for (const field of recommendedFields) {
    if (fields.optional.includes(field) && !mappedTargets.has(field)) {
      warnings.push({
        type: "unmapped_recommended_field",
        field,
        message: `Recommended field "${field}" is not mapped`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Apply a field mapping to transform a row
 */
export function applyFieldMapping(
  row: Record<string, string>,
  mapping: FieldMapping
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (const [sourceColumn, targetField] of Object.entries(mapping)) {
    if (targetField && sourceColumn in row) {
      result[targetField] = row[sourceColumn];
    }
  }

  return result;
}

/**
 * Normalize a column name to camelCase
 */
export function normalizeColumnName(name: string): string {
  if (!name || !name.trim()) {
    return "";
  }

  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
}

/**
 * Get required fields for a data type
 */
export function getRequiredFields(dataType: DataType): string[] {
  return getFieldsForDataType(dataType).required;
}

/**
 * Get optional fields for a data type
 */
export function getOptionalFields(dataType: DataType): string[] {
  return getFieldsForDataType(dataType).optional;
}

/**
 * Get field definitions for a data type
 */
function getFieldsForDataType(
  dataType: DataType
): { required: string[]; optional: string[] } {
  switch (dataType) {
    case "constituents":
      return CONSTITUENT_FIELDS;
    case "gifts":
      return GIFT_FIELDS;
    case "contacts":
      return CONTACT_FIELDS;
    default:
      return { required: [], optional: [] };
  }
}

/**
 * Calculate confidence score for a column-to-field mapping
 */
export function calculateMappingConfidence(
  targetField: string,
  sourceColumn: string
): number {
  const normalized = normalizeColumnName(sourceColumn);
  const targetNormalized = targetField.toLowerCase();

  // Exact match (after normalization)
  if (normalized === targetNormalized) {
    return 1.0;
  }

  // Check against known patterns
  const patterns = COLUMN_PATTERNS[targetField];
  if (patterns) {
    for (const pattern of patterns) {
      if (pattern.test(sourceColumn)) {
        return 0.95;
      }
    }
  }

  // Substring match
  if (
    normalized.includes(targetNormalized) ||
    targetNormalized.includes(normalized)
  ) {
    return 0.7;
  }

  // Word overlap
  const sourceWordsArr = normalized.split(/(?=[A-Z])|[\s_-]+/).map((w) => w.toLowerCase());
  const targetWords = new Set(targetNormalized.split(/(?=[A-Z])/).map((w) => w.toLowerCase()));

  let overlap = 0;
  for (let i = 0; i < sourceWordsArr.length; i++) {
    const word = sourceWordsArr[i];
    if (word && targetWords.has(word) && word.length > 2) {
      overlap++;
    }
  }

  if (overlap > 0) {
    return Math.min(0.6, 0.3 + overlap * 0.15);
  }

  return 0.0;
}

/**
 * Find the best matching target field for a source column
 */
export function findBestMatch(
  sourceColumn: string,
  targetFields: string[],
  options: FindBestMatchOptions = {}
): MatchResult | null {
  const { minConfidence = 0.3 } = options;

  let bestMatch: MatchResult | null = null;

  for (const targetField of targetFields) {
    const confidence = calculateMappingConfidence(targetField, sourceColumn);

    if (confidence >= minConfidence) {
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { field: targetField, confidence };
      }
    }
  }

  return bestMatch;
}
