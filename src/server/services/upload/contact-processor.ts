// T086: Contact import processor
import type { PrismaClient, Prisma } from "@prisma/client";
import {
  contactImportSchema,
  type ContactImport,
  validateRow,
} from "@/lib/utils/validation";
import { applyFieldMapping, type FieldMapping } from "./field-mapper";
import { buildConstituentIdMap } from "./constituent-processor";

export interface ProcessingResult {
  created: number;
  updated: number;
  skipped: number;
  errors: ProcessingError[];
}

export interface ProcessingError {
  row: number;
  constituentExternalId?: string;
  field?: string;
  message: string;
}

export interface ProcessingOptions {
  onProgress?: (processed: number, total: number) => void;
  batchSize?: number;
  updateExisting?: boolean;
}

/**
 * Process contact rows from CSV
 */
export async function processContacts(
  prisma: PrismaClient,
  organizationId: string,
  rows: Record<string, string>[],
  mapping: FieldMapping,
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  const { onProgress, batchSize = 100, updateExisting = true } = options;

  const result: ProcessingResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // First, build constituent ID mapping for all referenced constituents
  const constituentExternalIds = new Set<string>();
  for (const row of rows) {
    const mapped = applyFieldMapping(row, mapping);
    if (mapped.constituentExternalId) {
      constituentExternalIds.add(mapped.constituentExternalId);
    }
  }

  const constituentIdMap = await buildConstituentIdMap(
    prisma,
    organizationId,
    Array.from(constituentExternalIds)
  );

  const total = rows.length;
  let processed = 0;

  // Process in batches
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchResults = await processBatch(
      prisma,
      organizationId,
      batch,
      mapping,
      constituentIdMap,
      i + 2, // Starting row number
      updateExisting
    );

    result.created += batchResults.created;
    result.updated += batchResults.updated;
    result.skipped += batchResults.skipped;
    result.errors.push(...batchResults.errors);

    processed += batch.length;
    onProgress?.(processed, total);
  }

  return result;
}

/**
 * Process a batch of contact rows
 */
async function processBatch(
  prisma: PrismaClient,
  organizationId: string,
  rows: Record<string, string>[],
  mapping: FieldMapping,
  constituentIdMap: Map<string, string>,
  startRow: number,
  _updateExisting: boolean
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Transform, resolve constituent IDs, and validate all rows
  const validRows: Array<{
    row: number;
    data: ContactImport;
    constituentId: string;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNumber = startRow + i;

    if (!rawRow) continue;
    // Apply field mapping
    const mappedRow = applyFieldMapping(rawRow, mapping) as Record<string, string>;

    // Resolve constituent ID
    const constituentExternalId = mappedRow.constituentExternalId;
    if (!constituentExternalId) {
      result.errors.push({
        row: rowNumber,
        field: "constituentExternalId",
        message: "Constituent ID is required",
      });
      result.skipped++;
      continue;
    }

    const constituentId = constituentIdMap.get(constituentExternalId);
    if (!constituentId) {
      result.errors.push({
        row: rowNumber,
        constituentExternalId,
        message: `Constituent not found: ${constituentExternalId}`,
      });
      result.skipped++;
      continue;
    }

    // Validate
    const validation = validateRow(mappedRow as Record<string, unknown>, contactImportSchema, rowNumber);

    if (validation.success && validation.data) {
      validRows.push({
        row: rowNumber,
        data: validation.data,
        constituentId,
      });
    } else {
      result.errors.push(
        ...validation.errors.map((err) => ({
          row: rowNumber,
          constituentExternalId,
          field: err.path,
          message: err.message,
        }))
      );
      result.skipped++;
    }
  }

  // Contacts don't have externalId in schema - always create new
  const toCreate: Array<{
    row: number;
    data: ContactImport;
    constituentId: string;
  }> = validRows;

  // Batch create new contacts
  if (toCreate.length > 0) {
    try {
      const createData = toCreate.map((r) =>
        buildCreateData(organizationId, r.constituentId, r.data)
      );

      await prisma.contact.createMany({
        data: createData,
        skipDuplicates: true,
      });

      result.created += toCreate.length;
    } catch {
      // If batch fails, try individual inserts
      for (const record of toCreate) {
        try {
          await prisma.contact.create({
            data: buildCreateData(
              organizationId,
              record.constituentId,
              record.data
            ),
          });
          result.created++;
        } catch (err) {
          result.errors.push({
            row: record.row,
            constituentExternalId: record.data.constituentExternalId,
            message: err instanceof Error ? err.message : "Unknown error",
          });
          result.skipped++;
        }
      }
    }
  }

  return result;
}

/**
 * Build Prisma create data from import data
 */
function buildCreateData(
  organizationId: string,
  constituentId: string,
  data: ContactImport
): Prisma.ContactCreateManyInput {
  return {
    organizationId,
    constituentId,
    contactDate: data.contactDate,
    contactType: data.contactType,
    subject: data.subject ?? null,
    notes: data.notes ?? null,
    outcome: data.outcome ?? null,
    nextAction: data.nextAction ?? null,
    nextActionDate: data.nextActionDate ?? null,
  };
}
