// T085: Gift import processor
import type { PrismaClient, Prisma } from "@prisma/client";
import {
  giftImportSchema,
  type GiftImport,
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
 * Process gift rows from CSV
 */
export async function processGifts(
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
 * Process a batch of gift rows
 */
async function processBatch(
  prisma: PrismaClient,
  organizationId: string,
  rows: Record<string, string>[],
  mapping: FieldMapping,
  constituentIdMap: Map<string, string>,
  startRow: number,
  updateExisting: boolean
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
    data: GiftImport;
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
    const validation = validateRow(mappedRow as Record<string, unknown>, giftImportSchema, rowNumber);

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

  // Batch lookup existing gifts by externalId (if provided)
  const externalIds = validRows
    .filter((r) => r.data.externalId)
    .map((r) => r.data.externalId!);

  const existing =
    externalIds.length > 0
      ? await prisma.gift.findMany({
          where: {
            organizationId,
            externalId: { in: externalIds },
          },
          select: {
            id: true,
            externalId: true,
          },
        })
      : [];

  const existingMap = new Map(
    existing.map((g) => [g.externalId, g.id])
  );

  // Separate creates and updates
  const toCreate: Array<{
    row: number;
    data: GiftImport;
    constituentId: string;
  }> = [];
  const toUpdate: Array<{
    row: number;
    id: string;
    data: GiftImport;
    constituentId: string;
  }> = [];

  for (const validRow of validRows) {
    const existingId = validRow.data.externalId
      ? existingMap.get(validRow.data.externalId)
      : null;

    if (existingId) {
      if (updateExisting) {
        toUpdate.push({ ...validRow, id: existingId });
      } else {
        result.skipped++;
      }
    } else {
      toCreate.push(validRow);
    }
  }

  // Batch create new gifts
  if (toCreate.length > 0) {
    try {
      const createData = toCreate.map((r) =>
        buildCreateData(organizationId, r.constituentId, r.data)
      );

      await prisma.gift.createMany({
        data: createData,
        skipDuplicates: true,
      });

      result.created += toCreate.length;
    } catch {
      // If batch fails, try individual inserts
      for (const record of toCreate) {
        try {
          await prisma.gift.create({
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

  // Batch update existing gifts
  if (toUpdate.length > 0) {
    try {
      await prisma.$transaction(
        toUpdate.map((record) =>
          prisma.gift.update({
            where: { id: record.id },
            data: buildUpdateData(record.constituentId, record.data),
          })
        )
      );

      result.updated += toUpdate.length;
    } catch {
      // If batch fails, try individual updates
      for (const record of toUpdate) {
        try {
          await prisma.gift.update({
            where: { id: record.id },
            data: buildUpdateData(record.constituentId, record.data),
          });
          result.updated++;
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
  data: GiftImport
): Prisma.GiftCreateManyInput {
  return {
    organizationId,
    constituentId,
    externalId: data.externalId ?? null,
    amount: data.amount,
    giftDate: data.giftDate,
    giftType: data.giftType ?? null,
    fundName: data.fundName ?? null,
    fundCode: data.fundCode ?? null,
    campaign: data.campaign ?? null,
    appeal: data.appeal ?? null,
    recognitionAmount: data.recognitionAmount ?? null,
    isAnonymous: data.isAnonymous ?? false,
  };
}

/**
 * Build Prisma update data from import data
 */
function buildUpdateData(
  constituentId: string,
  data: GiftImport
): Prisma.GiftUpdateInput {
  return {
    constituent: { connect: { id: constituentId } },
    amount: data.amount,
    giftDate: data.giftDate,
    giftType: data.giftType ?? undefined,
    fundName: data.fundName ?? undefined,
    fundCode: data.fundCode ?? undefined,
    campaign: data.campaign ?? undefined,
    appeal: data.appeal ?? undefined,
    recognitionAmount: data.recognitionAmount ?? undefined,
    isAnonymous: data.isAnonymous,
  };
}
