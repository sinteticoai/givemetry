// T030: Presigned URL generation for uploads
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "auto";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("S3 credentials not configured");
  }

  s3Client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3Client;
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET not configured");
  }
  return bucket;
}

export interface PresignedUploadResult {
  url: string;
  key: string;
  expiresAt: Date;
}

/**
 * Generate a presigned URL for uploading a file directly to S3
 */
export async function createPresignedUploadUrl(
  organizationId: string,
  uploadId: string,
  filename: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<PresignedUploadResult> {
  const client = getS3Client();
  const bucket = getBucket();

  // Sanitize filename
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `uploads/${organizationId}/${uploadId}/${safeFilename}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return {
    url,
    key,
    expiresAt,
  };
}

export interface PresignedDownloadResult {
  url: string;
  expiresAt: Date;
}

/**
 * Generate a presigned URL for downloading a file from S3
 */
export async function createPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<PresignedDownloadResult> {
  const client = getS3Client();
  const bucket = getBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return {
    url,
    expiresAt,
  };
}

/**
 * Generate storage key for uploads
 */
export function generateStorageKey(
  organizationId: string,
  uploadId: string,
  filename: string
): string {
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `uploads/${organizationId}/${uploadId}/${safeFilename}`;
}

/**
 * Generate storage key for reports
 */
export function generateReportKey(
  organizationId: string,
  reportId: string,
  format: string = "pdf"
): string {
  return `reports/${organizationId}/${reportId}.${format}`;
}
