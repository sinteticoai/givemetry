/**
 * Upload Router Contract
 * GiveMetry MVP (Phase 1)
 *
 * Handles CSV file upload, field mapping, and processing status.
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const uploadStatus = z.enum([
  'queued',
  'processing',
  'completed',
  'failed',
  'completed_with_errors',
]);

export const dataType = z.enum([
  'constituents',
  'gifts',
  'contacts',
]);

// ============================================
// Input Schemas
// ============================================

export const createUploadInput = z.object({
  filename: z.string(),
  fileSize: z.number().int().positive(),
  dataType: dataType,
});

export const updateFieldMappingInput = z.object({
  uploadId: z.string().uuid(),
  fieldMapping: z.record(z.string(), z.string().nullable()),
});

export const getUploadInput = z.object({
  uploadId: z.string().uuid(),
});

export const listUploadsInput = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
  status: uploadStatus.optional(),
});

export const retryUploadInput = z.object({
  uploadId: z.string().uuid(),
});

export const deleteUploadInput = z.object({
  uploadId: z.string().uuid(),
});

// ============================================
// Output Schemas
// ============================================

export const presignedUploadOutput = z.object({
  uploadId: z.string().uuid(),
  uploadUrl: z.string().url(),
  fields: z.record(z.string(), z.string()),
  expiresAt: z.string().datetime(),
});

export const uploadOutput = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  fileSize: z.number().int().nullable(),
  status: uploadStatus,
  dataType: dataType,
  rowCount: z.number().int().nullable(),
  processedCount: z.number().int().nullable(),
  errorCount: z.number().int().nullable(),
  progress: z.number().int().min(0).max(100),
  fieldMapping: z.record(z.string(), z.string().nullable()).nullable(),
  errors: z.array(z.object({
    row: z.number().int().optional(),
    field: z.string().optional(),
    error: z.string(),
  })).nullable(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const uploadListOutput = z.object({
  uploads: z.array(uploadOutput),
  nextCursor: z.string().uuid().nullable(),
  totalCount: z.number().int(),
});

export const fieldMappingSuggestionOutput = z.object({
  uploadId: z.string().uuid(),
  detectedColumns: z.array(z.string()),
  suggestedMapping: z.record(z.string(), z.string().nullable()),
  requiredFields: z.array(z.string()),
  optionalFields: z.array(z.string()),
  unmappedColumns: z.array(z.string()),
  sampleData: z.array(z.record(z.string(), z.unknown())),
});

export const uploadCompleteOutput = z.object({
  success: z.boolean(),
  uploadId: z.string().uuid(),
  status: uploadStatus,
  message: z.string(),
});

// ============================================
// Router Definition (tRPC-style)
// ============================================

/**
 * upload.createPresignedUrl
 * - Creates upload record
 * - Returns presigned S3/R2 upload URL
 * - Client uploads directly to storage
 *
 * Middleware: Protected (requires auth)
 * Permissions: admin, manager
 */
export type CreatePresignedUrlProcedure = {
  input: z.infer<typeof createUploadInput>;
  output: z.infer<typeof presignedUploadOutput>;
};

/**
 * upload.confirmUpload
 * - Called after client completes S3 upload
 * - Triggers field detection and mapping suggestions
 * - Queues for processing if auto-mapping succeeds
 *
 * Middleware: Protected (requires auth)
 */
export type ConfirmUploadProcedure = {
  input: z.infer<typeof getUploadInput>;
  output: z.infer<typeof fieldMappingSuggestionOutput>;
};

/**
 * upload.updateFieldMapping
 * - Updates field mapping
 * - Queues upload for processing
 *
 * Middleware: Protected (requires auth)
 */
export type UpdateFieldMappingProcedure = {
  input: z.infer<typeof updateFieldMappingInput>;
  output: z.infer<typeof uploadCompleteOutput>;
};

/**
 * upload.get
 * - Returns upload details and status
 *
 * Middleware: Protected (requires auth)
 */
export type GetUploadProcedure = {
  input: z.infer<typeof getUploadInput>;
  output: z.infer<typeof uploadOutput>;
};

/**
 * upload.list
 * - Lists uploads for organization
 * - Paginated, filterable by status
 *
 * Middleware: Protected (requires auth)
 */
export type ListUploadsProcedure = {
  input: z.infer<typeof listUploadsInput>;
  output: z.infer<typeof uploadListOutput>;
};

/**
 * upload.retry
 * - Requeues failed upload for processing
 *
 * Middleware: Protected (requires auth)
 * Permissions: admin, manager
 */
export type RetryUploadProcedure = {
  input: z.infer<typeof retryUploadInput>;
  output: z.infer<typeof uploadCompleteOutput>;
};

/**
 * upload.delete
 * - Deletes upload record and associated file
 * - Cannot delete if processing
 *
 * Middleware: Protected (requires auth)
 * Permissions: admin
 */
export type DeleteUploadProcedure = {
  input: z.infer<typeof deleteUploadInput>;
  output: z.infer<typeof uploadCompleteOutput>;
};

// ============================================
// Field Mapping Schemas (by data type)
// ============================================

export const constituentFieldMapping = z.object({
  // Required
  externalId: z.string().describe('CRM constituent ID (required)'),
  lastName: z.string().describe('Last name (required)'),

  // Optional demographics
  firstName: z.string().nullable().optional(),
  middleName: z.string().nullable().optional(),
  prefix: z.string().nullable().optional(),
  suffix: z.string().nullable().optional(),

  // Contact info
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),

  // Affiliation
  constituentType: z.string().nullable().optional(),
  classYear: z.string().nullable().optional(),
  schoolCollege: z.string().nullable().optional(),

  // Wealth
  estimatedCapacity: z.string().nullable().optional(),

  // Assignment
  assignedOfficerId: z.string().nullable().optional(),
  portfolioTier: z.string().nullable().optional(),
});

export const giftFieldMapping = z.object({
  // Required
  constituentExternalId: z.string().describe('CRM constituent ID (required)'),
  amount: z.string().describe('Gift amount (required)'),
  giftDate: z.string().describe('Gift date (required)'),

  // Optional
  externalId: z.string().nullable().optional(),
  giftType: z.string().nullable().optional(),
  fundName: z.string().nullable().optional(),
  fundCode: z.string().nullable().optional(),
  campaign: z.string().nullable().optional(),
  appeal: z.string().nullable().optional(),
  recognitionAmount: z.string().nullable().optional(),
  isAnonymous: z.string().nullable().optional(),
});

export const contactFieldMapping = z.object({
  // Required
  constituentExternalId: z.string().describe('CRM constituent ID (required)'),
  contactDate: z.string().describe('Contact date (required)'),
  contactType: z.string().describe('Contact type (required)'),

  // Optional
  externalId: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  outcome: z.string().nullable().optional(),
  assignedOfficerExternalId: z.string().nullable().optional(),
});
