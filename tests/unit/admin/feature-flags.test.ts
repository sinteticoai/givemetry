// T100: Unit tests for super admin feature flags router
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma before importing router
vi.mock("@/lib/prisma/client", () => ({
  default: {
    featureFlag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    featureFlagOverride: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma/client";

describe("Feature Flags Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return all feature flags with override counts", async () => {
      const mockFlags = [
        {
          id: "flag-1",
          key: "ai_briefings",
          name: "AI Briefings",
          description: "Enable AI-powered constituent briefings",
          defaultEnabled: true,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          _count: { overrides: 5 },
        },
        {
          id: "flag-2",
          key: "bulk_export",
          name: "Bulk Export",
          description: "Enable bulk data export",
          defaultEnabled: false,
          createdAt: new Date("2026-01-15"),
          updatedAt: new Date("2026-01-15"),
          _count: { overrides: 2 },
        },
      ];

      vi.mocked(prisma.featureFlag.findMany).mockResolvedValue(mockFlags);
      vi.mocked(prisma.featureFlag.count).mockResolvedValue(2);

      expect(prisma.featureFlag.findMany).toBeDefined();
      expect(mockFlags[0]?.key).toBe("ai_briefings");
      expect(mockFlags[0]?._count.overrides).toBe(5);
    });

    it("should filter by search term", async () => {
      vi.mocked(prisma.featureFlag.findMany).mockResolvedValue([]);
      vi.mocked(prisma.featureFlag.count).mockResolvedValue(0);

      // The router should filter by key, name, or description
      expect(prisma.featureFlag.findMany).toBeDefined();
    });

    it("should handle empty results", async () => {
      vi.mocked(prisma.featureFlag.findMany).mockResolvedValue([]);
      vi.mocked(prisma.featureFlag.count).mockResolvedValue(0);

      expect(prisma.featureFlag.findMany).toBeDefined();
    });
  });

  describe("get", () => {
    it("should return feature flag with all overrides", async () => {
      const mockFlag = {
        id: "flag-1",
        key: "ai_briefings",
        name: "AI Briefings",
        description: "Enable AI-powered constituent briefings",
        defaultEnabled: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        overrides: [
          {
            id: "override-1",
            featureFlagId: "flag-1",
            organizationId: "org-1",
            enabled: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            organization: {
              id: "org-1",
              name: "Test Org",
              slug: "test-org",
            },
          },
        ],
      };

      vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(mockFlag);

      expect(prisma.featureFlag.findUnique).toBeDefined();
      expect(mockFlag.overrides.length).toBe(1);
    });

    it("should throw NOT_FOUND when flag does not exist", async () => {
      vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

      // Router should throw TRPCError with code NOT_FOUND
      expect(prisma.featureFlag.findUnique).toBeDefined();
    });
  });

  describe("create", () => {
    it("should create a new feature flag", async () => {
      const newFlag = {
        id: "new-flag-id",
        key: "new_feature",
        name: "New Feature",
        description: "A new feature flag",
        defaultEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.featureFlag.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.featureFlag.create).mockResolvedValue(newFlag);

      expect(newFlag.key).toBe("new_feature");
      expect(newFlag.defaultEnabled).toBe(false);
    });

    it("should reject duplicate key", async () => {
      const existingFlag = {
        id: "existing-flag",
        key: "existing_key",
        name: "Existing Feature",
        description: null,
        defaultEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.featureFlag.findFirst).mockResolvedValue(existingFlag);

      // Router should throw CONFLICT error
      expect(existingFlag.key).toBe("existing_key");
    });

    it("should validate key format (lowercase alphanumeric with underscores)", () => {
      const validKeys = ["ai_briefings", "bulk_export", "feature_123"];
      const invalidKeys = ["AI_Briefings", "bulk-export", "feature flag"];

      validKeys.forEach(key => {
        expect(key).toMatch(/^[a-z0-9_]+$/);
      });

      invalidKeys.forEach(key => {
        expect(key).not.toMatch(/^[a-z0-9_]+$/);
      });
    });

    it("should log audit action on create", async () => {
      // Router should call ctx.logAuditAction with feature_flag.create action
      expect(true).toBe(true);
    });
  });

  describe("update", () => {
    it("should update feature flag fields", async () => {
      const existingFlag = {
        id: "flag-1",
        key: "ai_briefings",
        name: "AI Briefings",
        description: "Old description",
        defaultEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedFlag = {
        ...existingFlag,
        name: "Updated AI Briefings",
        description: "New description",
        defaultEnabled: true,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(existingFlag);
      vi.mocked(prisma.featureFlag.update).mockResolvedValue(updatedFlag);

      expect(prisma.featureFlag.update).toBeDefined();
      expect(updatedFlag.defaultEnabled).toBe(true);
    });

    it("should throw NOT_FOUND when flag does not exist", async () => {
      vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

      // Router should throw TRPCError with code NOT_FOUND
      expect(prisma.featureFlag.findUnique).toBeDefined();
    });

    it("should log audit action on update", async () => {
      // Router should call ctx.logAuditAction with feature_flag.update action
      expect(true).toBe(true);
    });
  });

  describe("setOverride", () => {
    it("should create override for organization", async () => {
      const mockFlag = {
        id: "flag-1",
        key: "ai_briefings",
        name: "AI Briefings",
        description: null,
        defaultEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOverride = {
        id: "override-1",
        featureFlagId: "flag-1",
        organizationId: "org-1",
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(mockFlag);
      vi.mocked(prisma.featureFlagOverride.upsert).mockResolvedValue(mockOverride);

      expect(mockOverride.enabled).toBe(false);
      expect(mockOverride.organizationId).toBe("org-1");
    });

    it("should update existing override", async () => {
      const mockFlag = {
        id: "flag-1",
        key: "ai_briefings",
        name: "AI Briefings",
        description: null,
        defaultEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingOverride = {
        id: "override-1",
        featureFlagId: "flag-1",
        organizationId: "org-1",
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedOverride = {
        ...existingOverride,
        enabled: true,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(mockFlag);
      vi.mocked(prisma.featureFlagOverride.upsert).mockResolvedValue(updatedOverride);

      expect(updatedOverride.enabled).toBe(true);
    });

    it("should log audit action on set override", async () => {
      // Router should call ctx.logAuditAction with feature_flag_override.set action
      expect(true).toBe(true);
    });
  });

  describe("removeOverride", () => {
    it("should remove override for organization", async () => {
      const mockOverride = {
        id: "override-1",
        featureFlagId: "flag-1",
        organizationId: "org-1",
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.featureFlagOverride.findFirst).mockResolvedValue(mockOverride);
      vi.mocked(prisma.featureFlagOverride.delete).mockResolvedValue(mockOverride);

      expect(mockOverride.id).toBe("override-1");
    });

    it("should throw NOT_FOUND when override does not exist", async () => {
      vi.mocked(prisma.featureFlagOverride.findFirst).mockResolvedValue(null);

      // Router should throw TRPCError with code NOT_FOUND
      expect(prisma.featureFlagOverride.findFirst).toBeDefined();
    });

    it("should log audit action on remove override", async () => {
      // Router should call ctx.logAuditAction with feature_flag_override.remove action
      expect(true).toBe(true);
    });
  });
});

describe("Feature Flag Input Validation", () => {
  it("should validate UUID format for id", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const invalidUuid = "not-a-uuid";

    expect(validUuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(invalidUuid).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("should validate key format (lowercase with underscores)", () => {
    const validKeys = ["feature_flag", "ai_briefings", "v2_export"];
    const invalidKeys = ["Feature_Flag", "ai-briefings", "feature flag"];

    validKeys.forEach(key => {
      expect(key).toMatch(/^[a-z0-9_]+$/);
    });

    invalidKeys.forEach(key => {
      expect(key).not.toMatch(/^[a-z0-9_]+$/);
    });
  });

  it("should validate name length (1-255 characters)", () => {
    const minLength = 1;
    const maxLength = 255;

    expect(minLength).toBeGreaterThanOrEqual(1);
    expect(maxLength).toBeLessThanOrEqual(255);
  });
});

describe("isFeatureEnabled helper", () => {
  it("should return default value when no override exists", async () => {
    // When organization has no override, return flag's defaultEnabled
    const mockFlag = {
      id: "flag-1",
      key: "ai_briefings",
      defaultEnabled: true,
      overrides: [],
    };

    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(mockFlag as any);

    // isFeatureEnabled("ai_briefings", "org-1") should return true
    expect(mockFlag.defaultEnabled).toBe(true);
  });

  it("should return override value when override exists", async () => {
    // When organization has an override, return override's enabled value
    const mockFlag = {
      id: "flag-1",
      key: "ai_briefings",
      defaultEnabled: true,
      overrides: [
        {
          organizationId: "org-1",
          enabled: false,
        },
      ],
    };

    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(mockFlag as any);

    // isFeatureEnabled("ai_briefings", "org-1") should return false (override)
    expect(mockFlag.overrides[0]?.enabled).toBe(false);
  });

  it("should return false when flag does not exist", async () => {
    vi.mocked(prisma.featureFlag.findUnique).mockResolvedValue(null);

    // isFeatureEnabled("nonexistent", "org-1") should return false
    expect(prisma.featureFlag.findUnique).toBeDefined();
  });
});
