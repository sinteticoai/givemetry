// T087-T089: CSV processing worker with database queue polling
// T135: Trigger prediction recalculation on upload completion
import { PrismaClient } from "@prisma/client";
import {
  parseCSV,
  detectColumns,
  validateCSVStructure,
} from "@/server/services/upload/csv-parser";
import {
  suggestFieldMapping,
  validateFieldMapping,
  type DataType,
} from "@/server/services/upload/field-mapper";
import { processConstituents } from "@/server/services/upload/constituent-processor";
import { processGifts } from "@/server/services/upload/gift-processor";
import { processContacts } from "@/server/services/upload/contact-processor";
import { getFileContents } from "@/lib/storage";
import { triggerAnalysisForOrganization } from "./analysis-engine";

const prisma = new PrismaClient();

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_ERRORS_LOGGED = 100;

interface UploadJob {
  id: string;
  organizationId: string;
  userId: string;
  filename: string;
  storagePath: string | null;
  status: string;
  fieldMapping: Record<string, string | null> | null;
  dataType: string | null;
}

interface ProcessingError {
  row?: number;
  field?: string;
  message: string;
}

/**
 * Main worker loop
 */
async function runWorker() {
  console.log("CSV Processing Worker started");

  while (true) {
    try {
      const job = await claimNextJob();

      if (job) {
        console.log(`Processing upload: ${job.id} (${job.filename})`);
        await processJob(job);
      } else {
        // No jobs available, wait before polling again
        await sleep(POLL_INTERVAL);
      }
    } catch (error) {
      console.error("Worker error:", error);
      await sleep(POLL_INTERVAL);
    }
  }
}

/**
 * Claim the next queued job atomically
 */
async function claimNextJob(): Promise<UploadJob | null> {
  // Find and claim a queued upload atomically
  const upload = await prisma.upload.findFirst({
    where: {
      status: "queued",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!upload) {
    return null;
  }

  // Attempt to claim by updating status
  const claimed = await prisma.upload.updateMany({
    where: {
      id: upload.id,
      status: "queued", // Ensure still queued (optimistic locking)
    },
    data: {
      status: "processing",
      startedAt: new Date(),
    },
  });

  if (claimed.count === 0) {
    // Another worker claimed it
    return null;
  }

  return {
    id: upload.id,
    organizationId: upload.organizationId,
    userId: upload.userId,
    filename: upload.filename,
    storagePath: upload.storagePath,
    status: "processing",
    fieldMapping: upload.fieldMapping as Record<string, string | null> | null,
    dataType: (upload as Record<string, unknown>).dataType as string | null,
  };
}

/**
 * Process a single upload job
 */
async function processJob(job: UploadJob): Promise<void> {
  const errors: ProcessingError[] = [];
  let processedCount = 0;
  let errorCount = 0;

  try {
    // Get file contents from storage
    if (!job.storagePath) {
      throw new Error("No storage path for upload");
    }

    const fileContents = await getFileContents(job.storagePath);
    if (!fileContents) {
      throw new Error("Could not read file from storage");
    }

    // Parse CSV
    const parseResult = await parseCSV(fileContents);
    const rowCount = parseResult.data.length;

    await updateProgress(job.id, 5, rowCount);

    // Validate CSV structure
    const validation = await validateCSVStructure(fileContents);
    if (!validation.isValid) {
      errors.push(
        ...validation.errors.map((e) => ({
          message: e.message,
          row: e.row,
        }))
      );
    }

    // If no field mapping provided, try to auto-map
    let mapping = job.fieldMapping;
    const dataType = (job.dataType || "constituents") as DataType;

    if (!mapping) {
      const columns = await detectColumns(fileContents);
      const suggestions = suggestFieldMapping(columns, dataType);
      mapping = suggestions.mapping;

      // Store the suggested mapping
      await prisma.upload.update({
        where: { id: job.id },
        data: { fieldMapping: mapping },
      });
    }

    // Validate mapping has required fields
    const mappingValidation = validateFieldMapping(mapping, dataType);
    if (!mappingValidation.valid) {
      for (const error of mappingValidation.errors) {
        errors.push({
          field: error.field,
          message: error.message,
        });
      }

      // Can't proceed without required fields
      if (mappingValidation.errors.some(e => e.type === 'missing_required_field')) {
        throw new Error("Missing required fields in mapping");
      }
    }

    await updateProgress(job.id, 10, rowCount);

    // Process based on data type
    const processingOptions = {
      batchSize: 100,
      updateExisting: true,
      onProgress: async (processed: number, total: number) => {
        const progress = 10 + Math.round((processed / total) * 85);
        await updateProgress(job.id, progress, rowCount, processed);
      },
    };

    let result;
    switch (dataType) {
      case "gifts":
        result = await processGifts(
          prisma,
          job.organizationId,
          parseResult.data,
          mapping,
          processingOptions
        );
        break;
      case "contacts":
        result = await processContacts(
          prisma,
          job.organizationId,
          parseResult.data,
          mapping,
          processingOptions
        );
        break;
      case "constituents":
      default:
        result = await processConstituents(
          prisma,
          job.organizationId,
          parseResult.data,
          mapping,
          processingOptions
        );
        break;
    }

    processedCount = result.created + result.updated;
    errorCount = result.errors.length;

    // Collect errors (limited)
    errors.push(
      ...result.errors.slice(0, MAX_ERRORS_LOGGED - errors.length)
    );

    // Determine final status
    const finalStatus =
      errorCount === 0
        ? "completed"
        : errorCount < rowCount
        ? "completed_with_errors"
        : "failed";

    await prisma.upload.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        rowCount,
        processedCount,
        errorCount,
        errors: errors.length > 0 ? JSON.parse(JSON.stringify(errors)) : undefined,
        progress: 100,
        completedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId: job.organizationId,
        userId: job.userId,
        action: `upload.${finalStatus}`,
        resourceType: "upload",
        resourceId: job.id,
        details: {
          filename: job.filename,
          rowCount,
          processedCount,
          errorCount,
        },
      },
    });

    console.log(
      `Completed upload ${job.id}: ${processedCount} processed, ${errorCount} errors`
    );

    // T135: Trigger analysis recalculation after successful upload
    if (finalStatus === "completed" || finalStatus === "completed_with_errors") {
      console.log(`Triggering analysis for org: ${job.organizationId}`);
      // Run analysis asynchronously (don't block upload completion)
      triggerAnalysisForOrganization(job.organizationId).catch((err) => {
        console.error("Analysis trigger failed:", err);
      });
    }
  } catch (error) {
    console.error(`Failed to process upload ${job.id}:`, error);

    errors.push({
      message: error instanceof Error ? error.message : "Unknown error",
    });

    await prisma.upload.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errors: JSON.parse(JSON.stringify(errors)),
        errorCount: errors.length,
        completedAt: new Date(),
      },
    });

    // Create audit log for failure
    await prisma.auditLog.create({
      data: {
        organizationId: job.organizationId,
        userId: job.userId,
        action: "upload.failed",
        resourceType: "upload",
        resourceId: job.id,
        details: {
          filename: job.filename,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    });
  }
}

/**
 * Update upload progress
 */
async function updateProgress(
  uploadId: string,
  progress: number,
  rowCount: number,
  processedCount?: number
): Promise<void> {
  await prisma.upload.update({
    where: { id: uploadId },
    data: {
      progress: Math.min(progress, 100),
      rowCount,
      ...(processedCount !== undefined && { processedCount }),
    },
  });
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Graceful shutdown handler
 */
async function shutdown() {
  console.log("Shutting down worker...");
  await prisma.$disconnect();
  process.exit(0);
}

// Handle shutdown signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start the worker
runWorker().catch((error) => {
  console.error("Worker crashed:", error);
  process.exit(1);
});
