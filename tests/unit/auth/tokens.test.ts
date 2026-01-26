// T042: Unit tests for auth token utilities
import { describe, it, expect } from "vitest";
import {
  generateToken,
  generateVerificationToken,
  generatePasswordResetToken,
  hashToken,
  verifyToken,
  generateSlug,
  generateUniqueSlug,
} from "@/lib/auth/tokens";

describe("Token Utilities", () => {
  describe("generateToken", () => {
    it("generates a token of default length (64 hex chars = 32 bytes)", () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it("generates a token of specified length", () => {
      const token = generateToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it("generates unique tokens on each call", () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toEqual(token2);
    });
  });

  describe("generateVerificationToken", () => {
    it("returns token, hashedToken, and expires", () => {
      const result = generateVerificationToken();
      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("hashedToken");
      expect(result).toHaveProperty("expires");
    });

    it("generates a 64-char hex token", () => {
      const { token } = generateVerificationToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it("hashes the token differently than the original", () => {
      const { token, hashedToken } = generateVerificationToken();
      expect(hashedToken).not.toEqual(token);
      expect(hashedToken).toHaveLength(64); // SHA-256 = 64 hex chars
    });

    it("sets expiry to 24 hours from now", () => {
      const before = Date.now();
      const { expires } = generateVerificationToken();
      const after = Date.now();

      const expectedMin = before + 24 * 60 * 60 * 1000;
      const expectedMax = after + 24 * 60 * 60 * 1000;

      expect(expires.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expires.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe("generatePasswordResetToken", () => {
    it("returns token, hashedToken, and expires", () => {
      const result = generatePasswordResetToken();
      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("hashedToken");
      expect(result).toHaveProperty("expires");
    });

    it("sets expiry to 1 hour from now", () => {
      const before = Date.now();
      const { expires } = generatePasswordResetToken();
      const after = Date.now();

      const expectedMin = before + 60 * 60 * 1000;
      const expectedMax = after + 60 * 60 * 1000;

      expect(expires.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expires.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe("hashToken / verifyToken", () => {
    it("hashes a token deterministically", () => {
      const token = "test-token-123";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toEqual(hash2);
    });

    it("produces different hashes for different tokens", () => {
      const hash1 = hashToken("token-a");
      const hash2 = hashToken("token-b");
      expect(hash1).not.toEqual(hash2);
    });

    it("verifies a token against its hash", () => {
      const token = "my-secret-token";
      const hash = hashToken(token);
      expect(verifyToken(token, hash)).toBe(true);
    });

    it("rejects incorrect tokens", () => {
      const token = "correct-token";
      const hash = hashToken(token);
      expect(verifyToken("wrong-token", hash)).toBe(false);
    });
  });

  describe("generateSlug", () => {
    it("converts to lowercase", () => {
      expect(generateSlug("HELLO WORLD")).toBe("hello-world");
    });

    it("replaces spaces with hyphens", () => {
      expect(generateSlug("hello world")).toBe("hello-world");
    });

    it("removes special characters", () => {
      expect(generateSlug("Hello, World!")).toBe("hello-world");
    });

    it("collapses multiple spaces/hyphens", () => {
      expect(generateSlug("hello   world")).toBe("hello-world");
      expect(generateSlug("hello---world")).toBe("hello-world");
    });

    it("trims leading/trailing hyphens", () => {
      expect(generateSlug("  hello world  ")).toBe("hello-world");
      expect(generateSlug("-hello-world-")).toBe("hello-world");
    });

    it("handles organization names correctly", () => {
      expect(generateSlug("Acme University")).toBe("acme-university");
      expect(generateSlug("St. Mary's College")).toBe("st-marys-college");
      expect(generateSlug("University of California, Berkeley")).toBe(
        "university-of-california-berkeley"
      );
    });
  });

  describe("generateUniqueSlug", () => {
    it("includes the base slug", () => {
      const slug = generateUniqueSlug("Test Organization");
      expect(slug).toContain("test-organization");
    });

    it("appends a random suffix", () => {
      const slug = generateUniqueSlug("Test");
      // Format: base-slug-8hexchars
      expect(slug).toMatch(/^test-[a-f0-9]{8}$/);
    });

    it("generates unique slugs each time", () => {
      const slug1 = generateUniqueSlug("Test");
      const slug2 = generateUniqueSlug("Test");
      expect(slug1).not.toEqual(slug2);
    });
  });
});
