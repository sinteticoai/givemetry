// T084: Constituent upsert logic with CRM ID matching
import type { PrismaClient, Prisma } from "@prisma/client";
import {
  constituentImportSchema,
  type ConstituentImport,
  validateRow,
} from "@/lib/utils/validation";
import { applyFieldMapping, type FieldMapping } from "./field-mapper";

export interface ProcessingResult {
  created: number;
  updated: number;
  skipped: number;
  errors: ProcessingError[];
}

export interface ProcessingError {
  row: number;
  externalId?: string;
  field?: string;
  message: string;
}

export interface ProcessingOptions {
  onProgress?: (processed: number, total: number) => void;
  batchSize?: number;
  updateExisting?: boolean;
}

/**
 * Process constituent rows from CSV
 */
export async function processConstituents(
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
      i + 2, // Starting row number (1-indexed, +1 for header)
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
 * Process a batch of constituent rows
 */
async function processBatch(
  prisma: PrismaClient,
  organizationId: string,
  rows: Record<string, string>[],
  mapping: FieldMapping,
  startRow: number,
  updateExisting: boolean
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Transform and validate all rows
  const validRows: Array<{
    row: number;
    data: ConstituentImport;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNumber = startRow + i;

    if (!rawRow) continue;
    // Apply field mapping
    const mappedRow = applyFieldMapping(rawRow, mapping) as Record<string, string>;

    // Validate
    const validation = validateRow(
      mappedRow as Record<string, unknown>,
      constituentImportSchema,
      rowNumber
    );

    if (validation.success && validation.data) {
      validRows.push({
        row: rowNumber,
        data: validation.data,
      });
    } else {
      result.errors.push(
        ...validation.errors.map((err) => ({
          row: rowNumber,
          externalId: mappedRow.externalId as string | undefined,
          field: err.path,
          message: err.message,
        }))
      );
      result.skipped++;
    }
  }

  // Batch lookup existing constituents by externalId
  const externalIds = validRows.map((r) => r.data.externalId);
  const existing = await prisma.constituent.findMany({
    where: {
      organizationId,
      externalId: { in: externalIds },
    },
    select: {
      id: true,
      externalId: true,
    },
  });

  const existingMap = new Map(existing.map((c) => [c.externalId, c.id]));

  // Separate creates and updates
  const toCreate: Array<{ row: number; data: ConstituentImport }> = [];
  const toUpdate: Array<{
    row: number;
    id: string;
    data: ConstituentImport;
  }> = [];

  for (const validRow of validRows) {
    const existingId = existingMap.get(validRow.data.externalId);

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

  // Batch create new constituents
  if (toCreate.length > 0) {
    try {
      const createData = toCreate.map((r) =>
        buildCreateData(organizationId, r.data)
      );

      await prisma.constituent.createMany({
        data: createData,
        skipDuplicates: true,
      });

      result.created += toCreate.length;
    } catch {
      // If batch fails, try individual inserts to identify problem rows
      for (const record of toCreate) {
        try {
          await prisma.constituent.create({
            data: buildCreateData(organizationId, record.data),
          });
          result.created++;
        } catch (err) {
          result.errors.push({
            row: record.row,
            externalId: record.data.externalId,
            message: err instanceof Error ? err.message : "Unknown error",
          });
          result.skipped++;
        }
      }
    }
  }

  // Batch update existing constituents
  if (toUpdate.length > 0) {
    // Use transaction for batch updates
    try {
      await prisma.$transaction(
        toUpdate.map((record) =>
          prisma.constituent.update({
            where: { id: record.id },
            data: buildUpdateData(record.data),
          })
        )
      );

      result.updated += toUpdate.length;
    } catch {
      // If batch fails, try individual updates
      for (const record of toUpdate) {
        try {
          await prisma.constituent.update({
            where: { id: record.id },
            data: buildUpdateData(record.data),
          });
          result.updated++;
        } catch (err) {
          result.errors.push({
            row: record.row,
            externalId: record.data.externalId,
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
  data: ConstituentImport
): Prisma.ConstituentCreateManyInput {
  return {
    organizationId,
    externalId: data.externalId,
    externalSource: data.externalSource ?? "csv",
    prefix: data.prefix ?? null,
    firstName: data.firstName ?? null,
    middleName: data.middleName ?? null,
    lastName: data.lastName,
    suffix: data.suffix ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    addressLine1: data.addressLine1 ?? null,
    addressLine2: data.addressLine2 ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    postalCode: data.postalCode ?? null,
    country: data.country ?? null,
    constituentType: data.constituentType ?? null,
    classYear: data.classYear ?? null,
    schoolCollege: data.schoolCollege ?? null,
    estimatedCapacity: data.estimatedCapacity ?? null,
    capacitySource: data.capacitySource ?? null,
    assignedOfficerId: data.assignedOfficerId?.trim() || null, // Empty string → null
    portfolioTier: data.portfolioTier ?? null,
    isActive: true,
  };
}

/**
 * Build Prisma update data from import data
 */
function buildUpdateData(
  data: ConstituentImport
): Prisma.ConstituentUpdateInput {
  const update: Prisma.ConstituentUpdateInput = {};

  // Only update fields that have values (don't overwrite with nulls)
  if (data.prefix !== null && data.prefix !== undefined) {
    update.prefix = data.prefix;
  }
  if (data.firstName !== null && data.firstName !== undefined) {
    update.firstName = data.firstName;
  }
  if (data.middleName !== null && data.middleName !== undefined) {
    update.middleName = data.middleName;
  }
  if (data.lastName) {
    update.lastName = data.lastName;
  }
  if (data.suffix !== null && data.suffix !== undefined) {
    update.suffix = data.suffix;
  }
  if (data.email !== null && data.email !== undefined) {
    update.email = data.email;
  }
  if (data.phone !== null && data.phone !== undefined) {
    update.phone = data.phone;
  }
  if (data.addressLine1 !== null && data.addressLine1 !== undefined) {
    update.addressLine1 = data.addressLine1;
  }
  if (data.addressLine2 !== null && data.addressLine2 !== undefined) {
    update.addressLine2 = data.addressLine2;
  }
  if (data.city !== null && data.city !== undefined) {
    update.city = data.city;
  }
  if (data.state !== null && data.state !== undefined) {
    update.state = data.state;
  }
  if (data.postalCode !== null && data.postalCode !== undefined) {
    update.postalCode = data.postalCode;
  }
  if (data.country !== null && data.country !== undefined) {
    update.country = data.country;
  }
  if (data.constituentType !== null && data.constituentType !== undefined) {
    update.constituentType = data.constituentType;
  }
  if (data.classYear !== null && data.classYear !== undefined) {
    update.classYear = data.classYear;
  }
  if (data.schoolCollege !== null && data.schoolCollege !== undefined) {
    update.schoolCollege = data.schoolCollege;
  }
  if (data.estimatedCapacity !== null && data.estimatedCapacity !== undefined) {
    update.estimatedCapacity = data.estimatedCapacity;
  }
  if (data.capacitySource !== null && data.capacitySource !== undefined) {
    update.capacitySource = data.capacitySource;
  }
  if (data.assignedOfficerId?.trim()) {
    update.assignedOfficer = { connect: { id: data.assignedOfficerId.trim() } };
  }
  if (data.portfolioTier !== null && data.portfolioTier !== undefined) {
    update.portfolioTier = data.portfolioTier;
  }

  return update;
}

/**
 * Look up constituent by external ID
 */
export async function findConstituentByExternalId(
  prisma: PrismaClient,
  organizationId: string,
  externalId: string
): Promise<{ id: string } | null> {
  return prisma.constituent.findFirst({
    where: {
      organizationId,
      externalId,
    },
    select: {
      id: true,
    },
  });
}

/**
 * Build external ID to internal ID mapping
 */
export async function buildConstituentIdMap(
  prisma: PrismaClient,
  organizationId: string,
  externalIds: string[]
): Promise<Map<string, string>> {
  const constituents = await prisma.constituent.findMany({
    where: {
      organizationId,
      externalId: { in: externalIds },
    },
    select: {
      id: true,
      externalId: true,
    },
  });

  return new Map(constituents.map((c) => [c.externalId, c.id]));
}
