// T031: Local filesystem fallback for development
import { mkdir, writeFile, readFile, unlink, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";

const LOCAL_STORAGE_DIR = join(process.cwd(), ".storage");

/**
 * Ensure the storage directory exists
 */
async function ensureDir(path: string): Promise<void> {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Get the full path for a storage key
 */
function getLocalPath(key: string): string {
  return join(LOCAL_STORAGE_DIR, key);
}

/**
 * Upload a file to local storage
 */
export async function uploadToLocal(
  key: string,
  body: Buffer | Uint8Array | string
): Promise<void> {
  const path = getLocalPath(key);
  await ensureDir(path);
  await writeFile(path, body);
}

/**
 * Get a file from local storage
 */
export async function getFromLocal(key: string): Promise<Buffer> {
  const path = getLocalPath(key);
  return readFile(path);
}

/**
 * Delete a file from local storage
 */
export async function deleteFromLocal(key: string): Promise<void> {
  const path = getLocalPath(key);
  try {
    await unlink(path);
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Check if a file exists in local storage
 */
export async function fileExistsLocally(key: string): Promise<boolean> {
  const path = getLocalPath(key);
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the local URL for a file (for development)
 */
export function getLocalUrl(key: string): string {
  return `/api/storage/${key}`;
}
