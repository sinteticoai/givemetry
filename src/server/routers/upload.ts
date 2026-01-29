// Upload router - CSV import processing
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient, UploadDataType } from "@prisma/client";
import { router, protectedProcedure, managerProcedure } from "../trpc/init";
import { isS3Storage, createPresignedUploadUrl, generateStorageKey, getFileContents } from "@/lib/storage";
import { parseCSV } from "@/server/services/upload";
import { processConstituents } from "@/server/services/upload/constituent-processor";
import { processGifts } from "@/server/services/upload/gift-processor";
import { processContacts } from "@/server/services/upload/contact-processor";

/**
 * Process an uploaded CSV file in the background
 */
async function processUpload(
  prisma: PrismaClient,
  uploadId: string,
  organizationId: string,
  storagePath: string,
  dataType: UploadDataType,
  fieldMapping: Record<string, string>
): Promise<void> {
  try {
    // Read file from storage
    const fileContents = await getFileContents(storagePath);
    if (!fileContents) {
      throw new Error("Could not read file from storage");
    }

    // Parse CSV
    const parseResult = await parseCSV(fileContents);
    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parse error: ${parseResult.errors.map((e) => e.message).join(", ")}`);
    }

    const rows = parseResult.data;

    // Update row count
    await prisma.upload.update({
      where: { id: uploadId },
      data: { rowCount: rows.length },
    });

    // Process based on data type
    let result: { created: number; updated: number; skipped: number; errors: Array<{ row: number; message: string }> };

    const progressCallback = async (processed: number, total: number) => {
      const progress = Math.round((processed / total) * 100);
      await prisma.upload.update({
        where: { id: uploadId },
        data: { progress, processedCount: processed },
      });
    };

    switch (dataType) {
      case "constituents":
        result = await processConstituents(prisma, organizationId, rows, fieldMapping, {
          onProgress: progressCallback,
        });
        break;
      case "gifts":
        result = await processGifts(prisma, organizationId, rows, fieldMapping, {
          onProgress: progressCallback,
        });
        break;
      case "contacts":
        result = await processContacts(prisma, organizationId, rows, fieldMapping, {
          onProgress: progressCallback,
        });
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    // Update upload with results
    const hasErrors = result.errors.length > 0;
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: hasErrors ? "completed_with_errors" : "completed",
        processedCount: result.created + result.updated,
        errorCount: result.errors.length,
        errors: result.errors.length > 0 ? result.errors.slice(0, 100) : undefined, // Limit stored errors
        progress: 100,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    // Mark upload as failed
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: "failed",
        errors: [{ message: error instanceof Error ? error.message : "Unknown error" }],
        completedAt: new Date(),
      },
    });
  }
}

const createPresignedUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().default("text/csv"),
  fileSize: z.number().max(500 * 1024 * 1024), // 500MB max
  dataType: z.enum(["constituents", "gifts", "contacts"]),
});

const confirmUploadSchema = z.object({
  uploadId: z.string().uuid(),
  fileHash: z.string().optional(),
});

const updateFieldMappingSchema = z.object({
  uploadId: z.string().uuid(),
  fieldMapping: z.record(z.string(), z.string()),
});

const listSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().min(1).max(50).default(20),
  status: z.enum(["queued", "processing", "completed", "failed", "completed_with_errors"]).optional(),
});

export const uploadRouter = router({
  // Create presigned upload URL
  createPresignedUrl: managerProcedure
    .input(createPresignedUrlSchema)
    .mutation(async ({ ctx, input }) => {
      // Create upload record
      const upload = await ctx.prisma.upload.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          filename: input.filename,
          fileSize: input.fileSize,
          dataType: input.dataType,
          status: "queued",
        },
      });

      // Generate presigned URL if using S3
      if (isS3Storage()) {
        const presigned = await createPresignedUploadUrl(
          ctx.session.user.organizationId,
          upload.id,
          input.filename,
          input.contentType
        );

        await ctx.prisma.upload.update({
          where: { id: upload.id },
          data: { storagePath: presigned.key },
        });

        return {
          uploadId: upload.id,
          presignedUrl: presigned.url,
          key: presigned.key,
          expiresAt: presigned.expiresAt,
        };
      }

      // For local storage, return upload endpoint URL
      return {
        uploadId: upload.id,
        uploadUrl: `/api/upload/${upload.id}`,
        key: generateStorageKey(ctx.session.user.organizationId, upload.id, input.filename),
      };
    }),

  // Confirm upload and start processing
  confirmUpload: managerProcedure
    .input(confirmUploadSchema)
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.prisma.upload.findFirst({
        where: {
          id: input.uploadId,
          organizationId: ctx.session.user.organizationId,
          status: "queued",
        },
      });

      if (!upload) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Upload not found or already processed",
        });
      }

      // Update with hash if provided
      await ctx.prisma.upload.update({
        where: { id: input.uploadId },
        data: {
          fileHash: input.fileHash,
          // Status remains queued until worker picks it up
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "upload.create",
          resourceType: "upload",
          resourceId: input.uploadId,
        },
      });

      return { success: true, uploadId: input.uploadId };
    }),

  // Update field mapping and start processing
  updateFieldMapping: managerProcedure
    .input(updateFieldMappingSchema)
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.prisma.upload.findFirst({
        where: {
          id: input.uploadId,
          organizationId: ctx.session.user.organizationId,
        },
      });

      if (!upload) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Upload not found",
        });
      }

      if (!upload.storagePath) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Upload file not found in storage",
        });
      }

      // Save mapping and set status to processing
      await ctx.prisma.upload.update({
        where: { id: input.uploadId },
        data: {
          fieldMapping: input.fieldMapping,
          status: "processing",
          startedAt: new Date(),
        },
      });

      // Process the CSV in the background (fire and forget)
      // In production, this would be a job queue
      processUpload(
        ctx.prisma,
        upload.id,
        upload.organizationId,
        upload.storagePath,
        upload.dataType,
        input.fieldMapping
      ).catch((error) => {
        console.error("Upload processing error:", error);
      });

      return { success: true };
    }),

  // List uploads
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const where = {
      organizationId: ctx.session.user.organizationId,
      ...(input.status && { status: input.status }),
    };

    const uploads = await ctx.prisma.upload.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: input.limit + 1,
      ...(input.cursor && {
        cursor: { id: input.cursor },
        skip: 1,
      }),
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    let nextCursor: string | undefined;
    if (uploads.length > input.limit) {
      const nextItem = uploads.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items: uploads,
      nextCursor,
    };
  }),

  // Get single upload
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const upload = await ctx.prisma.upload.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!upload) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Upload not found",
        });
      }

      return upload;
    }),

  // Retry failed upload
  retry: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.prisma.upload.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
          status: { in: ["failed", "completed_with_errors"] },
        },
      });

      if (!upload) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Upload not found or cannot be retried",
        });
      }

      await ctx.prisma.upload.update({
        where: { id: input.id },
        data: {
          status: "queued",
          errors: undefined,
          errorCount: null,
          processedCount: null,
          progress: 0,
          startedAt: null,
          completedAt: null,
        },
      });

      return { success: true };
    }),

  // Delete upload
  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.prisma.upload.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
      });

      if (!upload) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Upload not found",
        });
      }

      // Prevent deleting while processing
      if (upload.status === "processing") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete upload while processing",
        });
      }

      // Delete the stored file if it exists
      if (upload.storagePath) {
        try {
          const { deleteFile } = await import("@/lib/storage");
          await deleteFile(upload.storagePath);
        } catch (error) {
          console.error("Failed to delete stored file:", error);
          // Continue with database deletion even if file deletion fails
        }
      }

      await ctx.prisma.upload.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
