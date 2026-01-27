// T101-T106: Super Admin Feature Flags Router
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminRouter, adminProtectedProcedure } from "./auth";
import prisma from "@/lib/prisma/client";
import type { Prisma } from "@prisma/client";

// Input schemas
const listInputSchema = z.object({
  search: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

const getInputSchema = z.object({
  id: z.string().uuid(),
});

const createInputSchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    .max(100, "Key must be 100 characters or less")
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase alphanumeric with underscores only"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less"),
  description: z.string().max(1000).optional(),
  defaultEnabled: z.boolean().default(false),
});

const updateInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  defaultEnabled: z.boolean().optional(),
});

const setOverrideInputSchema = z.object({
  featureFlagId: z.string().uuid(),
  organizationId: z.string().uuid(),
  enabled: z.boolean(),
});

const removeOverrideInputSchema = z.object({
  featureFlagId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

// Helper to build where clause for feature flag queries
function buildWhereClause(input: z.infer<typeof listInputSchema>) {
  const where: Prisma.FeatureFlagWhereInput = {};

  if (input.search) {
    where.OR = [
      { key: { contains: input.search, mode: "insensitive" } },
      { name: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export const featureFlagsRouter = adminRouter({
  // T101: List all feature flags
  list: adminProtectedProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const { cursor, limit } = input;
      const where = buildWhereClause(input);

      const flags = await prisma.featureFlag.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: { key: "asc" },
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          defaultEnabled: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { overrides: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (flags.length > limit) {
        const nextItem = flags.pop();
        nextCursor = nextItem?.id;
      }

      const totalCount = await prisma.featureFlag.count({ where });

      return {
        items: flags.map((flag) => ({
          id: flag.id,
          key: flag.key,
          name: flag.name,
          description: flag.description,
          defaultEnabled: flag.defaultEnabled,
          overrideCount: flag._count.overrides,
          createdAt: flag.createdAt,
          updatedAt: flag.updatedAt,
        })),
        nextCursor,
        totalCount,
      };
    }),

  // T102: Get single feature flag with overrides
  get: adminProtectedProcedure
    .input(getInputSchema)
    .query(async ({ input }) => {
      const flag = await prisma.featureFlag.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          defaultEnabled: true,
          createdAt: true,
          updatedAt: true,
          overrides: {
            select: {
              id: true,
              organizationId: true,
              enabled: true,
              createdAt: true,
              updatedAt: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
              },
            },
            orderBy: { organization: { name: "asc" } },
          },
        },
      });

      if (!flag) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }

      return {
        id: flag.id,
        key: flag.key,
        name: flag.name,
        description: flag.description,
        defaultEnabled: flag.defaultEnabled,
        createdAt: flag.createdAt,
        updatedAt: flag.updatedAt,
        overrides: flag.overrides.map((override) => ({
          id: override.id,
          organizationId: override.organizationId,
          organizationName: override.organization.name,
          organizationSlug: override.organization.slug,
          organizationStatus: override.organization.status,
          enabled: override.enabled,
          createdAt: override.createdAt,
          updatedAt: override.updatedAt,
        })),
      };
    }),

  // T103: Create new feature flag
  create: adminProtectedProcedure
    .input(createInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if key already exists
      const existingFlag = await prisma.featureFlag.findFirst({
        where: { key: input.key },
      });

      if (existingFlag) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A feature flag with key "${input.key}" already exists`,
        });
      }

      const newFlag = await prisma.featureFlag.create({
        data: {
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          defaultEnabled: input.defaultEnabled,
        },
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          defaultEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Log audit action
      await ctx.logAuditAction({
        action: "feature_flag.create",
        targetType: "feature_flag",
        targetId: newFlag.id,
        details: {
          key: newFlag.key,
          name: newFlag.name,
          defaultEnabled: newFlag.defaultEnabled,
        },
      });

      return {
        ...newFlag,
        overrideCount: 0,
      };
    }),

  // T104: Update feature flag
  update: adminProtectedProcedure
    .input(updateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if flag exists
      const existingFlag = await prisma.featureFlag.findUnique({
        where: { id },
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          defaultEnabled: true,
        },
      });

      if (!existingFlag) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }

      // Build update data - only include provided fields
      const data: Prisma.FeatureFlagUpdateInput = {};
      const changes: Record<string, [unknown, unknown]> = {};

      if (updateData.name !== undefined) {
        data.name = updateData.name;
        changes.name = [existingFlag.name, updateData.name];
      }

      if (updateData.description !== undefined) {
        data.description = updateData.description;
        changes.description = [existingFlag.description, updateData.description];
      }

      if (updateData.defaultEnabled !== undefined) {
        data.defaultEnabled = updateData.defaultEnabled;
        changes.defaultEnabled = [existingFlag.defaultEnabled, updateData.defaultEnabled];
      }

      const updatedFlag = await prisma.featureFlag.update({
        where: { id },
        data,
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          defaultEnabled: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { overrides: true },
          },
        },
      });

      // Log audit action
      await ctx.logAuditAction({
        action: "feature_flag.update",
        targetType: "feature_flag",
        targetId: id,
        details: { changes },
      });

      return {
        id: updatedFlag.id,
        key: updatedFlag.key,
        name: updatedFlag.name,
        description: updatedFlag.description,
        defaultEnabled: updatedFlag.defaultEnabled,
        overrideCount: updatedFlag._count.overrides,
        createdAt: updatedFlag.createdAt,
        updatedAt: updatedFlag.updatedAt,
      };
    }),

  // T105: Set override for organization
  setOverride: adminProtectedProcedure
    .input(setOverrideInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if flag exists
      const flag = await prisma.featureFlag.findUnique({
        where: { id: input.featureFlagId },
        select: { id: true, key: true, defaultEnabled: true },
      });

      if (!flag) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }

      // Check if organization exists
      const org = await prisma.organization.findUnique({
        where: { id: input.organizationId },
        select: { id: true, name: true },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Check if override already exists
      const existingOverride = await prisma.featureFlagOverride.findUnique({
        where: {
          featureFlagId_organizationId: {
            featureFlagId: input.featureFlagId,
            organizationId: input.organizationId,
          },
        },
      });

      // Upsert the override
      const override = await prisma.featureFlagOverride.upsert({
        where: {
          featureFlagId_organizationId: {
            featureFlagId: input.featureFlagId,
            organizationId: input.organizationId,
          },
        },
        create: {
          featureFlagId: input.featureFlagId,
          organizationId: input.organizationId,
          enabled: input.enabled,
        },
        update: {
          enabled: input.enabled,
        },
        select: {
          id: true,
          featureFlagId: true,
          organizationId: true,
          enabled: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      });

      // Log audit action
      await ctx.logAuditAction({
        action: "feature_flag_override.set",
        targetType: "feature_flag",
        targetId: input.featureFlagId,
        organizationId: input.organizationId,
        details: {
          flagKey: flag.key,
          organizationName: org.name,
          enabled: input.enabled,
          previousEnabled: existingOverride?.enabled ?? null,
          defaultEnabled: flag.defaultEnabled,
        },
      });

      return {
        id: override.id,
        featureFlagId: override.featureFlagId,
        organizationId: override.organizationId,
        organizationName: override.organization.name,
        organizationSlug: override.organization.slug,
        enabled: override.enabled,
        createdAt: override.createdAt,
        updatedAt: override.updatedAt,
      };
    }),

  // T106: Remove override for organization
  removeOverride: adminProtectedProcedure
    .input(removeOverrideInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if override exists
      const override = await prisma.featureFlagOverride.findUnique({
        where: {
          featureFlagId_organizationId: {
            featureFlagId: input.featureFlagId,
            organizationId: input.organizationId,
          },
        },
        select: {
          id: true,
          enabled: true,
          featureFlag: {
            select: { key: true, defaultEnabled: true },
          },
          organization: {
            select: { name: true },
          },
        },
      });

      if (!override) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Override not found for this organization",
        });
      }

      // Delete the override
      await prisma.featureFlagOverride.delete({
        where: {
          featureFlagId_organizationId: {
            featureFlagId: input.featureFlagId,
            organizationId: input.organizationId,
          },
        },
      });

      // Log audit action
      await ctx.logAuditAction({
        action: "feature_flag_override.remove",
        targetType: "feature_flag",
        targetId: input.featureFlagId,
        organizationId: input.organizationId,
        details: {
          flagKey: override.featureFlag.key,
          organizationName: override.organization.name,
          previousEnabled: override.enabled,
          defaultEnabled: override.featureFlag.defaultEnabled,
        },
      });

      return {
        success: true,
        message: `Override removed. Organization will now use default value: ${override.featureFlag.defaultEnabled}`,
      };
    }),

  // Get all organizations for override selection
  getOrganizationsForOverride: adminProtectedProcedure
    .input(z.object({
      featureFlagId: z.string().uuid(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      // Get organizations that don't already have an override for this flag
      const existingOverrides = await prisma.featureFlagOverride.findMany({
        where: { featureFlagId: input.featureFlagId },
        select: { organizationId: true },
      });

      const existingOrgIds = existingOverrides.map((o) => o.organizationId);

      const orgs = await prisma.organization.findMany({
        where: {
          id: { notIn: existingOrgIds },
          status: { not: "pending_deletion" },
          ...(input.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { slug: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
        orderBy: { name: "asc" },
        take: 50,
      });

      return orgs;
    }),
});

export type FeatureFlagsRouter = typeof featureFlagsRouter;
