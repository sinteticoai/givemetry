// T071: Unit tests for CSV parser
import { describe, it, expect, vi } from "vitest";

// Import will be created in src/server/services/upload/csv-parser.ts
import {
  parseCSV,
  parseCSVStream,
  detectDelimiter,
  detectColumns,
  getRowCount,
  validateCSVStructure,
  type ParseResult,
  type ParseOptions,
} from "@/server/services/upload/csv-parser";

describe("CSV Parser", () => {
  describe("parseCSV", () => {
    it("parses a simple CSV string with headers", async () => {
      const csv = `name,email,amount
John Doe,john@example.com,1000
Jane Smith,jane@example.com,2500`;

      const result = await parseCSV(csv);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        name: "John Doe",
        email: "john@example.com",
        amount: "1000",
      });
      expect(result.meta.fields).toEqual(["name", "email", "amount"]);
    });

    it("handles quoted fields with commas", async () => {
      const csv = `name,address,amount
"Smith, John","123 Main St, Apt 4",5000`;

      const result = await parseCSV(csv);

      expect(result.data[0].name).toBe("Smith, John");
      expect(result.data[0].address).toBe("123 Main St, Apt 4");
    });

    it("handles quoted fields with newlines", async () => {
      const csv = `name,notes,amount
"John Doe","Line 1
Line 2",1000`;

      const result = await parseCSV(csv);

      expect(result.data[0].notes).toBe("Line 1\nLine 2");
    });

    it("handles escaped quotes", async () => {
      const csv = `name,nickname
"John ""Johnny"" Doe",Johnny`;

      const result = await parseCSV(csv);

      expect(result.data[0].name).toBe('John "Johnny" Doe');
    });

    it("handles empty values", async () => {
      const csv = `name,email,phone
John Doe,,555-1234
Jane Smith,jane@example.com,`;

      const result = await parseCSV(csv);

      expect(result.data[0].email).toBe("");
      expect(result.data[1].phone).toBe("");
    });

    it("skips empty lines", async () => {
      const csv = `name,amount
John,1000

Jane,2000

`;

      const result = await parseCSV(csv, { skipEmptyLines: true });

      expect(result.data).toHaveLength(2);
    });

    it("trims whitespace from values", async () => {
      const csv = `name,amount
  John Doe  ,  1000  `;

      const result = await parseCSV(csv, { trimValues: true });

      expect(result.data[0].name).toBe("John Doe");
      expect(result.data[0].amount).toBe("1000");
    });

    it("reports parsing errors with row numbers", async () => {
      const csv = `name,amount
John,1000
Jane,2000,extra,columns,here
Bob,3000`;

      const result = await parseCSV(csv);

      // Should still parse what it can
      expect(result.data).toHaveLength(3);
      // Should report the error
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(3); // 1-indexed, row 3 has extra columns
    });
  });

  describe("parseCSVStream", () => {
    it("streams CSV data in chunks", async () => {
      const csv = `name,amount
John,1000
Jane,2000
Bob,3000
Alice,4000
Eve,5000`;

      const chunks: Array<Record<string, string>[]> = [];

      await parseCSVStream(csv, {
        chunkSize: 2,
        onChunk: (data) => {
          chunks.push(data);
        },
      });

      expect(chunks).toHaveLength(3); // 2, 2, 1
      expect(chunks[0]).toHaveLength(2);
      expect(chunks[1]).toHaveLength(2);
      expect(chunks[2]).toHaveLength(1);
    });

    it("provides progress callbacks", async () => {
      const csv = `name,amount
John,1000
Jane,2000
Bob,3000`;

      const progressValues: number[] = [];

      await parseCSVStream(csv, {
        chunkSize: 1,
        onProgress: (progress) => {
          progressValues.push(progress);
        },
      });

      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });

    it("can be aborted mid-stream", async () => {
      const csv = `name,amount
John,1000
Jane,2000
Bob,3000
Alice,4000
Eve,5000`;

      let chunksProcessed = 0;

      await parseCSVStream(csv, {
        chunkSize: 1,
        onChunk: (data, abort) => {
          chunksProcessed++;
          if (chunksProcessed >= 2) {
            abort();
          }
        },
      });

      expect(chunksProcessed).toBe(2);
    });
  });

  describe("detectDelimiter", () => {
    it("detects comma delimiter", () => {
      const sample = `name,email,amount
John,john@example.com,1000`;

      expect(detectDelimiter(sample)).toBe(",");
    });

    it("detects tab delimiter", () => {
      const sample = `name\temail\tamount
John\tjohn@example.com\t1000`;

      expect(detectDelimiter(sample)).toBe("\t");
    });

    it("detects semicolon delimiter", () => {
      const sample = `name;email;amount
John;john@example.com;1000`;

      expect(detectDelimiter(sample)).toBe(";");
    });

    it("detects pipe delimiter", () => {
      const sample = `name|email|amount
John|john@example.com|1000`;

      expect(detectDelimiter(sample)).toBe("|");
    });

    it("defaults to comma for ambiguous data", () => {
      const sample = `single column
no delimiter here`;

      expect(detectDelimiter(sample)).toBe(",");
    });

    it("handles mixed delimiters by choosing most frequent", () => {
      const sample = `name,email;amount
John,john@example.com;1000
Jane,jane@example.com;2000`;

      // Comma appears 4 times, semicolon 2 times
      expect(detectDelimiter(sample)).toBe(",");
    });
  });

  describe("detectColumns", () => {
    it("extracts column headers from first row", async () => {
      const csv = `Constituent ID,First Name,Last Name,Email
12345,John,Doe,john@example.com`;

      const columns = await detectColumns(csv);

      expect(columns).toEqual([
        "Constituent ID",
        "First Name",
        "Last Name",
        "Email",
      ]);
    });

    it("normalizes column names", async () => {
      const csv = `  FIRST NAME  ,Last_Name,Email Address,phone#
John,Doe,john@example.com,555-1234`;

      const columns = await detectColumns(csv, { normalize: true });

      expect(columns).toEqual([
        "firstName",
        "lastName",
        "emailAddress",
        "phone",
      ]);
    });

    it("generates column names when header row is missing", async () => {
      const csv = `John,Doe,john@example.com,1000`;

      const columns = await detectColumns(csv, { hasHeader: false });

      expect(columns).toEqual(["column1", "column2", "column3", "column4"]);
    });

    it("handles duplicate column names", async () => {
      const csv = `Name,Email,Name,Email
John,john@example.com,Doe,doe@example.com`;

      const columns = await detectColumns(csv);

      expect(columns).toEqual(["Name", "Email", "Name_2", "Email_2"]);
    });
  });

  describe("getRowCount", () => {
    it("counts rows excluding header", async () => {
      const csv = `name,amount
John,1000
Jane,2000
Bob,3000`;

      const count = await getRowCount(csv);

      expect(count).toBe(3);
    });

    it("counts rows including header when specified", async () => {
      const csv = `name,amount
John,1000
Jane,2000`;

      const count = await getRowCount(csv, { includeHeader: true });

      expect(count).toBe(3);
    });

    it("handles empty CSV", async () => {
      const csv = "";

      const count = await getRowCount(csv);

      expect(count).toBe(0);
    });

    it("handles header-only CSV", async () => {
      const csv = "name,amount";

      const count = await getRowCount(csv);

      expect(count).toBe(0);
    });
  });

  describe("validateCSVStructure", () => {
    it("validates a well-formed CSV", async () => {
      const csv = `name,email,amount
John,john@example.com,1000
Jane,jane@example.com,2000`;

      const validation = await validateCSVStructure(csv);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("detects inconsistent column counts", async () => {
      const csv = `name,email,amount
John,john@example.com,1000,extra
Jane,jane@example.com`;

      const validation = await validateCSVStructure(csv);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          type: "inconsistent_columns",
        })
      );
    });

    it("detects missing required columns", async () => {
      const csv = `name,email
John,john@example.com`;

      const validation = await validateCSVStructure(csv, {
        requiredColumns: ["name", "email", "amount"],
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          type: "missing_required_column",
          column: "amount",
        })
      );
    });

    it("detects completely empty file", async () => {
      const csv = "";

      const validation = await validateCSVStructure(csv);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          type: "empty_file",
        })
      );
    });

    it("detects file with only headers", async () => {
      const csv = "name,email,amount";

      const validation = await validateCSVStructure(csv);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          type: "no_data_rows",
        })
      );
    });

    it("validates date format detection in columns", async () => {
      const csv = `name,date,amount
John,2024-01-15,1000
Jane,not-a-date,2000`;

      const validation = await validateCSVStructure(csv, {
        validateDataTypes: {
          date: "date",
        },
      });

      expect(validation.warnings).toContainEqual(
        expect.objectContaining({
          type: "invalid_date_format",
          row: 3,
        })
      );
    });

    it("validates numeric format in columns", async () => {
      const csv = `name,email,amount
John,john@example.com,1000
Jane,jane@example.com,not-a-number`;

      const validation = await validateCSVStructure(csv, {
        validateDataTypes: {
          amount: "number",
        },
      });

      expect(validation.warnings).toContainEqual(
        expect.objectContaining({
          type: "invalid_number_format",
          row: 3,
        })
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles Windows line endings (CRLF)", async () => {
      const csv = "name,amount\r\nJohn,1000\r\nJane,2000";

      const result = await parseCSV(csv);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe("John");
    });

    it("handles Mac classic line endings (CR)", async () => {
      const csv = "name,amount\rJohn,1000\rJane,2000";

      const result = await parseCSV(csv);

      expect(result.data).toHaveLength(2);
    });

    it("handles BOM (Byte Order Mark)", async () => {
      const csv = "\uFEFFname,amount\nJohn,1000";

      const result = await parseCSV(csv);

      expect(result.meta.fields).toContain("name");
      expect(result.data[0]).toHaveProperty("name");
    });

    it("handles very long fields", async () => {
      const longValue = "a".repeat(10000);
      const csv = `name,description
John,${longValue}`;

      const result = await parseCSV(csv);

      expect(result.data[0].description).toHaveLength(10000);
    });

    it("handles special characters in values", async () => {
      const csv = `name,notes
John,"Emoji: 🎉 Symbol: © Currency: $100"`;

      const result = await parseCSV(csv);

      expect(result.data[0].notes).toContain("🎉");
      expect(result.data[0].notes).toContain("©");
      expect(result.data[0].notes).toContain("$100");
    });

    it("handles null bytes in data", async () => {
      const csv = `name,amount
John\x00Doe,1000`;

      const result = await parseCSV(csv);

      // Should handle gracefully, either remove or escape
      expect(result.data).toHaveLength(1);
    });
  });
});
