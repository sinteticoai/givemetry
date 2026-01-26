// T021: Secure token generation utilities
import { randomBytes, createHash } from "crypto";

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

/**
 * Generate a secure verification token for email verification
 */
export function generateVerificationToken(): {
  token: string;
  hashedToken: string;
  expires: Date;
} {
  const token = generateToken(32);
  const hashedToken = hashToken(token);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return { token, hashedToken, expires };
}

/**
 * Generate a password reset token
 */
export function generatePasswordResetToken(): {
  token: string;
  hashedToken: string;
  expires: Date;
} {
  const token = generateToken(32);
  const hashedToken = hashToken(token);
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  return { token, hashedToken, expires };
}

/**
 * Hash a token for storage (one-way)
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verify a token against its hash
 */
export function verifyToken(token: string, hashedToken: string): boolean {
  const hash = hashToken(token);
  return hash === hashedToken;
}

/**
 * Generate a slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a unique slug with a random suffix
 */
export function generateUniqueSlug(text: string): string {
  const baseSlug = generateSlug(text);
  const suffix = randomBytes(4).toString("hex");
  return `${baseSlug}-${suffix}`;
}
