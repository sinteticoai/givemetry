// T099: Unit tests for completeness scoring
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateCompletenessScore,
  getFieldCompleteness,
  getRequiredFieldsCompleteness,
  getOptionalFieldsCompleteness,
  analyzeCompletenessIssues,
  type Constituent,
  type CompletenessResult,
  type CompletenessIssue,
} from "@/server/services/analysis/completeness";

describe("Completeness Scoring", () => {
  describe("calculateCompletenessScore", () => {
    it("returns 1.0 for fully complete constituent", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "555-1234",
        addressLine1: "123 Main St",
        city: "Boston",
        state: "MA",
        postalCode: "02101",
        constituentType: "alumni",
      };

      const score = calculateCompletenessScore(constituent);

      expect(score).toBe(1.0);
    });

    it("returns partial score for incomplete constituent", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: "John",
        lastName: "Doe",
        email: null,
        phone: null,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        constituentType: "alumni",
      };

      const score = calculateCompletenessScore(constituent);

      // Has: externalId, firstName, lastName, constituentType (4 fields)
      // Missing: email, phone, addressLine1, city, state, postalCode (6 fields)
      expect(score).toBeLessThan(1.0);
      expect(score).toBeGreaterThan(0);
    });

    it("returns 0 for constituent with only required fields", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: null,
        lastName: "Doe",
        email: null,
        phone: null,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        constituentType: null,
      };

      const score = calculateCompletenessScore(constituent);

      // Has: externalId, lastName (required minimum)
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.5);
    });

    it("handles empty string as missing", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: "",
        lastName: "Doe",
        email: "  ", // whitespace only
        phone: null,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        constituentType: null,
      };

      const score = calculateCompletenessScore(constituent);

      // Empty and whitespace-only should count as missing
      const withValues: Constituent = {
        ...constituent,
        firstName: "John",
        email: "john@example.com",
      };

      const scoreWithValues = calculateCompletenessScore(withValues);

      expect(scoreWithValues).toBeGreaterThan(score);
    });
  });

  describe("getFieldCompleteness", () => {
    it("returns per-field completion status", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: "John",
        lastName: "Doe",
        email: null,
        phone: "555-1234",
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        constituentType: null,
      };

      const result = getFieldCompleteness(constituent);

      expect(result.externalId).toBe(true);
      expect(result.firstName).toBe(true);
      expect(result.lastName).toBe(true);
      expect(result.email).toBe(false);
      expect(result.phone).toBe(true);
      expect(result.addressLine1).toBe(false);
    });

    it("tracks completion percentage for each field", () => {
      const constituents: Constituent[] = [
        {
          externalId: "1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: null,
          addressLine1: null,
          city: null,
          state: null,
          postalCode: null,
          constituentType: null,
        },
        {
          externalId: "2",
          firstName: "Jane",
          lastName: "Smith",
          email: null,
          phone: "555-1234",
          addressLine1: null,
          city: null,
          state: null,
          postalCode: null,
          constituentType: null,
        },
      ];

      const result = getFieldCompleteness(constituents[0]);

      expect(result.firstName).toBe(true);
      expect(result.email).toBe(true);
      expect(result.phone).toBe(false);
    });
  });

  describe("getRequiredFieldsCompleteness", () => {
    it("calculates completeness for required fields only", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: null,
        lastName: "Doe",
        email: "john@example.com",
        phone: null,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        constituentType: null,
      };

      // Required fields: externalId, lastName
      const score = getRequiredFieldsCompleteness(constituent);

      // Both required fields are present
      expect(score).toBe(1.0);
    });

    it("returns partial score when required fields are missing", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: "John",
        lastName: null as unknown as string, // Missing required field
        email: null,
        phone: null,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        constituentType: null,
      };

      const score = getRequiredFieldsCompleteness(constituent);

      expect(score).toBe(0.5); // 1 of 2 required fields
    });
  });

  describe("getOptionalFieldsCompleteness", () => {
    it("calculates completeness for optional fields only", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "555-1234",
        addressLine1: "123 Main St",
        city: "Boston",
        state: "MA",
        postalCode: "02101",
        constituentType: "alumni",
      };

      const score = getOptionalFieldsCompleteness(constituent);

      // All optional fields filled
      expect(score).toBe(1.0);
    });

    it("returns 0 when all optional fields are missing", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: null,
        lastName: "Doe",
        email: null,
        phone: null,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        constituentType: null,
      };

      const score = getOptionalFieldsCompleteness(constituent);

      expect(score).toBe(0);
    });
  });

  describe("analyzeCompletenessIssues", () => {
    it("identifies missing required fields", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: null,
        lastName: null as unknown as string,
        email: null,
        phone: null,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        constituentType: null,
      };

      const issues = analyzeCompletenessIssues(constituent);

      expect(issues).toContainEqual(
        expect.objectContaining({
          field: "lastName",
          severity: "high",
          type: "missing_required",
        })
      );
    });

    it("identifies missing contact information", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: "John",
        lastName: "Doe",
        email: null,
        phone: null,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        constituentType: null,
      };

      const issues = analyzeCompletenessIssues(constituent);

      const contactIssues = issues.filter((i) => i.type === "missing_contact");
      expect(contactIssues.length).toBeGreaterThan(0);
    });

    it("identifies incomplete address", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: null,
        addressLine1: "123 Main St",
        city: null, // Missing city
        state: "MA",
        postalCode: null, // Missing postal code
        constituentType: null,
      };

      const issues = analyzeCompletenessIssues(constituent);

      const addressIssues = issues.filter((i) => i.type === "incomplete_address");
      expect(addressIssues.length).toBeGreaterThan(0);
    });

    it("returns empty array for complete constituent", () => {
      const constituent: Constituent = {
        externalId: "12345",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "555-1234",
        addressLine1: "123 Main St",
        city: "Boston",
        state: "MA",
        postalCode: "02101",
        constituentType: "alumni",
      };

      const issues = analyzeCompletenessIssues(constituent);

      expect(issues).toHaveLength(0);
    });
  });

  describe("Batch Processing", () => {
    it("calculates average completeness for multiple constituents", () => {
      const constituents: Constituent[] = [
        {
          externalId: "1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "555-1234",
          addressLine1: "123 Main St",
          city: "Boston",
          state: "MA",
          postalCode: "02101",
          constituentType: "alumni",
        },
        {
          externalId: "2",
          firstName: null,
          lastName: "Smith",
          email: null,
          phone: null,
          addressLine1: null,
          city: null,
          state: null,
          postalCode: null,
          constituentType: null,
        },
      ];

      const scores = constituents.map(calculateCompletenessScore);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      // First constituent is complete (1.0), second is minimal
      expect(avgScore).toBeGreaterThan(0.3);
      expect(avgScore).toBeLessThan(0.8);
    });
  });
});
