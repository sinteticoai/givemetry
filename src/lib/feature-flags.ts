// T107: Helper function to check feature flag for organization
import prisma from "@/lib/prisma/client";

/**
 * Check if a feature flag is enabled for an organization.
 *
 * Resolution order:
 * 1. If organization has an override for this flag, return the override value
 * 2. Otherwise, return the flag's default value
 * 3. If flag doesn't exist, return false
 *
 * @param key - The unique key of the feature flag (e.g., "ai_briefings")
 * @param organizationId - The organization ID to check
 * @returns Promise<boolean> - Whether the feature is enabled
 *
 * @example
 * ```ts
 * // In a tRPC procedure or server component
 * const canUseAI = await isFeatureEnabled("ai_briefings", ctx.organizationId);
 * if (!canUseAI) {
 *   throw new TRPCError({ code: "FORBIDDEN", message: "AI briefings not enabled" });
 * }
 * ```
 */
export async function isFeatureEnabled(
  key: string,
  organizationId: string
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    select: {
      defaultEnabled: true,
      overrides: {
        where: { organizationId },
        select: { enabled: true },
        take: 1,
      },
    },
  });

  // Flag doesn't exist - default to disabled
  if (!flag) {
    return false;
  }

  // Check for organization-specific override
  if (flag.overrides.length > 0 && flag.overrides[0]) {
    return flag.overrides[0].enabled;
  }

  // Return default value
  return flag.defaultEnabled;
}

/**
 * Get the status of multiple feature flags for an organization.
 * More efficient than calling isFeatureEnabled multiple times.
 *
 * @param keys - Array of feature flag keys to check
 * @param organizationId - The organization ID to check
 * @returns Promise<Record<string, boolean>> - Map of flag key to enabled status
 *
 * @example
 * ```ts
 * const features = await getFeatureFlags(
 *   ["ai_briefings", "bulk_export", "advanced_analytics"],
 *   organizationId
 * );
 * // features = { ai_briefings: true, bulk_export: false, advanced_analytics: true }
 * ```
 */
export async function getFeatureFlags(
  keys: string[],
  organizationId: string
): Promise<Record<string, boolean>> {
  const flags = await prisma.featureFlag.findMany({
    where: { key: { in: keys } },
    select: {
      key: true,
      defaultEnabled: true,
      overrides: {
        where: { organizationId },
        select: { enabled: true },
        take: 1,
      },
    },
  });

  // Build result map, defaulting missing keys to false
  const result: Record<string, boolean> = {};

  for (const key of keys) {
    const flag = flags.find((f) => f.key === key);

    if (!flag) {
      result[key] = false;
      continue;
    }

    // Use override if exists, otherwise use default
    result[key] =
      flag.overrides.length > 0 && flag.overrides[0]
        ? flag.overrides[0].enabled
        : flag.defaultEnabled;
  }

  return result;
}

/**
 * Get all feature flags and their status for an organization.
 * Useful for sending feature configuration to the client.
 *
 * @param organizationId - The organization ID to check
 * @returns Promise<Record<string, boolean>> - Map of all flag keys to enabled status
 *
 * @example
 * ```ts
 * // In a layout or page server component
 * const features = await getAllFeatureFlags(session.organizationId);
 * // Pass to client component as props or context
 * ```
 */
export async function getAllFeatureFlags(
  organizationId: string
): Promise<Record<string, boolean>> {
  const flags = await prisma.featureFlag.findMany({
    select: {
      key: true,
      defaultEnabled: true,
      overrides: {
        where: { organizationId },
        select: { enabled: true },
        take: 1,
      },
    },
  });

  const result: Record<string, boolean> = {};

  for (const flag of flags) {
    result[flag.key] =
      flag.overrides.length > 0 && flag.overrides[0]
        ? flag.overrides[0].enabled
        : flag.defaultEnabled;
  }

  return result;
}

/**
 * Require a feature flag to be enabled, throwing an error if not.
 * Convenience wrapper for use in tRPC procedures.
 *
 * @param key - The unique key of the feature flag
 * @param organizationId - The organization ID to check
 * @throws Error if feature is not enabled
 *
 * @example
 * ```ts
 * // In a tRPC procedure
 * await requireFeature("ai_briefings", ctx.organizationId);
 * // Proceed with AI briefing logic...
 * ```
 */
export async function requireFeature(
  key: string,
  organizationId: string
): Promise<void> {
  const enabled = await isFeatureEnabled(key, organizationId);

  if (!enabled) {
    throw new Error(`Feature "${key}" is not enabled for this organization`);
  }
}
