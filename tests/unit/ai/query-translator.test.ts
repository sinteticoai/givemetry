// T176: Unit tests for query translator
import { describe, it, expect } from "vitest";
import {
  translateQueryToPrisma,
  type QueryFilter,
  translateRelativeDate,
} from "@/server/services/ai/query-translator";

describe("Query Translator", () => {
  describe("translateQueryToPrisma", () => {
    it("translates total_giving filter with gte operator", () => {
      const filters: QueryFilter[] = [
        { field: "total_giving", operator: "gte", value: 10000 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result).toHaveProperty("organizationId", "org-123");
      // total_giving requires aggregation, so we expect a raw query hint
      expect(result._rawAggregation).toBeDefined();
      expect(result._rawAggregation).toContainEqual({
        field: "total_giving",
        operator: "gte",
        value: 10000,
      });
    });

    it("translates last_gift_date filter with lt operator", () => {
      const filters: QueryFilter[] = [
        { field: "last_gift_date", operator: "lt", value: "2025-06-01" },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result).toHaveProperty("organizationId", "org-123");
      // last_gift_date also requires aggregation
      expect(result._rawAggregation).toBeDefined();
    });

    it("translates last_contact_date filter", () => {
      const filters: QueryFilter[] = [
        { field: "last_contact_date", operator: "lt", value: "6_months_ago" },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result).toHaveProperty("organizationId", "org-123");
      expect(result._rawAggregation).toBeDefined();
    });

    it("translates lapse_risk filter directly to constituent field", () => {
      const filters: QueryFilter[] = [
        { field: "lapse_risk", operator: "gt", value: 0.7 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result).toHaveProperty("organizationId", "org-123");
      expect(result).toHaveProperty("lapseRiskScore");
      expect(result.lapseRiskScore).toEqual({ gt: 0.7 });
    });

    it("translates priority_score filter directly to constituent field", () => {
      const filters: QueryFilter[] = [
        { field: "priority_score", operator: "gte", value: 0.8 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.priorityScore).toEqual({ gte: 0.8 });
    });

    it("translates capacity filter to estimatedCapacity field", () => {
      const filters: QueryFilter[] = [
        { field: "capacity", operator: "gte", value: 100000 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.estimatedCapacity).toEqual({ gte: 100000 });
    });

    it("translates constituent_type filter with eq operator", () => {
      const filters: QueryFilter[] = [
        { field: "constituent_type", operator: "eq", value: "alumni" },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.constituentType).toBe("alumni");
    });

    it("translates assigned_officer filter", () => {
      const filters: QueryFilter[] = [
        { field: "assigned_officer", operator: "eq", value: "officer-456" },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.assignedOfficerId).toBe("officer-456");
    });

    it("translates class_year filter", () => {
      const filters: QueryFilter[] = [
        { field: "class_year", operator: "eq", value: 2010 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.classYear).toBe(2010);
    });

    it("translates school_college filter with contains operator", () => {
      const filters: QueryFilter[] = [
        { field: "school_college", operator: "contains", value: "Engineering" },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.schoolCollege).toEqual({
        contains: "Engineering",
        mode: "insensitive",
      });
    });

    it("translates multiple filters into AND conditions", () => {
      const filters: QueryFilter[] = [
        { field: "lapse_risk", operator: "gt", value: 0.7 },
        { field: "constituent_type", operator: "eq", value: "alumni" },
        { field: "class_year", operator: "gte", value: 2000 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.lapseRiskScore).toEqual({ gt: 0.7 });
      expect(result.constituentType).toBe("alumni");
      expect(result.classYear).toEqual({ gte: 2000 });
    });

    it("handles between operator for dates", () => {
      const filters: QueryFilter[] = [
        { field: "class_year", operator: "between", value: [2000, 2010] },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.classYear).toEqual({
        gte: 2000,
        lte: 2010,
      });
    });

    it("handles in operator for multiple values", () => {
      const filters: QueryFilter[] = [
        { field: "constituent_type", operator: "in", value: ["alumni", "parent"] },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.constituentType).toEqual({
        in: ["alumni", "parent"],
      });
    });

    it("returns empty filter object for unknown fields", () => {
      const filters: QueryFilter[] = [
        { field: "unknown_field" as never, operator: "eq", value: "test" },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.organizationId).toBe("org-123");
      expect(Object.keys(result)).not.toContain("unknown_field");
    });

    it("handles empty filters array", () => {
      const filters: QueryFilter[] = [];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result).toEqual({
        organizationId: "org-123",
        isActive: true,
      });
    });

    it("always includes isActive: true for soft delete filtering", () => {
      const filters: QueryFilter[] = [
        { field: "lapse_risk", operator: "gt", value: 0.5 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.isActive).toBe(true);
    });
  });

  describe("translateRelativeDate", () => {
    it("translates 6_months_ago to a date 6 months in the past", () => {
      const now = new Date("2026-01-26");
      const result = translateRelativeDate("6_months_ago", now);

      expect(result).toBeInstanceOf(Date);
      expect(result.getMonth()).toBe(6); // July (0-indexed, 6 months before January)
      expect(result.getFullYear()).toBe(2025);
    });

    it("translates 1_year_ago to a date 1 year in the past", () => {
      const now = new Date("2026-01-26");
      const result = translateRelativeDate("1_year_ago", now);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
    });

    it("translates 3_months_ago correctly", () => {
      const now = new Date("2026-01-26");
      const result = translateRelativeDate("3_months_ago", now);

      expect(result.getMonth()).toBe(9); // October
      expect(result.getFullYear()).toBe(2025);
    });

    it("handles 30_days_ago", () => {
      const now = new Date("2026-01-26");
      const result = translateRelativeDate("30_days_ago", now);

      expect(result).toBeInstanceOf(Date);
      // Should be approximately December 27, 2025
      const diffDays = Math.round((now.getTime() - result.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });

    it("returns ISO date string as-is when already a date", () => {
      const result = translateRelativeDate("2025-06-15");

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString().startsWith("2025-06-15")).toBe(true);
    });

    it("handles last_fiscal_year", () => {
      const now = new Date("2026-01-26");
      const result = translateRelativeDate("last_fiscal_year", now);

      // Should return fiscal year boundaries (July 1 - June 30)
      expect(result).toBeInstanceOf(Date);
    });

    it("throws error for invalid relative date format", () => {
      expect(() => translateRelativeDate("invalid_format")).toThrow();
    });
  });

  describe("operator translation", () => {
    it("translates eq to direct value", () => {
      const filters: QueryFilter[] = [
        { field: "constituent_type", operator: "eq", value: "alumni" },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.constituentType).toBe("alumni");
    });

    it("translates gt to Prisma gt operator", () => {
      const filters: QueryFilter[] = [
        { field: "lapse_risk", operator: "gt", value: 0.5 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.lapseRiskScore).toEqual({ gt: 0.5 });
    });

    it("translates gte to Prisma gte operator", () => {
      const filters: QueryFilter[] = [
        { field: "priority_score", operator: "gte", value: 0.8 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.priorityScore).toEqual({ gte: 0.8 });
    });

    it("translates lt to Prisma lt operator", () => {
      const filters: QueryFilter[] = [
        { field: "lapse_risk", operator: "lt", value: 0.3 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.lapseRiskScore).toEqual({ lt: 0.3 });
    });

    it("translates lte to Prisma lte operator", () => {
      const filters: QueryFilter[] = [
        { field: "class_year", operator: "lte", value: 2000 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.classYear).toEqual({ lte: 2000 });
    });
  });

  describe("edge cases", () => {
    it("handles null values gracefully", () => {
      const filters: QueryFilter[] = [
        { field: "lapse_risk", operator: "eq", value: null as never },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      // Should not crash, might skip or handle null
      expect(result.organizationId).toBe("org-123");
    });

    it("handles numeric strings for numeric fields", () => {
      const filters: QueryFilter[] = [
        { field: "class_year", operator: "eq", value: "2010" as never },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.classYear).toBe(2010);
    });

    it("handles decimal values for score fields", () => {
      const filters: QueryFilter[] = [
        { field: "lapse_risk", operator: "gte", value: 0.75 },
      ];

      const result = translateQueryToPrisma(filters, "org-123");

      expect(result.lapseRiskScore).toEqual({ gte: 0.75 });
    });
  });
});
