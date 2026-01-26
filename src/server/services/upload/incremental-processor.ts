// T097: Incremental update logic (new/changed record detection)
import type { PrismaClient, Prisma } from "@prisma/client";
import crypto from "crypto";

export interface ChangeDetectionResult {
  newRecords: number;
  updatedRecords: number;
  unchangedRecords: number;
  deletedRecords: number;
  changes: ChangeDetail[];
}

export interface ChangeDetail {
  externalId: string;
  changeType: "new" | "updated" | "deleted";
  changedFields?: string[];
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export interface IncrementalProcessOptions {
  detectDeleted?: boolean;
  trackFieldChanges?: boolean;
  ignoreFields?: string[];
}

const DEFAULT_OPTIONS: IncrementalProcessOptions = {
  detectDeleted: false,
  trackFieldChanges: true,
  ignoreFields: ["id", "createdAt", "updatedAt", "organizationId"],
};

/**
 * Detect changes between new data and existing records
 */
export async function detectChanges(
  prisma: PrismaClient,
  organizationId: string,
  records: Array<{ externalId: string; [key: string]: unknown }>,
  options: IncrementalProcessOptions = {}
): Promise<ChangeDetectionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: ChangeDetectionResult = {
    newRecords: 0,
    updatedRecords: 0,
    unchangedRecords: 0,
    deletedRecords: 0,
    changes: [],
  };

  // Get all external IDs from new data
  const newExternalIds = new Set(records.map((r) => r.externalId));

  // Fetch existing records
  const existingRecords = await prisma.constituent.findMany({
    where: {
      organizationId,
      externalId: { in: Array.from(newExternalIds) },
    },
  });

  const existingMap = new Map(
    existingRecords.map((r) => [r.externalId, r])
  );

  // Compare records
  for (const record of records) {
    const existing = existingMap.get(record.externalId);

    if (!existing) {
      // New record
      result.newRecords++;
      result.changes.push({
        externalId: record.externalId,
        changeType: "new",
        newValues: opts.trackFieldChanges ? record : undefined,
      });
    } else {
      // Check for changes
      const changedFields = detectFieldChanges(
        existing,
        record,
        opts.ignoreFields || []
      );

      if (changedFields.length > 0) {
        result.updatedRecords++;
        result.changes.push({
          externalId: record.externalId,
          changeType: "updated",
          changedFields,
          oldValues: opts.trackFieldChanges
            ? pickFields(existing, changedFields)
            : undefined,
          newValues: opts.trackFieldChanges
            ? pickFields(record, changedFields)
            : undefined,
        });
      } else {
        result.unchangedRecords++;
      }
    }
  }

  // Detect deleted records (records in DB but not in new data)
  if (opts.detectDeleted) {
    const allExisting = await prisma.constituent.findMany({
      where: { organizationId },
      select: { externalId: true },
    });

    for (const existing of allExisting) {
      if (!newExternalIds.has(existing.externalId)) {
        result.deletedRecords++;
        result.changes.push({
          externalId: existing.externalId,
          changeType: "deleted",
        });
      }
    }
  }

  return result;
}

/**
 * Detect which fields changed between two records
 */
function detectFieldChanges(
  existing: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  ignoreFields: string[]
): string[] {
  const changedFields: string[] = [];
  const ignoreSet = new Set(ignoreFields);

  // Check all fields in new record
  for (const [key, newValue] of Object.entries(newRecord)) {
    if (ignoreSet.has(key)) continue;
    if (!(key in existing)) continue; // Skip fields not in schema

    const existingValue = existing[key];

    // Compare values
    if (!valuesEqual(existingValue, newValue)) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

/**
 * Compare two values for equality
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  // Handle null/undefined
  if (a === null || a === undefined) {
    return b === null || b === undefined || b === "";
  }
  if (b === null || b === undefined) {
    return a === null || a === undefined || a === "";
  }

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof Date) {
    return a.getTime() === new Date(b as string).getTime();
  }
  if (b instanceof Date) {
    return new Date(a as string).getTime() === b.getTime();
  }

  // Handle numbers (with tolerance for floating point)
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 0.0001;
  }

  // String comparison (case-insensitive for text fields)
  if (typeof a === "string" && typeof b === "string") {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  // Default comparison
  return a === b;
}

/**
 * Pick specific fields from an object
 */
function pickFields(
  obj: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
}

/**
 * Generate a hash for a record to detect changes
 */
export function generateRecordHash(
  record: Record<string, unknown>,
  ignoreFields: string[] = []
): string {
  const ignoreSet = new Set(ignoreFields);
  const relevantFields: Record<string, unknown> = {};

  // Sort keys for consistent hashing
  const sortedKeys = Object.keys(record).sort();

  for (const key of sortedKeys) {
    if (!ignoreSet.has(key)) {
      let value = record[key];

      // Normalize values for consistent hashing
      if (value === null || value === undefined) {
        value = "";
      } else if (value instanceof Date) {
        value = value.toISOString();
      } else if (typeof value === "string") {
        value = value.trim().toLowerCase();
      }

      relevantFields[key] = value;
    }
  }

  const json = JSON.stringify(relevantFields);
  return crypto.createHash("md5").update(json).digest("hex");
}

/**
 * Process incremental updates efficiently
 */
export async function processIncrementalUpdates(
  prisma: PrismaClient,
  organizationId: string,
  records: Array<{ externalId: string; [key: string]: unknown }>,
  options: IncrementalProcessOptions = {}
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ externalId: string; message: string }>;
}> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as Array<{ externalId: string; message: string }>,
  };

  // Generate hashes for new records
  const newHashes = new Map<string, string>();
  for (const record of records) {
    const hash = generateRecordHash(record, opts.ignoreFields);
    newHashes.set(record.externalId, hash);
  }

  // Fetch existing records with their hashes
  const existingRecords = await prisma.constituent.findMany({
    where: {
      organizationId,
      externalId: { in: records.map((r) => r.externalId) },
    },
  });

  const existingMap = new Map<
    string,
    { id: string; hash: string; record: typeof existingRecords[0] }
  >();

  for (const record of existingRecords) {
    const hash = generateRecordHash(
      record as unknown as Record<string, unknown>,
      [...(opts.ignoreFields || []), "id", "createdAt", "updatedAt"]
    );
    existingMap.set(record.externalId, {
      id: record.id,
      hash,
      record,
    });
  }

  // Process each record
  const toCreate: Array<Prisma.ConstituentCreateManyInput> = [];
  const toUpdate: Array<{
    id: string;
    data: Prisma.ConstituentUpdateInput;
  }> = [];

  for (const record of records) {
    const existing = existingMap.get(record.externalId);
    const newHash = newHashes.get(record.externalId)!;

    if (!existing) {
      // New record
      toCreate.push({
        organizationId,
        ...record,
      } as Prisma.ConstituentCreateManyInput);
      result.created++;
    } else if (existing.hash !== newHash) {
      // Changed record
      const { externalId: _externalId, ...updateData } = record;
      toUpdate.push({
        id: existing.id,
        data: updateData as Prisma.ConstituentUpdateInput,
      });
      result.updated++;
    } else {
      // Unchanged
      result.skipped++;
    }
  }

  // Batch create
  if (toCreate.length > 0) {
    try {
      await prisma.constituent.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    } catch {
      // If batch fails, try individually
      for (const data of toCreate) {
        try {
          await prisma.constituent.create({ data });
        } catch (err) {
          result.errors.push({
            externalId: data.externalId,
            message: err instanceof Error ? err.message : "Unknown error",
          });
          result.created--;
        }
      }
    }
  }

  // Batch update
  if (toUpdate.length > 0) {
    try {
      await prisma.$transaction(
        toUpdate.map(({ id, data }) =>
          prisma.constituent.update({
            where: { id },
            data,
          })
        )
      );
    } catch {
      // If batch fails, try individually
      for (const { id, data } of toUpdate) {
        try {
          await prisma.constituent.update({
            where: { id },
            data,
          });
        } catch (err) {
          result.errors.push({
            externalId: id,
            message: err instanceof Error ? err.message : "Unknown error",
          });
          result.updated--;
        }
      }
    }
  }

  return result;
}

/**
 * Get a summary of changes for UI display
 */
export function summarizeChanges(changes: ChangeDetail[]): {
  summary: string;
  byType: Record<"new" | "updated" | "deleted", number>;
  mostChangedFields: Array<{ field: string; count: number }>;
} {
  const byType = {
    new: 0,
    updated: 0,
    deleted: 0,
  };

  const fieldCounts: Record<string, number> = {};

  for (const change of changes) {
    byType[change.changeType]++;

    if (change.changedFields) {
      for (const field of change.changedFields) {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      }
    }
  }

  const mostChangedFields = Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([field, count]) => ({ field, count }));

  const parts: string[] = [];
  if (byType.new > 0) parts.push(`${byType.new} new`);
  if (byType.updated > 0) parts.push(`${byType.updated} updated`);
  if (byType.deleted > 0) parts.push(`${byType.deleted} deleted`);

  return {
    summary: parts.length > 0 ? parts.join(", ") : "No changes",
    byType,
    mostChangedFields,
  };
}
