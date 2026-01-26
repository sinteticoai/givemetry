// T073: Unit tests for field mapper
import { describe, it, expect } from "vitest";

// Import will be created in src/server/services/upload/field-mapper.ts
import {
  suggestFieldMapping,
  validateFieldMapping,
  applyFieldMapping,
  normalizeColumnName,
  getRequiredFields,
  getOptionalFields,
  calculateMappingConfidence,
  findBestMatch,
  type FieldMapping,
  type MappingSuggestion,
  type DataType,
} from "@/server/services/upload/field-mapper";

describe("Field Mapper", () => {
  describe("suggestFieldMapping", () => {
    describe("constituent data mapping", () => {
      it("maps common constituent columns automatically", () => {
        const columns = [
          "Constituent ID",
          "First Name",
          "Last Name",
          "Email Address",
          "Home Phone",
        ];

        const suggestions = suggestFieldMapping(columns, "constituents");

        expect(suggestions.mapping).toMatchObject({
          "Constituent ID": "externalId",
          "First Name": "firstName",
          "Last Name": "lastName",
          "Email Address": "email",
          "Home Phone": "phone",
        });
      });

      it("handles Blackbaud column naming conventions", () => {
        const columns = [
          "KEYID",
          "FIRSTNM",
          "LASTNM",
          "EMAILADDRESS",
          "HOMEPHONE",
        ];

        const suggestions = suggestFieldMapping(columns, "constituents");

        expect(suggestions.mapping).toMatchObject({
          "KEYID": "externalId",
          "FIRSTNM": "firstName",
          "LASTNM": "lastName",
        });
      });

      it("handles Salesforce column naming conventions", () => {
        const columns = [
          "Account ID",
          "First_Name__c",
          "Last_Name__c",
          "Email__c",
        ];

        const suggestions = suggestFieldMapping(columns, "constituents");

        expect(suggestions.mapping).toMatchObject({
          "Account ID": "externalId",
          "First_Name__c": "firstName",
          "Last_Name__c": "lastName",
          "Email__c": "email",
        });
      });

      it("identifies unmapped columns", () => {
        const columns = [
          "Constituent ID",
          "First Name",
          "Custom Field XYZ",
          "Another Random Column",
        ];

        const suggestions = suggestFieldMapping(columns, "constituents");

        expect(suggestions.unmappedColumns).toContain("Custom Field XYZ");
        expect(suggestions.unmappedColumns).toContain("Another Random Column");
      });

      it("provides confidence scores for each mapping", () => {
        const columns = ["ConstituentID", "FName", "LName"];

        const suggestions = suggestFieldMapping(columns, "constituents");

        expect(suggestions.confidence["ConstituentID"]).toBeGreaterThan(0.8);
        expect(suggestions.confidence["FName"]).toBeGreaterThan(0.5);
      });

      it("maps address fields correctly", () => {
        const columns = [
          "Address Line 1",
          "Address Line 2",
          "City",
          "State/Province",
          "Postal Code",
          "Country",
        ];

        const suggestions = suggestFieldMapping(columns, "constituents");

        expect(suggestions.mapping).toMatchObject({
          "Address Line 1": "addressLine1",
          "Address Line 2": "addressLine2",
          "City": "city",
          "State/Province": "state",
          "Postal Code": "postalCode",
          "Country": "country",
        });
      });

      it("maps wealth/capacity fields", () => {
        const columns = [
          "Estimated Capacity",
          "Wealth Rating",
          "Capacity Score",
        ];

        const suggestions = suggestFieldMapping(columns, "constituents");

        expect(suggestions.mapping["Estimated Capacity"]).toBe("estimatedCapacity");
      });

      it("maps portfolio assignment fields", () => {
        const columns = [
          "Assigned Gift Officer",
          "Portfolio Manager",
          "MGO Assignment",
        ];

        const suggestions = suggestFieldMapping(columns, "constituents");

        expect(Object.values(suggestions.mapping)).toContain("assignedOfficerId");
      });
    });

    describe("gift data mapping", () => {
      it("maps common gift columns automatically", () => {
        const columns = [
          "Constituent ID",
          "Gift Amount",
          "Gift Date",
          "Gift Type",
          "Fund Name",
        ];

        const suggestions = suggestFieldMapping(columns, "gifts");

        expect(suggestions.mapping).toMatchObject({
          "Constituent ID": "constituentExternalId",
          "Gift Amount": "amount",
          "Gift Date": "giftDate",
          "Gift Type": "giftType",
          "Fund Name": "fundName",
        });
      });

      it("handles various amount column names", () => {
        const columns = ["Amount", "Gift Amt", "Donation Amount", "Total Gift"];

        const suggestions = suggestFieldMapping(columns, "gifts");

        expect(Object.values(suggestions.mapping)).toContain("amount");
      });

      it("handles various date column names", () => {
        const columns = ["Date", "Gift Date", "Transaction Date", "Date Received"];

        const suggestions = suggestFieldMapping(columns, "gifts");

        expect(Object.values(suggestions.mapping)).toContain("giftDate");
      });
    });

    describe("contact data mapping", () => {
      it("maps common contact columns automatically", () => {
        const columns = [
          "Constituent ID",
          "Contact Date",
          "Contact Type",
          "Subject",
          "Notes",
        ];

        const suggestions = suggestFieldMapping(columns, "contacts");

        expect(suggestions.mapping).toMatchObject({
          "Constituent ID": "constituentExternalId",
          "Contact Date": "contactDate",
          "Contact Type": "contactType",
          "Subject": "subject",
          "Notes": "notes",
        });
      });

      it("maps outcome/result fields", () => {
        const columns = ["Outcome", "Contact Result", "Response"];

        const suggestions = suggestFieldMapping(columns, "contacts");

        expect(Object.values(suggestions.mapping)).toContain("outcome");
      });
    });
  });

  describe("validateFieldMapping", () => {
    it("passes validation with all required fields mapped", () => {
      const mapping: FieldMapping = {
        "ID Column": "externalId",
        "Name Column": "lastName",
      };

      const result = validateFieldMapping(mapping, "constituents");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails validation when required fields are missing", () => {
      const mapping: FieldMapping = {
        "Name Column": "firstName",
        // Missing externalId and lastName
      };

      const result = validateFieldMapping(mapping, "constituents");

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "missing_required_field",
          field: "externalId",
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "missing_required_field",
          field: "lastName",
        })
      );
    });

    it("fails validation when same target field is mapped twice", () => {
      const mapping: FieldMapping = {
        "Email 1": "email",
        "Email 2": "email",
      };

      const result = validateFieldMapping(mapping, "constituents");

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "duplicate_mapping",
          field: "email",
        })
      );
    });

    it("warns for unmapped optional fields", () => {
      const mapping: FieldMapping = {
        "ID": "externalId",
        "Last Name": "lastName",
        // No optional fields mapped
      };

      const result = validateFieldMapping(mapping, "constituents");

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: "unmapped_recommended_field",
        })
      );
    });

    it("validates gift required fields", () => {
      const mapping: FieldMapping = {
        "ID": "constituentExternalId",
        // Missing amount and giftDate
      };

      const result = validateFieldMapping(mapping, "gifts");

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "missing_required_field",
          field: "amount",
        })
      );
    });

    it("validates contact required fields", () => {
      const mapping: FieldMapping = {
        "ID": "constituentExternalId",
        "Date": "contactDate",
        // Missing contactType
      };

      const result = validateFieldMapping(mapping, "contacts");

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "missing_required_field",
          field: "contactType",
        })
      );
    });
  });

  describe("applyFieldMapping", () => {
    it("transforms a row using the field mapping", () => {
      const mapping: FieldMapping = {
        "ID": "externalId",
        "First": "firstName",
        "Last": "lastName",
        "Email Address": "email",
      };

      const row = {
        "ID": "12345",
        "First": "John",
        "Last": "Doe",
        "Email Address": "john@example.com",
      };

      const result = applyFieldMapping(row, mapping);

      expect(result).toEqual({
        externalId: "12345",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      });
    });

    it("ignores unmapped columns", () => {
      const mapping: FieldMapping = {
        "ID": "externalId",
        "Name": "lastName",
      };

      const row = {
        "ID": "12345",
        "Name": "Doe",
        "Extra Column": "ignored",
      };

      const result = applyFieldMapping(row, mapping);

      expect(result).not.toHaveProperty("Extra Column");
      expect(result).not.toHaveProperty("extraColumn");
    });

    it("handles null mapping values (skip column)", () => {
      const mapping: FieldMapping = {
        "ID": "externalId",
        "Name": "lastName",
        "Skip This": null,
      };

      const row = {
        "ID": "12345",
        "Name": "Doe",
        "Skip This": "should be ignored",
      };

      const result = applyFieldMapping(row, mapping);

      expect(result).not.toHaveProperty("Skip This");
    });

    it("handles missing columns in row gracefully", () => {
      const mapping: FieldMapping = {
        "ID": "externalId",
        "Missing Column": "firstName",
      };

      const row = {
        "ID": "12345",
      };

      const result = applyFieldMapping(row, mapping);

      expect(result.externalId).toBe("12345");
      expect(result.firstName).toBeUndefined();
    });
  });

  describe("normalizeColumnName", () => {
    it("converts to camelCase", () => {
      expect(normalizeColumnName("First Name")).toBe("firstName");
      expect(normalizeColumnName("LAST NAME")).toBe("lastName");
      expect(normalizeColumnName("email_address")).toBe("emailAddress");
    });

    it("removes special characters", () => {
      expect(normalizeColumnName("First Name!")).toBe("firstName");
      expect(normalizeColumnName("Email@Address")).toBe("emailAddress");
      expect(normalizeColumnName("Phone #")).toBe("phone");
    });

    it("handles multiple spaces and underscores", () => {
      expect(normalizeColumnName("first   name")).toBe("firstName");
      expect(normalizeColumnName("first___name")).toBe("firstName");
      expect(normalizeColumnName("first - name")).toBe("firstName");
    });

    it("trims whitespace", () => {
      expect(normalizeColumnName("  First Name  ")).toBe("firstName");
    });

    it("handles empty strings", () => {
      expect(normalizeColumnName("")).toBe("");
      expect(normalizeColumnName("   ")).toBe("");
    });
  });

  describe("getRequiredFields", () => {
    it("returns required fields for constituents", () => {
      const required = getRequiredFields("constituents");

      expect(required).toContain("externalId");
      expect(required).toContain("lastName");
    });

    it("returns required fields for gifts", () => {
      const required = getRequiredFields("gifts");

      expect(required).toContain("constituentExternalId");
      expect(required).toContain("amount");
      expect(required).toContain("giftDate");
    });

    it("returns required fields for contacts", () => {
      const required = getRequiredFields("contacts");

      expect(required).toContain("constituentExternalId");
      expect(required).toContain("contactDate");
      expect(required).toContain("contactType");
    });
  });

  describe("getOptionalFields", () => {
    it("returns optional fields for constituents", () => {
      const optional = getOptionalFields("constituents");

      expect(optional).toContain("firstName");
      expect(optional).toContain("email");
      expect(optional).toContain("phone");
      expect(optional).toContain("estimatedCapacity");
    });

    it("returns optional fields for gifts", () => {
      const optional = getOptionalFields("gifts");

      expect(optional).toContain("giftType");
      expect(optional).toContain("fundName");
      expect(optional).toContain("campaign");
    });

    it("returns optional fields for contacts", () => {
      const optional = getOptionalFields("contacts");

      expect(optional).toContain("subject");
      expect(optional).toContain("notes");
      expect(optional).toContain("outcome");
    });
  });

  describe("calculateMappingConfidence", () => {
    it("returns high confidence for exact matches", () => {
      const confidence = calculateMappingConfidence("firstName", "First Name");

      expect(confidence).toBeGreaterThan(0.9);
    });

    it("returns medium confidence for partial matches", () => {
      const confidence = calculateMappingConfidence("firstName", "FName");

      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThan(0.9);
    });

    it("returns low confidence for weak matches", () => {
      const confidence = calculateMappingConfidence("firstName", "Name");

      expect(confidence).toBeGreaterThan(0.2);
      expect(confidence).toBeLessThan(0.6);
    });

    it("returns zero for no match", () => {
      const confidence = calculateMappingConfidence("firstName", "totalAmount");

      expect(confidence).toBeLessThan(0.2);
    });
  });

  describe("findBestMatch", () => {
    it("finds exact match", () => {
      const targetFields = ["externalId", "firstName", "lastName", "email"];

      const match = findBestMatch("First Name", targetFields);

      expect(match?.field).toBe("firstName");
      expect(match?.confidence).toBeGreaterThan(0.9);
    });

    it("finds best partial match", () => {
      const targetFields = ["externalId", "firstName", "lastName", "email"];

      const match = findBestMatch("FName", targetFields);

      expect(match?.field).toBe("firstName");
    });

    it("returns null for no good match", () => {
      const targetFields = ["externalId", "firstName", "lastName"];

      const match = findBestMatch("Random Column XYZ", targetFields, {
        minConfidence: 0.5,
      });

      expect(match).toBeNull();
    });

    it("respects minimum confidence threshold", () => {
      const targetFields = ["email"];

      const match = findBestMatch("E-Mail", targetFields, {
        minConfidence: 0.99,
      });

      expect(match).toBeNull();
    });
  });

  describe("CRM-specific column patterns", () => {
    it("maps Raiser's Edge column names", () => {
      const columns = [
        "CnBio_ID",
        "CnBio_First_Name",
        "CnBio_Last_Name",
        "CnAdrPrf_Addrline1",
        "CnPh_1_01_Phone_number",
      ];

      const suggestions = suggestFieldMapping(columns, "constituents");

      expect(suggestions.mapping["CnBio_ID"]).toBe("externalId");
      expect(suggestions.mapping["CnBio_First_Name"]).toBe("firstName");
    });

    it("maps Advance column names", () => {
      const columns = [
        "PIDM",
        "FIRST_NAME",
        "LAST_NAME",
        "PREF_EMAIL",
        "HOME_ADDR_LINE1",
      ];

      const suggestions = suggestFieldMapping(columns, "constituents");

      expect(suggestions.mapping["PIDM"]).toBe("externalId");
      expect(suggestions.mapping["FIRST_NAME"]).toBe("firstName");
    });

    it("maps Millennium column names", () => {
      const columns = [
        "Lookup ID",
        "Given Name",
        "Surname",
        "Primary Email",
      ];

      const suggestions = suggestFieldMapping(columns, "constituents");

      expect(suggestions.mapping["Lookup ID"]).toBe("externalId");
      expect(suggestions.mapping["Given Name"]).toBe("firstName");
      expect(suggestions.mapping["Surname"]).toBe("lastName");
    });
  });

  describe("Edge cases", () => {
    it("handles empty column list", () => {
      const suggestions = suggestFieldMapping([], "constituents");

      expect(suggestions.mapping).toEqual({});
      expect(suggestions.unmappedColumns).toEqual([]);
    });

    it("handles columns with only special characters", () => {
      const columns = ["!!!###", "@@@", "---"];

      const suggestions = suggestFieldMapping(columns, "constituents");

      expect(suggestions.unmappedColumns).toHaveLength(3);
    });

    it("handles very long column names", () => {
      const longName = "This Is A Very Long Column Name That Might Be Used In Some CRM Systems For Some Reason";

      const suggestions = suggestFieldMapping([longName], "constituents");

      expect(suggestions.unmappedColumns).toContain(longName);
    });

    it("handles duplicate column names", () => {
      const columns = ["First Name", "First Name", "Last Name"];

      const suggestions = suggestFieldMapping(columns, "constituents");

      // Should handle gracefully, perhaps by appending _2 or similar
      expect(Object.keys(suggestions.mapping).length).toBeGreaterThanOrEqual(2);
    });
  });
});
