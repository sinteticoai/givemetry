// T114: Scheduled job for 30-day hard delete of pending_deletion organizations
import prisma from "@/lib/prisma/client";

const RETENTION_DAYS = 30;

interface CleanupResult {
  deletedCount: number;
  deletedOrganizations: {
    id: string;
    name: string;
    deletedAt: Date;
  }[];
  errors: {
    orgId: string;
    error: string;
  }[];
}

/**
 * Cleans up organizations that have been in pending_deletion status
 * for longer than the retention period (30 days).
 *
 * This job should be run daily via cron or a scheduler.
 *
 * Usage:
 *   - As a module: import { cleanupDeletedOrganizations } from './cleanup-deleted-orgs'
 *   - As CLI: npx tsx src/server/jobs/cleanup-deleted-orgs.ts
 *
 * The job performs the following:
 * 1. Finds all organizations with status=pending_deletion and deletedAt < (now - 30 days)
 * 2. Logs each organization being deleted for audit purposes
 * 3. Performs cascade delete (Prisma handles related records via onDelete: Cascade)
 * 4. Returns summary of deleted organizations
 */
export async function cleanupDeletedOrganizations(): Promise<CleanupResult> {
  const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  console.log(`[cleanup-deleted-orgs] Starting cleanup job`);
  console.log(`[cleanup-deleted-orgs] Cutoff date: ${cutoffDate.toISOString()}`);
  console.log(`[cleanup-deleted-orgs] Organizations deleted before this date will be permanently removed`);

  // Find organizations to delete
  const orgsToDelete = await prisma.organization.findMany({
    where: {
      status: "pending_deletion",
      deletedAt: {
        lt: cutoffDate,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      deletedAt: true,
      _count: {
        select: {
          users: true,
          constituents: true,
        },
      },
    },
  });

  if (orgsToDelete.length === 0) {
    console.log(`[cleanup-deleted-orgs] No organizations to clean up`);
    return {
      deletedCount: 0,
      deletedOrganizations: [],
      errors: [],
    };
  }

  console.log(`[cleanup-deleted-orgs] Found ${orgsToDelete.length} organizations to delete:`);
  orgsToDelete.forEach((org) => {
    console.log(`  - ${org.name} (${org.slug}): ${org._count.users} users, ${org._count.constituents} constituents`);
  });

  const result: CleanupResult = {
    deletedCount: 0,
    deletedOrganizations: [],
    errors: [],
  };

  // Delete organizations one by one to ensure proper logging
  for (const org of orgsToDelete) {
    try {
      // Log to super admin audit log before deletion
      await prisma.superAdminAuditLog.create({
        data: {
          superAdminId: "00000000-0000-0000-0000-000000000000", // System job ID
          action: "organization.hard_delete",
          targetType: "organization",
          targetId: org.id,
          organizationId: null, // Will be deleted
          details: {
            source: "scheduled_cleanup_job",
            name: org.name,
            slug: org.slug,
            deletedAt: org.deletedAt?.toISOString(),
            usersCount: org._count.users,
            constituentsCount: org._count.constituents,
            retentionDays: RETENTION_DAYS,
          },
        },
      });

      // Perform cascade delete
      await prisma.organization.delete({
        where: { id: org.id },
      });

      result.deletedCount++;
      result.deletedOrganizations.push({
        id: org.id,
        name: org.name,
        deletedAt: org.deletedAt!,
      });

      console.log(`[cleanup-deleted-orgs] Successfully deleted: ${org.name} (${org.id})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[cleanup-deleted-orgs] Failed to delete ${org.name} (${org.id}): ${errorMessage}`);
      result.errors.push({
        orgId: org.id,
        error: errorMessage,
      });
    }
  }

  console.log(`[cleanup-deleted-orgs] Cleanup complete:`);
  console.log(`  - Deleted: ${result.deletedCount}`);
  console.log(`  - Errors: ${result.errors.length}`);

  return result;
}

// Allow running as CLI script
if (require.main === module) {
  cleanupDeletedOrganizations()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}
