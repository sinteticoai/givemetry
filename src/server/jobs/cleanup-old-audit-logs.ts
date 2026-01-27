// T116: Scheduled job for 2-year audit log retention
import prisma from "@/lib/prisma/client";

const RETENTION_YEARS = 2;

interface CleanupResult {
  superAdminLogsDeleted: number;
  tenantLogsDeleted: number;
  cutoffDate: Date;
  errors: string[];
}

/**
 * Cleans up audit logs older than the retention period (2 years).
 *
 * This job should be run monthly via cron or a scheduler.
 *
 * Usage:
 *   - As a module: import { cleanupOldAuditLogs } from './cleanup-old-audit-logs'
 *   - As CLI: npx tsx src/server/jobs/cleanup-old-audit-logs.ts
 *
 * The job performs the following:
 * 1. Calculates the cutoff date (now - 2 years)
 * 2. Deletes SuperAdminAuditLog entries older than cutoff
 * 3. Deletes tenant AuditLog entries older than cutoff (if table exists)
 * 4. Returns summary of deleted records
 *
 * Per data-model.md: Audit logs have 2-year retention requirement.
 */
export async function cleanupOldAuditLogs(): Promise<CleanupResult> {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - RETENTION_YEARS);

  console.log(`[cleanup-old-audit-logs] Starting audit log cleanup job`);
  console.log(`[cleanup-old-audit-logs] Retention period: ${RETENTION_YEARS} years`);
  console.log(`[cleanup-old-audit-logs] Cutoff date: ${cutoffDate.toISOString()}`);
  console.log(`[cleanup-old-audit-logs] All logs before this date will be permanently removed`);

  const result: CleanupResult = {
    superAdminLogsDeleted: 0,
    tenantLogsDeleted: 0,
    cutoffDate,
    errors: [],
  };

  // Delete super admin audit logs
  try {
    // First, get count for logging
    const superAdminLogCount = await prisma.superAdminAuditLog.count({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    if (superAdminLogCount > 0) {
      console.log(`[cleanup-old-audit-logs] Found ${superAdminLogCount} super admin audit logs to delete`);

      // Delete in batches to avoid memory issues with large datasets
      const BATCH_SIZE = 10000;
      let totalDeleted = 0;

      while (totalDeleted < superAdminLogCount) {
        const deleted = await prisma.superAdminAuditLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        });

        totalDeleted += deleted.count;
        console.log(`[cleanup-old-audit-logs] Deleted ${totalDeleted}/${superAdminLogCount} super admin audit logs`);

        // If we deleted less than batch size, we're done
        if (deleted.count < BATCH_SIZE) break;
      }

      result.superAdminLogsDeleted = totalDeleted;
      console.log(`[cleanup-old-audit-logs] Successfully deleted ${totalDeleted} super admin audit logs`);
    } else {
      console.log(`[cleanup-old-audit-logs] No super admin audit logs to delete`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[cleanup-old-audit-logs] Error deleting super admin audit logs: ${errorMessage}`);
    result.errors.push(`SuperAdminAuditLog: ${errorMessage}`);
  }

  // Delete tenant audit logs (AuditLog table) if it exists
  try {
    // Check if AuditLog table exists and has old records
    const tenantLogCount = await prisma.auditLog.count({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    if (tenantLogCount > 0) {
      console.log(`[cleanup-old-audit-logs] Found ${tenantLogCount} tenant audit logs to delete`);

      // Delete in batches
      const BATCH_SIZE = 10000;
      let totalDeleted = 0;

      while (totalDeleted < tenantLogCount) {
        const deleted = await prisma.auditLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        });

        totalDeleted += deleted.count;
        console.log(`[cleanup-old-audit-logs] Deleted ${totalDeleted}/${tenantLogCount} tenant audit logs`);

        if (deleted.count < BATCH_SIZE) break;
      }

      result.tenantLogsDeleted = totalDeleted;
      console.log(`[cleanup-old-audit-logs] Successfully deleted ${totalDeleted} tenant audit logs`);
    } else {
      console.log(`[cleanup-old-audit-logs] No tenant audit logs to delete`);
    }
  } catch (error) {
    // AuditLog table might not exist in all environments
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("does not exist") || errorMessage.includes("Unknown model")) {
      console.log(`[cleanup-old-audit-logs] Tenant AuditLog table does not exist, skipping`);
    } else {
      console.error(`[cleanup-old-audit-logs] Error deleting tenant audit logs: ${errorMessage}`);
      result.errors.push(`AuditLog: ${errorMessage}`);
    }
  }

  // Log summary
  console.log(`[cleanup-old-audit-logs] Cleanup complete:`);
  console.log(`  - Super admin logs deleted: ${result.superAdminLogsDeleted}`);
  console.log(`  - Tenant logs deleted: ${result.tenantLogsDeleted}`);
  console.log(`  - Errors: ${result.errors.length}`);

  // Create audit log entry for this cleanup job
  try {
    await prisma.superAdminAuditLog.create({
      data: {
        superAdminId: "00000000-0000-0000-0000-000000000000", // System job ID
        action: "audit.cleanup",
        targetType: "system",
        targetId: null,
        organizationId: null,
        details: {
          source: "scheduled_cleanup_job",
          cutoffDate: cutoffDate.toISOString(),
          retentionYears: RETENTION_YEARS,
          superAdminLogsDeleted: result.superAdminLogsDeleted,
          tenantLogsDeleted: result.tenantLogsDeleted,
          errors: result.errors,
        },
      },
    });
  } catch (error) {
    console.error(`[cleanup-old-audit-logs] Failed to log cleanup action: ${error}`);
  }

  return result;
}

// Allow running as CLI script
if (require.main === module) {
  cleanupOldAuditLogs()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}
