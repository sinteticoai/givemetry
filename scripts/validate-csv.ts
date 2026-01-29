#!/usr/bin/env tsx
/**
 * CSV Validation Script for GiveMetry Sample Data
 *
 * Validates CSV files against the GiveMetry schema before import.
 * Supports both the three-file format and combined format.
 *
 * Usage:
 *   pnpm tsx scripts/validate-csv.ts <constituents.csv> [gifts.csv] [contacts.csv]
 *   pnpm tsx scripts/validate-csv.ts --combined <combined.csv>
 *
 * Examples:
 *   pnpm tsx scripts/validate-csv.ts docs/data/lakewood-constituents.csv docs/data/lakewood-gifts.csv docs/data/lakewood-contacts.csv
 *   pnpm tsx scripts/validate-csv.ts --combined docs/data/lakewood-university-combined.csv
 */

import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import { z } from "zod";

// ============================================
// Configuration
// ============================================

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

const MAX_ERRORS_PER_TYPE = 5; // Show first N errors of each type

// ============================================
// Validation Schemas (matching app schemas)
// ============================================

// Helper functions
function parseAmount(value: string | null | undefined): number | null {
  if (!value || typeof value !== "string") return null;
  const cleaned = value.replace(/[$,\s]/g, "").trim();
  if (!cleaned) return null;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function parseBoolean(value: string | boolean | null | undefined): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  const lower = value.toLowerCase().trim();
  if (["true", "yes", "1", "y", "t", "on"].includes(lower)) return true;
  if (["false", "no", "0", "n", "f", "off", ""].includes(lower)) return false;
  return null;
}

function parseYear(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}$/.test(trimmed)) {
    const year = parseInt(trimmed, 10);
    if (year >= 1900 && year <= 2100) return year;
  }
  return null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date;
  }

  // MM/DD/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const date = new Date(parseInt(usMatch[3]!), parseInt(usMatch[1]!) - 1, parseInt(usMatch[2]!));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return EMAIL_REGEX.test(trimmed) ? trimmed : null;
}

// Constituent schema
const constituentSchema = z.object({
  constituent_id: z.string().min(1, "constituent_id is required"),
  last_name: z.string().min(1, "last_name is required"),
  first_name: z.string().optional().nullable(),
  middle_name: z.string().optional().nullable(),
  prefix: z.string().optional().nullable(),
  suffix: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  constituent_type: z.string().optional().nullable(),
  class_year: z.string().optional().nullable(),
  school_college: z.string().optional().nullable(),
  estimated_capacity: z.string().optional().nullable(),
  capacity_source: z.string().optional().nullable(),
  assigned_officer: z.string().optional().nullable(),
  assigned_officer_id: z.string().optional().nullable(),
  portfolio_tier: z.string().optional().nullable(),
});

// Gift schema - accepts both 'amount'/'gift_amount' and 'gift_date'/'date' naming
const giftSchema = z.object({
  gift_id: z.string().optional().nullable(),
  constituent_id: z.string().min(1, "constituent_id is required"),
  // Accept either 'amount' or 'gift_amount'
  amount: z.string().optional().nullable(),
  gift_amount: z.string().optional().nullable(),
  // Accept either 'gift_date' or 'date'
  gift_date: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  gift_type: z.string().optional().nullable(),
  fund_name: z.string().optional().nullable(),
  fund_code: z.string().optional().nullable(),
  campaign: z.string().optional().nullable(),
  appeal: z.string().optional().nullable(),
  recognition_amount: z.string().optional().nullable(),
  is_anonymous: z.string().optional().nullable(),
  is_matching: z.string().optional().nullable(),
  matching_company: z.string().optional().nullable(),
  tribute_type: z.string().optional().nullable(),
  tribute_name: z.string().optional().nullable(),
}).refine((data) => {
  // Check that at least one amount field is valid (allow negative for refunds)
  const amt = data.amount || data.gift_amount;
  if (!amt || amt.trim() === "") return true; // Allow empty for non-donors
  const parsed = parseAmount(amt);
  return parsed !== null; // Allow negative amounts (refunds/adjustments)
}, { message: "amount must be a valid number", path: ["amount"] })
.refine((data) => {
  // Check that at least one date field is valid
  const dt = data.gift_date || data.date;
  if (!dt || dt.trim() === "") return true;
  return parseDate(dt) !== null;
}, { message: "gift_date must be a valid date (YYYY-MM-DD)", path: ["gift_date"] });

// Contact schema
const contactSchema = z.object({
  contact_id: z.string().optional().nullable(),
  constituent_id: z.string().min(1, "constituent_id is required"),
  contact_date: z.string().refine((val) => {
    if (!val || val.trim() === "") return true;
    return parseDate(val) !== null;
  }, "contact_date must be a valid date (YYYY-MM-DD)"),
  contact_type: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  next_action: z.string().optional().nullable(),
  next_action_date: z.string().optional().nullable(),
});

// Combined format schema (for the existing lakewood-university-combined.csv)
const combinedSchema = z.object({
  constituent_id: z.string().min(1, "constituent_id is required"),
  last_name: z.string().min(1, "last_name is required"),
  // All other fields optional
}).passthrough();

// ============================================
// Types
// ============================================

interface ValidationIssue {
  row: number;
  field: string;
  value: string;
  message: string;
  severity: "error" | "warning";
}

interface ValidationResult {
  file: string;
  type: "constituents" | "gifts" | "contacts" | "combined";
  totalRows: number;
  validRows: number;
  invalidRows: number;
  issues: ValidationIssue[];
  stats: Record<string, number>;
}

interface CrossFileValidation {
  orphanedGifts: string[];
  orphanedContacts: string[];
  constituentIds: Set<string>;
  giftConstituentIds: Set<string>;
  contactConstituentIds: Set<string>;
}

// ============================================
// CSV Parsing
// ============================================

function parseCSVFile(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  if (result.errors.length > 0) {
    console.error(`${COLORS.red}CSV parsing errors:${COLORS.reset}`);
    result.errors.slice(0, 5).forEach((err) => {
      console.error(`  Row ${err.row}: ${err.message}`);
    });
  }

  return result.data;
}

// ============================================
// Validation Functions
// ============================================

function validateConstituents(rows: Record<string, string>[], filePath: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  const stats: Record<string, number> = {
    total: rows.length,
    withEmail: 0,
    withPhone: 0,
    withAddress: 0,
    alumni: 0,
    parent: 0,
    friend: 0,
    corporation: 0,
    foundation: 0,
    assigned: 0,
    unassigned: 0,
    duplicateIds: 0,
  };

  let validRows = 0;

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed + header
    const result = constituentSchema.safeParse(row);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        issues.push({
          row: rowNum,
          field: issue.path.join("."),
          value: String(row[issue.path[0] as string] ?? ""),
          message: issue.message,
          severity: "error",
        });
      });
    } else {
      validRows++;
    }

    // Check for duplicates
    const id = row.constituent_id;
    if (id) {
      if (seen.has(id)) {
        stats.duplicateIds++;
        issues.push({
          row: rowNum,
          field: "constituent_id",
          value: id,
          message: `Duplicate constituent_id: ${id}`,
          severity: "error",
        });
      }
      seen.add(id);
    }

    // Collect stats
    if (row.email && normalizeEmail(row.email)) stats.withEmail++;
    if (row.phone && row.phone.trim()) stats.withPhone++;
    if (row.address_line1 && row.address_line1.trim()) stats.withAddress++;

    const type = row.constituent_type?.toLowerCase();
    if (type === "alumni") stats.alumni++;
    else if (type === "parent") stats.parent++;
    else if (type === "friend") stats.friend++;
    else if (type === "corporation") stats.corporation++;
    else if (type === "foundation") stats.foundation++;

    if (row.assigned_officer || row.assigned_officer_id) stats.assigned++;
    else stats.unassigned++;

    // Warnings for recommended fields
    if (!row.email || !normalizeEmail(row.email)) {
      issues.push({
        row: rowNum,
        field: "email",
        value: row.email ?? "",
        message: "Missing or invalid email",
        severity: "warning",
      });
    }
  });

  return {
    file: filePath,
    type: "constituents",
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    issues,
    stats,
  };
}

function validateGifts(rows: Record<string, string>[], filePath: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const stats: Record<string, number> = {
    total: rows.length,
    totalAmount: 0,
    avgAmount: 0,
    minAmount: Infinity,
    maxAmount: 0,
    uniqueConstituents: 0,
    withCampaign: 0,
    withAppeal: 0,
    anonymous: 0,
    matching: 0,
  };

  const constituentIds = new Set<string>();
  let validRows = 0;

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;

    // Skip empty gift rows (in combined format) - check both column name variants
    const hasAmount = row.amount || row.gift_amount;
    const hasDate = row.gift_date || row.date;
    if (!hasAmount && !row.gift_id && !hasDate) {
      return;
    }

    const result = giftSchema.safeParse(row);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        issues.push({
          row: rowNum,
          field: issue.path.join("."),
          value: String(row[issue.path[0] as string] ?? ""),
          message: issue.message,
          severity: "error",
        });
      });
    } else {
      validRows++;
    }

    // Collect stats - check both column name variants
    const amountStr = row.amount || row.gift_amount;
    const amount = parseAmount(amountStr);
    if (amount !== null && amount > 0) {
      stats.totalAmount += amount;
      stats.minAmount = Math.min(stats.minAmount, amount);
      stats.maxAmount = Math.max(stats.maxAmount, amount);
    }

    if (row.constituent_id) constituentIds.add(row.constituent_id);
    if (row.campaign && row.campaign.trim()) stats.withCampaign++;
    if (row.appeal && row.appeal.trim()) stats.withAppeal++;
    if (parseBoolean(row.is_anonymous)) stats.anonymous++;
    if (parseBoolean(row.is_matching)) stats.matching++;
  });

  stats.uniqueConstituents = constituentIds.size;
  stats.avgAmount = validRows > 0 ? stats.totalAmount / validRows : 0;
  if (stats.minAmount === Infinity) stats.minAmount = 0;

  return {
    file: filePath,
    type: "gifts",
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    issues,
    stats,
  };
}

function validateContacts(rows: Record<string, string>[], filePath: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const stats: Record<string, number> = {
    total: rows.length,
    uniqueConstituents: 0,
    meeting: 0,
    call: 0,
    email: 0,
    event: 0,
    visit: 0,
    other: 0,
    withOutcome: 0,
    withNextAction: 0,
  };

  const constituentIds = new Set<string>();
  let validRows = 0;

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;

    // Skip empty contact rows
    if (!row.contact_date && !row.contact_type && !row.contact_id) {
      return;
    }

    const result = contactSchema.safeParse(row);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        issues.push({
          row: rowNum,
          field: issue.path.join("."),
          value: String(row[issue.path[0] as string] ?? ""),
          message: issue.message,
          severity: "error",
        });
      });
    } else {
      validRows++;
    }

    // Collect stats
    if (row.constituent_id) constituentIds.add(row.constituent_id);

    const type = row.contact_type?.toLowerCase();
    if (type === "meeting") stats.meeting++;
    else if (type === "call") stats.call++;
    else if (type === "email") stats.email++;
    else if (type === "event") stats.event++;
    else if (type === "visit") stats.visit++;
    else stats.other++;

    if (row.outcome && row.outcome.trim()) stats.withOutcome++;
    if (row.next_action && row.next_action.trim()) stats.withNextAction++;
  });

  stats.uniqueConstituents = constituentIds.size;

  return {
    file: filePath,
    type: "contacts",
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    issues,
    stats,
  };
}

function validateCombined(rows: Record<string, string>[], filePath: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const constituentIds = new Set<string>();
  const giftIds = new Set<string>();

  const stats: Record<string, number> = {
    totalRows: rows.length,
    uniqueConstituents: 0,
    uniqueGifts: 0,
    rowsWithGifts: 0,
    rowsWithContacts: 0,
    totalGiftAmount: 0,
  };

  let validRows = 0;

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const result = combinedSchema.safeParse(row);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        issues.push({
          row: rowNum,
          field: issue.path.join("."),
          value: String(row[issue.path[0] as string] ?? ""),
          message: issue.message,
          severity: "error",
        });
      });
    } else {
      validRows++;
    }

    // Track unique IDs
    if (row.constituent_id) constituentIds.add(row.constituent_id);
    if (row.gift_id) {
      giftIds.add(row.gift_id);
      stats.rowsWithGifts++;
      const amount = parseAmount(row.gift_amount);
      if (amount) stats.totalGiftAmount += amount;
    }
    if (row.last_contact_date && row.last_contact_date.trim()) {
      stats.rowsWithContacts++;
    }

    // Check for data quality issues specific to combined format
    if (row.assigned_officer && !row.assigned_officer_id) {
      issues.push({
        row: rowNum,
        field: "assigned_officer",
        value: row.assigned_officer,
        message: "assigned_officer is a name, not an ID. Import will need manual officer mapping.",
        severity: "warning",
      });
    }
  });

  stats.uniqueConstituents = constituentIds.size;
  stats.uniqueGifts = giftIds.size;

  return {
    file: filePath,
    type: "combined",
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    issues,
    stats,
  };
}

function validateCrossFile(
  constituents: Record<string, string>[],
  gifts: Record<string, string>[],
  contacts: Record<string, string>[]
): CrossFileValidation {
  const constituentIds = new Set(constituents.map((r) => r.constituent_id).filter(Boolean));
  const giftConstituentIds = new Set(
    gifts.filter((r) => r.gift_id || r.gift_amount || r.amount).map((r) => r.constituent_id).filter(Boolean)
  );
  const contactConstituentIds = new Set(
    contacts.filter((r) => r.contact_date || r.contact_type).map((r) => r.constituent_id).filter(Boolean)
  );

  const orphanedGifts = [...giftConstituentIds].filter((id) => !constituentIds.has(id));
  const orphanedContacts = [...contactConstituentIds].filter((id) => !constituentIds.has(id));

  return {
    orphanedGifts,
    orphanedContacts,
    constituentIds,
    giftConstituentIds,
    contactConstituentIds,
  };
}

// ============================================
// Reporting
// ============================================

function printHeader(text: string) {
  console.log();
  console.log(`${COLORS.bold}${COLORS.cyan}${"═".repeat(60)}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}  ${text}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}${"═".repeat(60)}${COLORS.reset}`);
}

function printResult(result: ValidationResult) {
  const statusColor = result.invalidRows === 0 ? COLORS.green : COLORS.yellow;
  const statusIcon = result.invalidRows === 0 ? "✓" : "⚠";

  console.log();
  console.log(`${COLORS.bold}${result.type.toUpperCase()}${COLORS.reset} - ${result.file}`);
  console.log(`${COLORS.dim}${"─".repeat(50)}${COLORS.reset}`);
  console.log(`  ${statusColor}${statusIcon}${COLORS.reset} Total rows: ${result.totalRows}`);
  console.log(`  ${COLORS.green}✓${COLORS.reset} Valid rows: ${result.validRows}`);

  if (result.invalidRows > 0) {
    console.log(`  ${COLORS.red}✗${COLORS.reset} Invalid rows: ${result.invalidRows}`);
  }

  // Print stats
  console.log();
  console.log(`  ${COLORS.bold}Statistics:${COLORS.reset}`);
  Object.entries(result.stats).forEach(([key, value]) => {
    if (key === "totalAmount" || key === "avgAmount" || key === "minAmount" || key === "maxAmount") {
      console.log(`    ${key}: $${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    } else {
      console.log(`    ${key}: ${value.toLocaleString()}`);
    }
  });

  // Print errors (limited)
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");

  if (errors.length > 0) {
    console.log();
    console.log(`  ${COLORS.red}${COLORS.bold}Errors (${errors.length} total):${COLORS.reset}`);

    // Group by field
    const byField = new Map<string, ValidationIssue[]>();
    errors.forEach((e) => {
      const arr = byField.get(e.field) ?? [];
      arr.push(e);
      byField.set(e.field, arr);
    });

    byField.forEach((fieldErrors, field) => {
      console.log(`    ${COLORS.red}${field}:${COLORS.reset} ${fieldErrors.length} error(s)`);
      fieldErrors.slice(0, MAX_ERRORS_PER_TYPE).forEach((e) => {
        console.log(`      Row ${e.row}: ${e.message} ${COLORS.dim}(value: "${e.value.slice(0, 30)}")${COLORS.reset}`);
      });
      if (fieldErrors.length > MAX_ERRORS_PER_TYPE) {
        console.log(`      ${COLORS.dim}... and ${fieldErrors.length - MAX_ERRORS_PER_TYPE} more${COLORS.reset}`);
      }
    });
  }

  if (warnings.length > 0 && warnings.length <= 20) {
    console.log();
    console.log(`  ${COLORS.yellow}${COLORS.bold}Warnings (${warnings.length} total):${COLORS.reset}`);

    const byField = new Map<string, number>();
    warnings.forEach((w) => {
      byField.set(w.field, (byField.get(w.field) ?? 0) + 1);
    });

    byField.forEach((count, field) => {
      console.log(`    ${COLORS.yellow}${field}:${COLORS.reset} ${count} warning(s)`);
    });
  } else if (warnings.length > 20) {
    console.log();
    console.log(`  ${COLORS.yellow}Warnings:${COLORS.reset} ${warnings.length} total (suppressed for brevity)`);
  }
}

function printCrossFileValidation(cross: CrossFileValidation) {
  console.log();
  console.log(`${COLORS.bold}CROSS-FILE VALIDATION${COLORS.reset}`);
  console.log(`${COLORS.dim}${"─".repeat(50)}${COLORS.reset}`);

  console.log(`  Constituent IDs in constituents file: ${cross.constituentIds.size}`);
  console.log(`  Constituent IDs referenced in gifts: ${cross.giftConstituentIds.size}`);
  console.log(`  Constituent IDs referenced in contacts: ${cross.contactConstituentIds.size}`);

  if (cross.orphanedGifts.length > 0) {
    console.log();
    console.log(`  ${COLORS.red}✗ Orphaned gift records:${COLORS.reset} ${cross.orphanedGifts.length}`);
    console.log(`    ${COLORS.dim}These constituent IDs in gifts.csv don't exist in constituents.csv:${COLORS.reset}`);
    cross.orphanedGifts.slice(0, 10).forEach((id) => {
      console.log(`      - ${id}`);
    });
    if (cross.orphanedGifts.length > 10) {
      console.log(`      ${COLORS.dim}... and ${cross.orphanedGifts.length - 10} more${COLORS.reset}`);
    }
  } else {
    console.log(`  ${COLORS.green}✓${COLORS.reset} All gift records reference valid constituents`);
  }

  if (cross.orphanedContacts.length > 0) {
    console.log();
    console.log(`  ${COLORS.red}✗ Orphaned contact records:${COLORS.reset} ${cross.orphanedContacts.length}`);
    console.log(`    ${COLORS.dim}These constituent IDs in contacts.csv don't exist in constituents.csv:${COLORS.reset}`);
    cross.orphanedContacts.slice(0, 10).forEach((id) => {
      console.log(`      - ${id}`);
    });
    if (cross.orphanedContacts.length > 10) {
      console.log(`      ${COLORS.dim}... and ${cross.orphanedContacts.length - 10} more${COLORS.reset}`);
    }
  } else {
    console.log(`  ${COLORS.green}✓${COLORS.reset} All contact records reference valid constituents`);
  }
}

function printSummary(results: ValidationResult[], cross?: CrossFileValidation) {
  printHeader("VALIDATION SUMMARY");

  const totalErrors = results.reduce((sum, r) => sum + r.issues.filter((i) => i.severity === "error").length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.issues.filter((i) => i.severity === "warning").length, 0);
  const orphanErrors = cross ? cross.orphanedGifts.length + cross.orphanedContacts.length : 0;

  console.log();
  if (totalErrors === 0 && orphanErrors === 0) {
    console.log(`  ${COLORS.green}${COLORS.bold}✓ ALL VALIDATIONS PASSED${COLORS.reset}`);
    console.log(`  ${COLORS.green}Files are ready for import into GiveMetry.${COLORS.reset}`);
  } else {
    console.log(`  ${COLORS.red}${COLORS.bold}✗ VALIDATION FAILED${COLORS.reset}`);
    console.log(`  ${COLORS.red}${totalErrors + orphanErrors} error(s) must be fixed before import.${COLORS.reset}`);
  }

  if (totalWarnings > 0) {
    console.log(`  ${COLORS.yellow}${totalWarnings} warning(s) - review recommended but not blocking.${COLORS.reset}`);
  }

  console.log();
  console.log(`${COLORS.dim}${"─".repeat(60)}${COLORS.reset}`);
  console.log();
}

// ============================================
// Main
// ============================================

function printUsage() {
  console.log(`
${COLORS.bold}GiveMetry CSV Validation Script${COLORS.reset}

${COLORS.bold}Usage:${COLORS.reset}
  pnpm tsx scripts/validate-csv.ts <constituents.csv> [gifts.csv] [contacts.csv]
  pnpm tsx scripts/validate-csv.ts --combined <combined.csv>

${COLORS.bold}Examples:${COLORS.reset}
  ${COLORS.dim}# Validate three separate files:${COLORS.reset}
  pnpm tsx scripts/validate-csv.ts \\
    docs/data/lakewood-constituents.csv \\
    docs/data/lakewood-gifts.csv \\
    docs/data/lakewood-contacts.csv

  ${COLORS.dim}# Validate a combined/denormalized file:${COLORS.reset}
  pnpm tsx scripts/validate-csv.ts --combined docs/data/lakewood-university-combined.csv

${COLORS.bold}Options:${COLORS.reset}
  --combined    Treat the file as a combined format (constituent + gift + contact per row)
  --help, -h    Show this help message
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const isCombined = args.includes("--combined");
  const files = args.filter((a) => !a.startsWith("--"));

  if (files.length === 0) {
    console.error(`${COLORS.red}Error: No CSV files specified.${COLORS.reset}`);
    printUsage();
    process.exit(1);
  }

  // Check files exist
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`${COLORS.red}Error: File not found: ${file}${COLORS.reset}`);
      process.exit(1);
    }
  }

  printHeader("GiveMetry CSV Validation");

  const results: ValidationResult[] = [];

  if (isCombined) {
    // Combined format validation
    const filePath = files[0]!;
    console.log(`\n${COLORS.dim}Parsing ${filePath}...${COLORS.reset}`);
    const rows = parseCSVFile(filePath);

    // Validate as combined
    const result = validateCombined(rows, filePath);
    results.push(result);
    printResult(result);

    // Also run constituent and gift validation on the same data
    const constituentResult = validateConstituents(rows, filePath);
    results.push(constituentResult);
    printResult(constituentResult);

    const giftResult = validateGifts(rows, filePath);
    results.push(giftResult);
    printResult(giftResult);

    printSummary(results);
  } else {
    // Three-file format validation
    const [constituentsFile, giftsFile, contactsFile] = files;

    if (!constituentsFile) {
      console.error(`${COLORS.red}Error: At least constituents file is required.${COLORS.reset}`);
      process.exit(1);
    }

    // Parse and validate constituents
    console.log(`\n${COLORS.dim}Parsing ${constituentsFile}...${COLORS.reset}`);
    const constituents = parseCSVFile(constituentsFile);
    const constituentResult = validateConstituents(constituents, constituentsFile);
    results.push(constituentResult);
    printResult(constituentResult);

    let gifts: Record<string, string>[] = [];
    let contacts: Record<string, string>[] = [];

    // Parse and validate gifts if provided
    if (giftsFile) {
      console.log(`\n${COLORS.dim}Parsing ${giftsFile}...${COLORS.reset}`);
      gifts = parseCSVFile(giftsFile);
      const giftResult = validateGifts(gifts, giftsFile);
      results.push(giftResult);
      printResult(giftResult);
    }

    // Parse and validate contacts if provided
    if (contactsFile) {
      console.log(`\n${COLORS.dim}Parsing ${contactsFile}...${COLORS.reset}`);
      contacts = parseCSVFile(contactsFile);
      const contactResult = validateContacts(contacts, contactsFile);
      results.push(contactResult);
      printResult(contactResult);
    }

    // Cross-file validation
    if (giftsFile || contactsFile) {
      const cross = validateCrossFile(constituents, gifts, contacts);
      printCrossFileValidation(cross);
      printSummary(results, cross);
    } else {
      printSummary(results);
    }
  }

  // Exit with error code if validation failed
  const hasErrors = results.some((r) => r.issues.some((i) => i.severity === "error"));
  process.exit(hasErrors ? 1 : 0);
}

main().catch((err) => {
  console.error(`${COLORS.red}Unexpected error:${COLORS.reset}`, err);
  process.exit(1);
});
