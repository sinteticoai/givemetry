// T074: Integration tests for upload router
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

// Mock storage module
vi.mock("@/lib/storage", () => ({
  isS3Storage: vi.fn().mockReturnValue(false),
  createPresignedUploadUrl: vi.fn().mockResolvedValue({
    url: "https://storage.example.com/presigned-url",
    key: "uploads/org-id/upload-id/test.csv",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  }),
  generateStorageKey: vi.fn().mockReturnValue("uploads/org-id/upload-id/test.csv"),
}));

// Mock CSV parser
vi.mock("@/server/services/upload/csv-parser", () => ({
  parseCSV: vi.fn().mockResolvedValue({
    data: [
      { id: "1", name: "John Doe" },
      { id: "2", name: "Jane Doe" },
    ],
    meta: { fields: ["id", "name"] },
    errors: [],
  }),
  detectColumns: vi.fn().mockResolvedValue(["id", "name", "email", "amount"]),
  getRowCount: vi.fn().mockResolvedValue(100),
  validateCSVStructure: vi.fn().mockResolvedValue({ isValid: true, errors: [], warnings: [] }),
}));

// Mock field mapper
vi.mock("@/server/services/upload/field-mapper", () => ({
  suggestFieldMapping: vi.fn().mockReturnValue({
    mapping: {
      "id": "externalId",
      "name": "lastName",
      "email": "email",
      "amount": null,
    },
    confidence: {
      "id": 0.95,
      "name": 0.8,
      "email": 0.99,
    },
    unmappedColumns: ["amount"],
    requiredFields: ["externalId", "lastName"],
    optionalFields: ["firstName", "email", "phone"],
  }),
  validateFieldMapping: vi.fn().mockReturnValue({
    valid: true,
    errors: [],
    warnings: [],
  }),
}));

import { uploadRouter } from "@/server/routers/upload";
import { createCallerFactory } from "@/server/trpc/init";
import { isS3Storage, createPresignedUploadUrl } from "@/lib/storage";

// Create mock Prisma client
function createMockPrisma() {
  return {
    upload: {
      create: vi.fn().mockResolvedValue({
        id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        organizationId: "org-id",
        userId: "user-id",
        filename: "test.csv",
        fileSize: 1024,
        status: "queued",
        createdAt: new Date(),
      }),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((fn) => fn({
      upload: {
        create: vi.fn().mockResolvedValue({
          id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
          organizationId: "org-id",
          userId: "user-id",
          filename: "test.csv",
          fileSize: 1024,
          status: "queued",
        }),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    })),
  } as unknown as PrismaClient;
}

// Create test context
function createMockContext(options: { role?: "admin" | "manager" | "gift_officer" | "viewer" } = {}) {
  const prisma = createMockPrisma();
  const role = options.role ?? "admin";
  const orgId = "org-id";

  return {
    prisma,
    session: {
      user: {
        id: "user-id",
        email: "test@example.com",
        name: "Test User",
        organizationId: orgId,
        role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    withOrgFilter: <T extends { organizationId?: string }>(where?: T) =>
      ({ ...where, organizationId: orgId } as T & { organizationId: string }),
    withOrgCreate: <T extends object>(data: T) =>
      ({ ...data, organizationId: orgId } as T & { organizationId: string }),
    organizationId: orgId,
  };
}

const createCaller = createCallerFactory(uploadRouter);

describe("Upload Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPresignedUrl", () => {
    it("creates an upload record and returns presigned URL for S3", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      vi.mocked(isS3Storage).mockReturnValue(true);

      const result = await caller.createPresignedUrl({
        filename: "donors.csv",
        contentType: "text/csv",
        fileSize: 1024 * 1024,
        dataType: "constituents",
      });

      expect(result.uploadId).toBeDefined();
      expect(createPresignedUploadUrl).toHaveBeenCalled();
      expect(ctx.prisma.upload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filename: "donors.csv",
            fileSize: 1024 * 1024,
            status: "queued",
          }),
        })
      );
    });

    it("returns local upload URL when not using S3", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      vi.mocked(isS3Storage).mockReturnValue(false);

      const result = await caller.createPresignedUrl({
        filename: "donors.csv",
        contentType: "text/csv",
        fileSize: 1024,
        dataType: "constituents",
      });

      expect(result.uploadId).toBeDefined();
      expect(result.uploadUrl).toContain("/api/upload/");
    });

    it("rejects files larger than 500MB", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      await expect(
        caller.createPresignedUrl({
          filename: "huge.csv",
          contentType: "text/csv",
          fileSize: 600 * 1024 * 1024, // 600MB
          dataType: "constituents",
        })
      ).rejects.toThrow();
    });

    it("requires manager or admin role", async () => {
      const ctx = createMockContext({ role: "gift_officer" });
      const caller = createCaller(ctx);

      await expect(
        caller.createPresignedUrl({
          filename: "donors.csv",
          contentType: "text/csv",
          fileSize: 1024,
          dataType: "constituents",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("requires viewer role to be denied", async () => {
      const ctx = createMockContext({ role: "viewer" });
      const caller = createCaller(ctx);

      await expect(
        caller.createPresignedUrl({
          filename: "donors.csv",
          contentType: "text/csv",
          fileSize: 1024,
          dataType: "constituents",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("confirmUpload", () => {
    it("confirms upload and triggers field detection", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        organizationId: "org-id",
        status: "queued",
        storagePath: "uploads/org-id/upload-id/test.csv",
      });

      const result = await caller.confirmUpload({
        uploadId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        fileHash: "abc123",
      });

      expect(result.success).toBe(true);
      expect(ctx.prisma.upload.update).toHaveBeenCalled();
      expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "upload.create",
          }),
        })
      );
    });

    it("rejects confirmation for non-existent upload", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.confirmUpload({
          uploadId: "00000000-0000-0000-0000-000000000000",
        })
      ).rejects.toThrow("Upload not found or already processed");
    });

    it("rejects confirmation for already processing upload", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.confirmUpload({
          uploadId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("prevents access to uploads from other organizations", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      // Mock returns null because org filter doesn't match
      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.confirmUpload({
          uploadId: "bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("updateFieldMapping", () => {
    it("updates field mapping for an upload", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        organizationId: "org-id",
        status: "queued",
        storagePath: "uploads/org-id/upload-id/test.csv",
        dataType: "constituents",
      });

      const result = await caller.updateFieldMapping({
        uploadId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        fieldMapping: {
          "ID Column": "externalId",
          "Name Column": "lastName",
        },
      });

      expect(result.success).toBe(true);
      expect(ctx.prisma.upload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
          data: expect.objectContaining({
            fieldMapping: expect.any(Object),
          }),
        })
      );
    });

    it("rejects invalid field mapping", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        caller.updateFieldMapping({
          uploadId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
          fieldMapping: {},
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("list", () => {
    it("lists uploads for the organization", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const mockUploads = [
        {
          id: "upload-1",
          filename: "donors.csv",
          status: "completed",
          user: { id: "user-id", name: "Test User" },
        },
        {
          id: "21212121-2121-4212-a212-212121212121",
          filename: "gifts.csv",
          status: "processing",
          user: { id: "user-id", name: "Test User" },
        },
      ];

      (ctx.prisma.upload.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploads);

      const result = await caller.list({ limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(ctx.prisma.upload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-id",
          }),
        })
      );
    });

    it("filters by status when provided", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await caller.list({ limit: 10, status: "completed" });

      expect(ctx.prisma.upload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "completed",
          }),
        })
      );
    });

    it("supports cursor-based pagination", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const mockUploads = [
        { id: "upload-3", filename: "more.csv", user: { id: "user-id", name: "Test" } },
        { id: "upload-4", filename: "data.csv", user: { id: "user-id", name: "Test" } },
      ];

      (ctx.prisma.upload.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploads);

      await caller.list({ limit: 10, cursor: "21212121-2121-4212-a212-212121212121" });

      expect(ctx.prisma.upload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: "21212121-2121-4212-a212-212121212121" },
          skip: 1,
        })
      );
    });

    it("returns next cursor when more items exist", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      // Return limit + 1 items to indicate more exist
      const mockUploads = [
        { id: "upload-1", filename: "a.csv", user: { id: "user-id", name: "Test" } },
        { id: "21212121-2121-4212-a212-212121212121", filename: "b.csv", user: { id: "user-id", name: "Test" } },
        { id: "upload-3", filename: "c.csv", user: { id: "user-id", name: "Test" } },
      ];

      (ctx.prisma.upload.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploads);

      const result = await caller.list({ limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe("upload-3");
    });
  });

  describe("get", () => {
    it("returns upload details", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const mockUpload = {
        id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        organizationId: "org-id",
        filename: "donors.csv",
        status: "completed",
        rowCount: 100,
        processedCount: 100,
        errorCount: 0,
        user: { id: "user-id", name: "Test User" },
      };

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpload);

      const result = await caller.get({ id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" });

      expect(result.id).toBe("aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa");
      expect(result.filename).toBe("donors.csv");
    });

    it("throws NOT_FOUND for non-existent upload", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(caller.get({ id: "00000000-0000-0000-0000-000000000000" })).rejects.toThrow(
        "Upload not found"
      );
    });
  });

  describe("retry", () => {
    it("requeues a failed upload", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        organizationId: "org-id",
        status: "failed",
      });

      const result = await caller.retry({ id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" });

      expect(result.success).toBe(true);
      expect(ctx.prisma.upload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
          data: expect.objectContaining({
            status: "queued",
            progress: 0,
          }),
        })
      );
    });

    it("requeues an upload with errors", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        organizationId: "org-id",
        status: "completed_with_errors",
      });

      const result = await caller.retry({ id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" });

      expect(result.success).toBe(true);
    });

    it("rejects retry for completed upload without errors", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(caller.retry({ id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" })).rejects.toThrow(
        "Upload not found or cannot be retried"
      );
    });

    it("rejects retry for processing upload", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(caller.retry({ id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" })).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("deletes an upload", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        organizationId: "org-id",
        status: "completed",
      });

      const result = await caller.delete({ id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" });

      expect(result.success).toBe(true);
      expect(ctx.prisma.upload.delete).toHaveBeenCalledWith({
        where: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
      });
    });

    it("throws NOT_FOUND for non-existent upload", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(caller.delete({ id: "00000000-0000-0000-0000-000000000000" })).rejects.toThrow(
        "Upload not found"
      );
    });

    it("requires manager or admin role", async () => {
      const ctx = createMockContext({ role: "gift_officer" });
      const caller = createCaller(ctx);

      await expect(caller.delete({ id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" })).rejects.toThrow(TRPCError);
    });
  });

  describe("Multi-tenancy enforcement", () => {
    it("all queries include organization filter", async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      (ctx.prisma.upload.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Test list
      await caller.list({ limit: 10 });
      expect(ctx.prisma.upload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-id",
          }),
        })
      );

      // Test get - use valid UUID format
      await expect(caller.get({ id: "11111111-1111-4111-a111-111111111111" })).rejects.toThrow();
      expect(ctx.prisma.upload.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-id",
          }),
        })
      );
    });

    it("creates include organization ID", async () => {
      const ctx = createMockContext({ role: "manager" });
      const caller = createCaller(ctx);

      vi.mocked(isS3Storage).mockReturnValue(false);

      await caller.createPresignedUrl({
        filename: "test.csv",
        contentType: "text/csv",
        fileSize: 1024,
        dataType: "constituents",
      });

      expect(ctx.prisma.upload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "org-id",
          }),
        })
      );
    });
  });
});

describe("Upload Processing Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("follows complete upload flow: create -> confirm -> map -> process", async () => {
    const ctx = createMockContext({ role: "manager" });
    const caller = createCaller(ctx);

    // Step 1: Create presigned URL
    vi.mocked(isS3Storage).mockReturnValue(false);

    const createResult = await caller.createPresignedUrl({
      filename: "donors.csv",
      contentType: "text/csv",
      fileSize: 1024,
      dataType: "constituents",
    });

    expect(createResult.uploadId).toBeDefined();

    // Step 2: Confirm upload (after client uploads file)
    (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: createResult.uploadId,
      organizationId: "org-id",
      status: "queued",
      storagePath: "uploads/org-id/upload-id/donors.csv",
    });

    const confirmResult = await caller.confirmUpload({
      uploadId: createResult.uploadId,
      fileHash: "sha256hash",
    });

    expect(confirmResult.success).toBe(true);

    // Step 3: Update field mapping (if needed)
    (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: createResult.uploadId,
      organizationId: "org-id",
      status: "queued",
      storagePath: "uploads/org-id/upload-id/donors.csv",
      dataType: "constituents",
    });

    const mappingResult = await caller.updateFieldMapping({
      uploadId: createResult.uploadId,
      fieldMapping: {
        "Constituent ID": "externalId",
        "Last Name": "lastName",
        "Email": "email",
      },
    });

    expect(mappingResult.success).toBe(true);

    // Step 4: Worker would pick up and process (not tested here)
    // Step 5: Get final status
    (ctx.prisma.upload.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: createResult.uploadId,
      organizationId: "org-id",
      status: "completed",
      rowCount: 100,
      processedCount: 100,
      errorCount: 0,
      user: { id: "user-id", name: "Test User" },
    });

    const finalUpload = await caller.get({ id: createResult.uploadId });

    expect(finalUpload.status).toBe("completed");
  });
});
