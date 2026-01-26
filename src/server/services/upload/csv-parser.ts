// T080: CSV parser service with Papa Parse streaming
import Papa from "papaparse";

export interface ParseOptions {
  skipEmptyLines?: boolean;
  trimValues?: boolean;
  delimiter?: string;
  header?: boolean;
}

export interface StreamOptions extends ParseOptions {
  chunkSize?: number;
  onChunk?: (data: Record<string, string>[], abort: () => void) => void;
  onProgress?: (progress: number) => void;
}

export interface ParseError {
  type: string;
  code: string;
  message: string;
  row?: number;
}

export interface ParseResult {
  data: Record<string, string>[];
  meta: {
    fields?: string[];
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
  };
  errors: ParseError[];
}

export interface ValidationError {
  type: string;
  message: string;
  row?: number;
  column?: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
  row?: number;
  column?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationOptions {
  requiredColumns?: string[];
  validateDataTypes?: Record<string, "date" | "number" | "string">;
}

interface RowCountOptions {
  includeHeader?: boolean;
}

interface DetectColumnsOptions {
  normalize?: boolean;
  hasHeader?: boolean;
}

/**
 * Parse a CSV string into structured data
 */
export async function parseCSV(
  csv: string,
  options: ParseOptions = {}
): Promise<ParseResult> {
  return new Promise((resolve) => {
    const {
      skipEmptyLines = true,
      trimValues = true,
      delimiter,
      header = true,
    } = options;

    const result = Papa.parse(csv, {
      header,
      skipEmptyLines,
      delimiter: delimiter || undefined, // auto-detect if not specified
      transformHeader: trimValues ? (h: string) => h.trim() : undefined,
      transform: trimValues ? (value: string) => value.trim() : undefined,
    });

    const errors: ParseError[] = result.errors.map((err: Papa.ParseError) => ({
      type: err.type,
      code: err.code,
      message: err.message,
      row: err.row !== undefined ? err.row + 1 : undefined, // 1-indexed
    }));

    resolve({
      data: result.data as Record<string, string>[],
      meta: {
        fields: result.meta.fields,
        delimiter: result.meta.delimiter,
        linebreak: result.meta.linebreak,
        aborted: result.meta.aborted,
        truncated: result.meta.truncated,
      },
      errors,
    });
  });
}

/**
 * Parse CSV with streaming support for large files
 */
export async function parseCSVStream(
  csv: string,
  options: StreamOptions = {}
): Promise<void> {
  return new Promise((resolve) => {
    const {
      chunkSize = 1000,
      onChunk,
      onProgress,
      skipEmptyLines = true,
      trimValues = true,
    } = options;

    let buffer: Record<string, string>[] = [];
    let rowCount = 0;
    let aborted = false;
    const totalLines = csv.split("\n").length - 1; // Approximate

    const abort = () => {
      aborted = true;
    };

    Papa.parse(csv, {
      header: true,
      skipEmptyLines,
      transformHeader: trimValues ? (h: string) => h.trim() : undefined,
      transform: trimValues ? (value: string) => value.trim() : undefined,
      step: (results) => {
        if (aborted) return;

        buffer.push(results.data as Record<string, string>);
        rowCount++;

        if (buffer.length >= chunkSize) {
          onChunk?.(buffer, abort);
          buffer = [];

          if (onProgress && totalLines > 0) {
            const progress = Math.min(100, Math.round((rowCount / totalLines) * 100));
            onProgress(progress);
          }
        }
      },
      complete: () => {
        // Emit remaining buffer
        if (buffer.length > 0 && !aborted) {
          onChunk?.(buffer, abort);
        }
        onProgress?.(100);
        resolve();
      },
    });
  });
}

/**
 * Detect the delimiter used in a CSV string
 */
export function detectDelimiter(sample: string): string {
  const delimiters = [",", "\t", ";", "|"];
  const counts: Record<string, number> = {};

  for (const delimiter of delimiters) {
    counts[delimiter] = (sample.match(new RegExp(`\\${delimiter}`, "g")) || []).length;
  }

  // Find delimiter with highest count
  let maxCount = 0;
  let detected = ",";

  for (const [delimiter, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      detected = delimiter;
    }
  }

  return detected;
}

/**
 * Extract column headers from CSV
 */
export async function detectColumns(
  csv: string,
  options: DetectColumnsOptions = {}
): Promise<string[]> {
  const { normalize = false, hasHeader = true } = options;

  if (!hasHeader) {
    // Count columns from first row and generate names
    const lines = csv.split("\n");
    const firstLine = lines[0] ?? "";
    const delimiter = detectDelimiter(csv);
    const columnCount = firstLine.split(delimiter).length;
    return Array.from({ length: columnCount }, (_, i) => `column${i + 1}`);
  }

  const result = Papa.parse(csv, {
    header: true,
    preview: 1, // Only parse first row
  });

  let columns = result.meta.fields || [];

  // Handle duplicates
  const seen: Record<string, number> = {};
  columns = columns.map((col) => {
    const trimmed = col.trim();
    if (seen[trimmed]) {
      seen[trimmed]++;
      return `${trimmed}_${seen[trimmed]}`;
    }
    seen[trimmed] = 1;
    return trimmed;
  });

  if (normalize) {
    columns = columns.map(normalizeColumnName);
  }

  return columns;
}

/**
 * Normalize column name to camelCase
 */
function normalizeColumnName(name: string): string {
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
 * Count data rows (excluding header)
 */
export async function getRowCount(
  csv: string,
  options: RowCountOptions = {}
): Promise<number> {
  const { includeHeader = false } = options;

  if (!csv.trim()) {
    return 0;
  }

  const result = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const dataCount = result.data.length;

  if (includeHeader && dataCount > 0) {
    return dataCount + 1;
  }

  return dataCount;
}

/**
 * Validate CSV structure
 */
export async function validateCSVStructure(
  csv: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const { requiredColumns = [], validateDataTypes = {} } = options;
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for empty file
  if (!csv.trim()) {
    errors.push({
      type: "empty_file",
      message: "File is empty",
    });
    return { isValid: false, errors, warnings };
  }

  const result = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
  });

  // Check for no data rows
  if (result.data.length === 0) {
    errors.push({
      type: "no_data_rows",
      message: "File contains only headers with no data rows",
    });
    return { isValid: false, errors, warnings };
  }

  const columns = result.meta.fields || [];
  const data = result.data as Record<string, string>[];

  // Check required columns
  for (const required of requiredColumns) {
    if (!columns.includes(required)) {
      errors.push({
        type: "missing_required_column",
        message: `Required column "${required}" is missing`,
        column: required,
      });
    }
  }

  // Check column count consistency
  const expectedColumnCount = columns.length;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row) {
      const rowColumnCount = Object.keys(row).length;
      if (rowColumnCount !== expectedColumnCount) {
        errors.push({
          type: "inconsistent_columns",
          message: `Row ${i + 2} has ${rowColumnCount} columns, expected ${expectedColumnCount}`,
          row: i + 2, // 1-indexed, +1 for header
        });
      }
    }
  }

  // Validate data types
  for (const [column, type] of Object.entries(validateDataTypes)) {
    if (!columns.includes(column)) continue;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      const value = row[column];
      if (!value) continue;

      if (type === "date") {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          warnings.push({
            type: "invalid_date_format",
            message: `Invalid date format in row ${i + 2}: "${value}"`,
            row: i + 2,
            column,
          });
        }
      } else if (type === "number") {
        if (isNaN(parseFloat(value.replace(/[,$]/g, "")))) {
          warnings.push({
            type: "invalid_number_format",
            message: `Invalid number format in row ${i + 2}: "${value}"`,
            row: i + 2,
            column,
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get sample rows for preview
 */
export async function getSampleRows(
  csv: string,
  count: number = 5
): Promise<Record<string, string>[]> {
  const result = Papa.parse(csv, {
    header: true,
    preview: count,
    skipEmptyLines: true,
  });

  return result.data as Record<string, string>[];
}
