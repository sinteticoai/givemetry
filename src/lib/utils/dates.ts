// T081: Date format detection with chrono-node
import * as chrono from "chrono-node";
import { parse, isValid, format, differenceInMonths, startOfDay, subDays, subMonths, subYears } from "date-fns";

export interface DateFormatResult {
  format: string | null;
  confidence: number;
  ambiguous: boolean;
}

export interface DateRangeResult {
  start: Date;
  end: Date;
}

export interface ParseDateOptions {
  format?: string;
  fiscalYearStart?: number;
  allowPartial?: boolean;
  allowExcelSerial?: boolean;
}

export interface ValidateDateOptions {
  min?: Date;
  max?: Date;
}

export interface ParseDateRangeOptions {
  fiscalYearStart?: number;
}

// Common date format patterns
export const DATE_FORMATS = [
  "YYYY-MM-DD",
  "yyyy-MM-dd",
  "MM/DD/YYYY",
  "MM/dd/yyyy",
  "M/D/YYYY",
  "M/d/yyyy",
  "DD/MM/YYYY",
  "dd/MM/yyyy",
  "D/M/YYYY",
  "d/M/yyyy",
  "MMMM D, YYYY",
  "MMMM d, yyyy",
  "MMM D, YYYY",
  "MMM d, yyyy",
  "D MMMM YYYY",
  "d MMMM yyyy",
  "YYYY-MM-DD HH:mm:ss",
  "yyyy-MM-dd HH:mm:ss",
  "MM/DD/YYYY HH:mm",
  "MM/dd/yyyy HH:mm",
];

// date-fns compatible format strings
const DATE_FNS_FORMATS = [
  "yyyy-MM-dd",
  "MM/dd/yyyy",
  "M/d/yyyy",
  "dd/MM/yyyy",
  "d/M/yyyy",
  "MMMM d, yyyy",
  "MMM d, yyyy",
  "d MMMM yyyy",
  "yyyy-MM-dd HH:mm:ss",
  "MM/dd/yyyy HH:mm",
  "yyyy-MM-dd'T'HH:mm:ss",
  "yyyy-MM-dd'T'HH:mm:ss'Z'",
];

/**
 * Parse a date string into a Date object
 */
export function parseDate(
  dateStr: string | null | undefined,
  options: ParseDateOptions = {}
): Date | null {
  if (!dateStr || typeof dateStr !== "string") {
    return null;
  }

  const trimmed = dateStr.trim();
  if (!trimmed) {
    return null;
  }

  const {
    format: specifiedFormat,
    fiscalYearStart = 7, // July
    allowPartial = false,
    allowExcelSerial = false,
  } = options;

  // Handle Excel serial dates
  if (allowExcelSerial && /^\d{5}$/.test(trimmed)) {
    const serial = parseInt(trimmed, 10);
    // Excel epoch is 1900-01-01, but there's a bug where Excel thinks 1900 was a leap year
    // Days since 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
    if (isValid(date)) {
      return date;
    }
  }

  // Handle fiscal year format (FY2024)
  const fyMatch = trimmed.match(/^FY(\d{4})$/i);
  if (fyMatch && fyMatch[1]) {
    const year = parseInt(fyMatch[1], 10);
    // FY2024 starts July 1, 2023 (if fiscalYearStart is July)
    return new Date(year - 1, fiscalYearStart - 1, 1);
  }

  // Handle "Class of YYYY" format
  const classMatch = trimmed.match(/^class\s+of\s+(\d{4})$/i);
  if (classMatch && classMatch[1]) {
    return new Date(parseInt(classMatch[1], 10), 4, 1); // May 1 of graduation year
  }

  // Handle partial dates (year only)
  if (allowPartial && /^\d{4}$/.test(trimmed)) {
    return new Date(parseInt(trimmed, 10), 0, 1);
  }

  // Handle partial dates (month and year)
  if (allowPartial) {
    const partialResult = chrono.parseDate(trimmed);
    if (partialResult) {
      return partialResult;
    }
  }

  // Try specified format first
  if (specifiedFormat) {
    const dateFnsFormat = convertToDateFnsFormat(specifiedFormat);
    const parsed = parse(trimmed, dateFnsFormat, new Date());
    if (isValid(parsed) && !isImpossibleDate(parsed)) {
      return parsed;
    }
  }

  // Try standard formats
  for (const fmt of DATE_FNS_FORMATS) {
    try {
      const parsed = parse(trimmed, fmt, new Date());
      if (isValid(parsed) && !isImpossibleDate(parsed)) {
        // Additional validation for 2-digit years
        if (fmt.includes("yy") && !fmt.includes("yyyy")) {
          const year = parsed.getFullYear();
          // Adjust 2-digit year interpretation
          if (year >= 2030) {
            parsed.setFullYear(year - 100);
          }
        }
        return parsed;
      }
    } catch {
      // Continue to next format
    }
  }

  // Try chrono for natural language parsing
  const chronoResult = chrono.parseDate(trimmed);
  if (chronoResult && isValid(chronoResult) && !isImpossibleDate(chronoResult)) {
    return chronoResult;
  }

  return null;
}

/**
 * Check if a date is impossible (like Feb 30)
 */
function isImpossibleDate(date: Date): boolean {
  // Check if the date is within reasonable bounds
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) {
    return true;
  }

  // Check if date-fns parsed it as a valid date that actually makes sense
  return !isValid(date);
}

/**
 * Convert common format strings to date-fns format
 */
function convertToDateFnsFormat(format: string): string {
  return format
    .replace(/YYYY/g, "yyyy")
    .replace(/DD/g, "dd")
    .replace(/D(?!e)/g, "d") // Don't replace D in Dec, etc
    .replace(/MMMM/g, "MMMM")
    .replace(/MMM/g, "MMM")
    .replace(/MM/g, "MM")
    .replace(/M(?!a|o)/g, "M"); // Don't replace M in Mar, May, Mon
}

/**
 * Detect the date format from a sample of date strings
 */
export function detectDateFormat(samples: string[]): DateFormatResult {
  if (!samples || samples.length === 0) {
    return { format: null, confidence: 0, ambiguous: false };
  }

  const formatCounts: Record<string, number> = {};
  const formatConfidence: Record<string, number[]> = {};
  let hasAmbiguous = false;

  for (const sample of samples) {
    if (!sample || !sample.trim()) continue;

    const detectedFormat = detectSingleDateFormat(sample.trim());
    if (detectedFormat) {
      const fmt = detectedFormat.format;
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
      if (!formatConfidence[fmt]) {
        formatConfidence[fmt] = [];
      }
      formatConfidence[fmt]!.push(detectedFormat.confidence);

      if (detectedFormat.ambiguous) {
        hasAmbiguous = true;
      }
    }
  }

  // Find most common format
  let bestFormat: string | null = null;
  let bestCount = 0;

  for (const [fmt, count] of Object.entries(formatCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestFormat = fmt;
    }
  }

  if (!bestFormat) {
    return { format: null, confidence: 0, ambiguous: false };
  }

  // Calculate overall confidence
  const successRate = bestCount / samples.filter((s) => s?.trim()).length;
  const confidenceArr = formatConfidence[bestFormat] ?? [];
  const avgConfidence =
    confidenceArr.reduce((a, b) => a + b, 0) / confidenceArr.length;
  const confidence = successRate * avgConfidence;

  return {
    format: bestFormat,
    confidence,
    ambiguous: hasAmbiguous,
  };
}

/**
 * Detect format of a single date string
 */
function detectSingleDateFormat(dateStr: string): {
  format: string;
  confidence: number;
  ambiguous: boolean;
} | null {
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return {
      format: dateStr.includes("T") ? "YYYY-MM-DDTHH:mm:ss" : "YYYY-MM-DD",
      confidence: 1.0,
      ambiguous: false,
    };
  }

  // Natural language format
  if (/^[A-Za-z]+\s+\d{1,2},?\s+\d{4}$/.test(dateStr)) {
    return { format: "MMMM D, YYYY", confidence: 0.95, ambiguous: false };
  }

  // Day month year format (15 January 2024)
  if (/^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(dateStr)) {
    return { format: "D MMMM YYYY", confidence: 0.95, ambiguous: false };
  }

  // Day-month-year with abbreviation (15-Jan-2024)
  if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
    return { format: "D-MMM-YYYY", confidence: 0.95, ambiguous: false };
  }

  // Slash-delimited formats
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const first = slashMatch[1] ?? "";
    const second = slashMatch[2] ?? "";
    const year = slashMatch[3] ?? "";
    const firstNum = parseInt(first, 10);
    const secondNum = parseInt(second, 10);

    // Determine if it's US (MM/DD) or European (DD/MM)
    if (firstNum > 12 && secondNum <= 12) {
      // First is day (European format)
      return {
        format: year.length === 4 ? "DD/MM/YYYY" : "DD/MM/YY",
        confidence: 0.95,
        ambiguous: false,
      };
    } else if (firstNum <= 12 && secondNum > 12) {
      // Second is day (US format, uncommon but valid like 01/25/2024)
      return {
        format: year.length === 4 ? "MM/DD/YYYY" : "MM/DD/YY",
        confidence: 0.95,
        ambiguous: false,
      };
    } else if (firstNum <= 12 && secondNum <= 12) {
      // Ambiguous - could be either
      // Default to US format but mark as ambiguous
      return {
        format: year.length === 4 ? "MM/DD/YYYY" : "MM/DD/YY",
        confidence: 0.6,
        ambiguous: true,
      };
    }
  }

  // Try chrono
  const chronoResult = chrono.parse(dateStr);
  if (chronoResult.length > 0) {
    return { format: "chrono", confidence: 0.7, ambiguous: false };
  }

  return null;
}

/**
 * Format a date to a string
 */
export function formatDate(date: Date, formatStr: string): string {
  if (!date || !isValid(date)) {
    return "";
  }

  const dateFnsFormat = convertToDateFnsFormat(formatStr);
  return format(date, dateFnsFormat);
}

/**
 * Check if a date is valid
 */
export function isValidDate(
  date: Date | null | undefined,
  options: ValidateDateOptions = {}
): boolean {
  if (!date || !(date instanceof Date) || !isValid(date)) {
    return false;
  }

  const { min, max } = options;

  if (min && date < min) {
    return false;
  }

  if (max && date > max) {
    return false;
  }

  return true;
}

/**
 * Normalize a date string to a consistent Date object (start of day, UTC)
 */
export function normalizeDate(dateStr: string): Date | null {
  const date = parseDate(dateStr);
  if (!date) {
    return null;
  }

  return startOfDay(date);
}

/**
 * Parse a date range string (relative or absolute)
 */
export function parseDateRange(
  rangeStr: string,
  options: ParseDateRangeOptions = {}
): DateRangeResult {
  const now = new Date();
  const { fiscalYearStart = 7 } = options;

  // Relative ranges
  switch (rangeStr.toLowerCase()) {
    case "last_30_days":
      return {
        start: subDays(now, 30),
        end: now,
      };
    case "last_90_days":
      return {
        start: subDays(now, 90),
        end: now,
      };
    case "last_6_months":
      return {
        start: subMonths(now, 6),
        end: now,
      };
    case "last_year":
      return {
        start: subYears(now, 1),
        end: now,
      };
    case "last_fiscal_year": {
      // Calculate last fiscal year
      const currentMonth = now.getMonth() + 1; // 1-indexed
      let fyStartYear = now.getFullYear();

      if (currentMonth < fiscalYearStart) {
        fyStartYear -= 2;
      } else {
        fyStartYear -= 1;
      }

      const fyStart = new Date(fyStartYear, fiscalYearStart - 1, 1);
      const fyEnd = new Date(fyStartYear + 1, fiscalYearStart - 1, 0); // Last day of previous month

      return { start: fyStart, end: fyEnd };
    }
    case "current_fiscal_year": {
      const currentMonth = now.getMonth() + 1;
      let fyStartYear = now.getFullYear();

      if (currentMonth < fiscalYearStart) {
        fyStartYear -= 1;
      }

      const fyStart = new Date(fyStartYear, fiscalYearStart - 1, 1);

      return { start: fyStart, end: now };
    }
  }

  // Absolute range (2024-01-01..2024-12-31)
  const rangeMatch = rangeStr.match(/^(.+)\.\.(.+)$/);
  if (rangeMatch) {
    const start = parseDate(rangeMatch[1]);
    const end = parseDate(rangeMatch[2]);

    if (start && end) {
      return { start, end };
    }
  }

  // Default to last year
  return {
    start: subYears(now, 1),
    end: now,
  };
}

/**
 * Get the first valid date from a sample of strings
 */
export function getDateFromSample(samples: string[]): Date | null {
  for (const sample of samples) {
    const date = parseDate(sample);
    if (date) {
      return date;
    }
  }
  return null;
}

/**
 * Calculate months since a date
 */
export function monthsSince(date: Date | null): number | null {
  if (!date || !isValid(date)) {
    return null;
  }
  return differenceInMonths(new Date(), date);
}

/**
 * Check if a date is within a fiscal year
 */
export function isInFiscalYear(
  date: Date,
  fiscalYear: number,
  fiscalYearStart: number = 7
): boolean {
  const fyStart = new Date(fiscalYear - 1, fiscalYearStart - 1, 1);
  const fyEnd = new Date(fiscalYear, fiscalYearStart - 1, 0);

  return date >= fyStart && date <= fyEnd;
}

/**
 * Get fiscal year for a date
 */
export function getFiscalYear(date: Date, fiscalYearStart: number = 7): number {
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();

  if (month >= fiscalYearStart) {
    return year + 1;
  }
  return year;
}
