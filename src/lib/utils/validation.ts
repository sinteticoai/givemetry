// T083: Data validation with Zod schemas
import { z } from "zod";
import { parseDate } from "./dates";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone normalization regex - matches various phone formats
const PHONE_CHARS_REGEX = /[^\d+]/g;

/**
 * Transform a string value to a number, handling currency formatting
 */
export function parseAmount(value: string | null | undefined): number | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, "").trim();

  if (!cleaned) {
    return null;
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalize phone number to digits only
 */
export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  // Keep only digits and leading +
  const hasPlus = value.startsWith("+");
  const digits = value.replace(PHONE_CHARS_REGEX, "");

  if (!digits) {
    return null;
  }

  return hasPlus ? `+${digits}` : digits;
}

/**
 * Normalize email to lowercase
 */
export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  return EMAIL_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Parse a boolean value from various string representations
 */
export function parseBoolean(
  value: string | boolean | null | undefined
): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const lower = value.toLowerCase().trim();

  if (["true", "yes", "1", "y", "t", "on"].includes(lower)) {
    return true;
  }

  if (["false", "no", "0", "n", "f", "off"].includes(lower)) {
    return false;
  }

  return null;
}

/**
 * Parse a year from various formats
 */
export function parseYear(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  // Full year
  if (/^\d{4}$/.test(trimmed)) {
    const year = parseInt(trimmed, 10);
    if (year >= 1900 && year <= 2100) {
      return year;
    }
  }

  // 2-digit year
  if (/^\d{2}$/.test(trimmed)) {
    const twoDigit = parseInt(trimmed, 10);
    // Assume 00-29 means 2000-2029, 30-99 means 1930-1999
    return twoDigit >= 30 ? 1900 + twoDigit : 2000 + twoDigit;
  }

  // Extract year from date
  const date = parseDate(trimmed);
  if (date) {
    return date.getFullYear();
  }

  return null;
}

// ============================================
// Zod Schemas for Import Data
// ============================================

/**
 * Constituent import schema
 */
export const constituentImportSchema = z.object({
  externalId: z.string().min(1, "External ID is required"),
  externalSource: z.string().optional().default("csv"),
  prefix: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1, "Last name is required"),
  suffix: z.string().optional().nullable(),
  email: z
    .string()
    .optional()
    .nullable()
    .transform((val) => normalizeEmail(val)),
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => normalizePhone(val)),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  constituentType: z.string().optional().nullable(),
  classYear: z
    .string()
    .optional()
    .nullable()
    .transform((val) => parseYear(val)),
  schoolCollege: z.string().optional().nullable(),
  estimatedCapacity: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? parseAmount(val) : null)),
  capacitySource: z.string().optional().nullable(),
  assignedOfficerId: z.string().optional().nullable(),
  portfolioTier: z.string().optional().nullable(),
});

export type ConstituentImport = z.infer<typeof constituentImportSchema>;

/**
 * Gift import schema
 */
export const giftImportSchema = z.object({
  constituentExternalId: z.string().min(1, "Constituent ID is required"),
  externalId: z.string().optional().nullable(),
  amount: z
    .string()
    .transform((val) => {
      const amount = parseAmount(val);
      if (amount === null) {
        throw new Error("Invalid amount");
      }
      return amount;
    }),
  giftDate: z.string().transform((val) => {
    const date = parseDate(val);
    if (!date) {
      throw new Error("Invalid date");
    }
    return date;
  }),
  giftType: z.string().optional().nullable(),
  fundName: z.string().optional().nullable(),
  fundCode: z.string().optional().nullable(),
  campaign: z.string().optional().nullable(),
  appeal: z.string().optional().nullable(),
  recognitionAmount: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? parseAmount(val) : null)),
  isAnonymous: z
    .string()
    .optional()
    .nullable()
    .transform((val) => parseBoolean(val) ?? false),
});

export type GiftImport = z.infer<typeof giftImportSchema>;

/**
 * Contact import schema
 */
export const contactImportSchema = z.object({
  constituentExternalId: z.string().min(1, "Constituent ID is required"),
  externalId: z.string().optional().nullable(),
  contactDate: z.string().transform((val) => {
    const date = parseDate(val);
    if (!date) {
      throw new Error("Invalid date");
    }
    return date;
  }),
  contactType: z.string().min(1, "Contact type is required"),
  subject: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  nextAction: z.string().optional().nullable(),
  nextActionDate: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? parseDate(val) : null)),
});

export type ContactImport = z.infer<typeof contactImportSchema>;

// ============================================
// Validation Utilities
// ============================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Validate a single row against a schema
 */
export function validateRow<T>(
  row: Record<string, unknown>,
  schema: z.ZodSchema<T>,
  rowNumber?: number
): ValidationResult<T> {
  const result = schema.safeParse(row);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: [],
    };
  }

  const errors = result.error.issues.map((err) => ({
    path: err.path.join("."),
    message: rowNumber
      ? `Row ${rowNumber}: ${err.message}`
      : err.message,
  }));

  return {
    success: false,
    errors,
  };
}

/**
 * Validate multiple rows and collect all errors
 */
export function validateRows<T>(
  rows: Record<string, unknown>[],
  schema: z.ZodSchema<T>
): {
  valid: T[];
  invalid: Array<{
    row: number;
    data: Record<string, unknown>;
    errors: Array<{ path: string; message: string }>;
  }>;
} {
  const valid: T[] = [];
  const invalid: Array<{
    row: number;
    data: Record<string, unknown>;
    errors: Array<{ path: string; message: string }>;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const result = validateRow(row, schema, i + 2); // +2 for 1-indexing and header row

    if (result.success && result.data) {
      valid.push(result.data);
    } else {
      invalid.push({
        row: i + 2, // 1-indexed, +1 for header
        data: row,
        errors: result.errors,
      });
    }
  }

  return { valid, invalid };
}

/**
 * Transform raw CSV data using field mapping and validate
 */
export function transformAndValidate<T>(
  rows: Record<string, string>[],
  mapping: Record<string, string | null>,
  schema: z.ZodSchema<T>
): {
  valid: T[];
  invalid: Array<{
    row: number;
    data: Record<string, unknown>;
    errors: Array<{ path: string; message: string }>;
  }>;
} {
  // Apply mapping to transform rows
  const transformedRows = rows.map((row) => {
    const transformed: Record<string, string | undefined> = {};

    for (const [sourceCol, targetField] of Object.entries(mapping)) {
      if (targetField && sourceCol in row) {
        transformed[targetField] = row[sourceCol];
      }
    }

    return transformed as Record<string, unknown>;
  });

  // Validate transformed rows
  return validateRows(transformedRows, schema);
}

/**
 * Clean and trim all string values in a row
 */
export function cleanRow(
  row: Record<string, string>
): Record<string, string> {
  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    cleaned[key] = value?.trim() ?? "";
  }

  return cleaned;
}

/**
 * Check if a row is essentially empty (all values blank)
 */
export function isEmptyRow(row: Record<string, string>): boolean {
  return Object.values(row).every((val) => !val || val.trim() === "");
}

/**
 * Get data quality metrics for a set of rows
 */
export function getDataQuality(
  rows: Record<string, string>[],
  fields: string[]
): Record<string, { filled: number; empty: number; fillRate: number }> {
  const metrics: Record<string, { filled: number; empty: number; fillRate: number }> = {};

  for (const field of fields) {
    let filled = 0;
    let empty = 0;

    for (const row of rows) {
      if (row[field] && row[field].trim()) {
        filled++;
      } else {
        empty++;
      }
    }

    const total = filled + empty;
    metrics[field] = {
      filled,
      empty,
      fillRate: total > 0 ? filled / total : 0,
    };
  }

  return metrics;
}
