// Upload router - placeholder for Phase 4
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, managerProcedure } from "../trpc/init";
import { isS3Storage, createPresignedUploadUrl, generateStorageKey } from "@/lib/storage";

const createPresignedUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().default("text/csv"),
  fileSize: z.number().max(500 * 1024 * 1024), // 500MB max
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

  // Update field mapping
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

      await ctx.prisma.upload.update({
        where: { id: input.uploadId },
        data: { fieldMapping: input.fieldMapping },
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

      await ctx.prisma.upload.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
