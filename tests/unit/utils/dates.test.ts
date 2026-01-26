// T072: Unit tests for date detection utilities
import { describe, it, expect } from "vitest";

// Import will be created in src/lib/utils/dates.ts
import {
  parseDate,
  detectDateFormat,
  formatDate,
  isValidDate,
  normalizeDate,
  parseDateRange,
  getDateFromSample,
  DATE_FORMATS,
  type DateFormatResult,
} from "@/lib/utils/dates";

describe("Date Utilities", () => {
  describe("parseDate", () => {
    describe("ISO 8601 formats", () => {
      it("parses YYYY-MM-DD format", () => {
        const result = parseDate("2024-01-15");

        expect(result).toBeInstanceOf(Date);
        expect(result?.getFullYear()).toBe(2024);
        expect(result?.getMonth()).toBe(0); // January is 0
        expect(result?.getDate()).toBe(15);
      });

      it("parses YYYY-MM-DD with time", () => {
        const result = parseDate("2024-01-15T14:30:00");

        expect(result?.getHours()).toBe(14);
        expect(result?.getMinutes()).toBe(30);
      });

      it("parses YYYY-MM-DD with timezone", () => {
        const result = parseDate("2024-01-15T14:30:00Z");

        expect(result).toBeInstanceOf(Date);
      });
    });

    describe("US date formats", () => {
      it("parses MM/DD/YYYY format", () => {
        const result = parseDate("01/15/2024");

        expect(result?.getFullYear()).toBe(2024);
        expect(result?.getMonth()).toBe(0);
        expect(result?.getDate()).toBe(15);
      });

      it("parses M/D/YYYY format (no leading zeros)", () => {
        const result = parseDate("1/5/2024");

        expect(result?.getMonth()).toBe(0);
        expect(result?.getDate()).toBe(5);
      });

      it("parses MM/DD/YY format (2-digit year)", () => {
        const result = parseDate("01/15/24");

        expect(result?.getFullYear()).toBe(2024);
      });

      it("handles 2-digit years correctly for 20th century", () => {
        // Years 00-29 should map to 2000-2029
        // Years 30-99 should map to 1930-1999
        expect(parseDate("01/15/99")?.getFullYear()).toBe(1999);
        expect(parseDate("01/15/25")?.getFullYear()).toBe(2025);
      });
    });

    describe("European date formats", () => {
      it("parses DD/MM/YYYY format when specified", () => {
        const result = parseDate("15/01/2024", { format: "DD/MM/YYYY" });

        expect(result?.getMonth()).toBe(0); // January
        expect(result?.getDate()).toBe(15);
      });

      it("parses DD-MM-YYYY format", () => {
        const result = parseDate("15-01-2024", { format: "DD-MM-YYYY" });

        expect(result?.getMonth()).toBe(0);
        expect(result?.getDate()).toBe(15);
      });
    });

    describe("Natural language dates", () => {
      it("parses 'January 15, 2024'", () => {
        const result = parseDate("January 15, 2024");

        expect(result?.getFullYear()).toBe(2024);
        expect(result?.getMonth()).toBe(0);
        expect(result?.getDate()).toBe(15);
      });

      it("parses 'Jan 15, 2024'", () => {
        const result = parseDate("Jan 15, 2024");

        expect(result?.getMonth()).toBe(0);
        expect(result?.getDate()).toBe(15);
      });

      it("parses '15 January 2024'", () => {
        const result = parseDate("15 January 2024");

        expect(result?.getDate()).toBe(15);
        expect(result?.getMonth()).toBe(0);
      });

      it("parses '15-Jan-2024'", () => {
        const result = parseDate("15-Jan-2024");

        expect(result?.getDate()).toBe(15);
        expect(result?.getMonth()).toBe(0);
      });
    });

    describe("Edge cases", () => {
      it("returns null for empty string", () => {
        expect(parseDate("")).toBeNull();
      });

      it("returns null for null input", () => {
        expect(parseDate(null as unknown as string)).toBeNull();
      });

      it("returns null for undefined input", () => {
        expect(parseDate(undefined as unknown as string)).toBeNull();
      });

      it("returns null for invalid date string", () => {
        expect(parseDate("not a date")).toBeNull();
      });

      it("returns null for impossible dates", () => {
        expect(parseDate("02/30/2024")).toBeNull(); // Feb 30 doesn't exist
        expect(parseDate("13/01/2024")).toBeNull(); // Month 13 doesn't exist (US format)
      });

      it("handles whitespace", () => {
        const result = parseDate("  2024-01-15  ");

        expect(result?.getDate()).toBe(15);
      });
    });
  });

  describe("detectDateFormat", () => {
    it("detects ISO format from sample", () => {
      const samples = ["2024-01-15", "2024-02-20", "2024-03-25"];

      const result = detectDateFormat(samples);

      expect(result.format).toBe("YYYY-MM-DD");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("detects US format from sample", () => {
      const samples = ["01/15/2024", "02/20/2024", "03/25/2024"];

      const result = detectDateFormat(samples);

      expect(result.format).toBe("MM/DD/YYYY");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("detects European format from unambiguous sample", () => {
      // Days > 12 make it unambiguous that day comes first
      const samples = ["15/01/2024", "20/02/2024", "25/03/2024"];

      const result = detectDateFormat(samples);

      expect(result.format).toBe("DD/MM/YYYY");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("returns low confidence for ambiguous dates", () => {
      // All dates are ambiguous (day and month both <= 12)
      const samples = ["01/05/2024", "02/06/2024", "03/07/2024"];

      const result = detectDateFormat(samples);

      // Should still pick a format but with lower confidence
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.ambiguous).toBe(true);
    });

    it("detects natural language format", () => {
      const samples = ["January 15, 2024", "February 20, 2024", "March 25, 2024"];

      const result = detectDateFormat(samples);

      expect(result.format).toBe("MMMM D, YYYY");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("handles mixed formats with majority voting", () => {
      const samples = [
        "2024-01-15",
        "2024-02-20",
        "2024-03-25",
        "01/15/2024", // Outlier
      ];

      const result = detectDateFormat(samples);

      expect(result.format).toBe("YYYY-MM-DD");
      expect(result.confidence).toBeLessThan(1);
    });

    it("returns null format for unparseable samples", () => {
      const samples = ["not a date", "also not", "nope"];

      const result = detectDateFormat(samples);

      expect(result.format).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it("handles empty sample array", () => {
      const result = detectDateFormat([]);

      expect(result.format).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  describe("formatDate", () => {
    it("formats date to ISO string", () => {
      const date = new Date(2024, 0, 15);

      expect(formatDate(date, "YYYY-MM-DD")).toBe("2024-01-15");
    });

    it("formats date to US format", () => {
      const date = new Date(2024, 0, 15);

      expect(formatDate(date, "MM/DD/YYYY")).toBe("01/15/2024");
    });

    it("formats date to European format", () => {
      const date = new Date(2024, 0, 15);

      expect(formatDate(date, "DD/MM/YYYY")).toBe("15/01/2024");
    });

    it("formats date with time", () => {
      const date = new Date(2024, 0, 15, 14, 30, 45);

      expect(formatDate(date, "YYYY-MM-DD HH:mm:ss")).toBe("2024-01-15 14:30:45");
    });

    it("handles natural language format", () => {
      const date = new Date(2024, 0, 15);

      expect(formatDate(date, "MMMM D, YYYY")).toBe("January 15, 2024");
    });

    it("returns empty string for invalid date", () => {
      expect(formatDate(new Date("invalid"), "YYYY-MM-DD")).toBe("");
    });
  });

  describe("isValidDate", () => {
    it("returns true for valid Date object", () => {
      expect(isValidDate(new Date(2024, 0, 15))).toBe(true);
    });

    it("returns false for Invalid Date", () => {
      expect(isValidDate(new Date("invalid"))).toBe(false);
    });

    it("returns false for null", () => {
      expect(isValidDate(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isValidDate(undefined)).toBe(false);
    });

    it("validates date range when min/max provided", () => {
      const date = new Date(2024, 0, 15);
      const min = new Date(2024, 0, 1);
      const max = new Date(2024, 11, 31);

      expect(isValidDate(date, { min, max })).toBe(true);
      expect(isValidDate(new Date(2023, 11, 31), { min, max })).toBe(false);
      expect(isValidDate(new Date(2025, 0, 1), { min, max })).toBe(false);
    });
  });

  describe("normalizeDate", () => {
    it("normalizes to start of day in UTC", () => {
      const result = normalizeDate("2024-01-15T14:30:00");

      expect(result?.getUTCHours()).toBe(0);
      expect(result?.getUTCMinutes()).toBe(0);
      expect(result?.getUTCSeconds()).toBe(0);
    });

    it("normalizes various formats to consistent Date", () => {
      const date1 = normalizeDate("2024-01-15");
      const date2 = normalizeDate("01/15/2024");
      const date3 = normalizeDate("January 15, 2024");

      expect(date1?.getTime()).toBe(date2?.getTime());
      expect(date2?.getTime()).toBe(date3?.getTime());
    });

    it("returns null for unparseable input", () => {
      expect(normalizeDate("not a date")).toBeNull();
    });
  });

  describe("parseDateRange", () => {
    it("parses 'last_year' relative range", () => {
      const range = parseDateRange("last_year");

      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
    });

    it("parses 'last_30_days' relative range", () => {
      const range = parseDateRange("last_30_days");
      const daysDiff = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24);

      expect(daysDiff).toBeCloseTo(30, 0);
    });

    it("parses 'last_fiscal_year' relative range", () => {
      const range = parseDateRange("last_fiscal_year", { fiscalYearStart: 7 }); // July

      expect(range.start.getMonth()).toBe(6); // July (0-indexed)
    });

    it("parses absolute date range", () => {
      const range = parseDateRange("2024-01-01..2024-12-31");

      expect(range.start.getFullYear()).toBe(2024);
      expect(range.start.getMonth()).toBe(0);
      expect(range.end.getFullYear()).toBe(2024);
      expect(range.end.getMonth()).toBe(11);
    });
  });

  describe("getDateFromSample", () => {
    it("extracts the first valid date from samples", () => {
      const samples = ["not a date", "also not", "2024-01-15"];

      const result = getDateFromSample(samples);

      expect(result?.getFullYear()).toBe(2024);
    });

    it("returns null if no valid dates found", () => {
      const samples = ["not a date", "also not", "nope"];

      expect(getDateFromSample(samples)).toBeNull();
    });
  });

  describe("DATE_FORMATS constant", () => {
    it("includes common date formats", () => {
      expect(DATE_FORMATS).toContain("YYYY-MM-DD");
      expect(DATE_FORMATS).toContain("MM/DD/YYYY");
      expect(DATE_FORMATS).toContain("DD/MM/YYYY");
      expect(DATE_FORMATS).toContain("MMMM D, YYYY");
    });
  });

  describe("Advancement-specific date scenarios", () => {
    it("handles fiscal year dates (July start)", () => {
      const result = parseDate("FY2024", { fiscalYearStart: 7 });

      // FY2024 = July 1, 2023 to June 30, 2024
      expect(result?.getFullYear()).toBe(2023);
      expect(result?.getMonth()).toBe(6); // July
    });

    it("handles graduation year (class year)", () => {
      const result = parseDate("Class of 2024");

      expect(result?.getFullYear()).toBe(2024);
    });

    it("handles partial dates (year only)", () => {
      const result = parseDate("2024", { allowPartial: true });

      expect(result?.getFullYear()).toBe(2024);
    });

    it("handles partial dates (month and year only)", () => {
      const result = parseDate("January 2024", { allowPartial: true });

      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
    });

    it("handles Excel serial date numbers", () => {
      // Excel stores dates as days since 1900-01-01
      // 45306 = 2024-01-15
      const result = parseDate("45306", { allowExcelSerial: true });

      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });
  });
});
