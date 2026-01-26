// Storage abstraction layer - switches between S3 and local based on config
import {
  uploadToS3,
  getFromS3,
  deleteFromS3,
  fileExistsInS3,
  getS3Url,
} from "./s3";
import {
  uploadToLocal,
  getFromLocal,
  deleteFromLocal,
  fileExistsLocally,
  getLocalUrl,
} from "./local";
import {
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  generateStorageKey,
  generateReportKey,
} from "./presigned";

const STORAGE_TYPE = process.env.STORAGE_TYPE || "local";

/**
 * Upload a file to storage
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
): Promise<void> {
  if (STORAGE_TYPE === "s3") {
    return uploadToS3(key, body, contentType);
  }
  return uploadToLocal(key, body);
}

/**
 * Get a file from storage
 */
export async function getFile(key: string): Promise<Buffer> {
  if (STORAGE_TYPE === "s3") {
    return getFromS3(key);
  }
  return getFromLocal(key);
}

/**
 * Get file contents as string (for CSV processing)
 */
export async function getFileContents(key: string): Promise<string | null> {
  try {
    const buffer = await getFile(key);
    return buffer.toString("utf-8");
  } catch (error) {
    console.error("Error reading file:", error);
    return null;
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(key: string): Promise<void> {
  if (STORAGE_TYPE === "s3") {
    return deleteFromS3(key);
  }
  return deleteFromLocal(key);
}

/**
 * Check if a file exists in storage
 */
export async function fileExists(key: string): Promise<boolean> {
  if (STORAGE_TYPE === "s3") {
    return fileExistsInS3(key);
  }
  return fileExistsLocally(key);
}

/**
 * Get the URL for a file
 */
export function getFileUrl(key: string): string {
  if (STORAGE_TYPE === "s3") {
    return getS3Url(key);
  }
  return getLocalUrl(key);
}

/**
 * Check if using S3 storage
 */
export function isS3Storage(): boolean {
  return STORAGE_TYPE === "s3";
}

// Re-export presigned URL functions (only work with S3)
export {
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  generateStorageKey,
  generateReportKey,
};
