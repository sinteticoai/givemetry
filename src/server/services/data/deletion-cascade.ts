// T069: Data deletion cascade logic
import prisma from "@/lib/prisma/client";
import { createAuditLog, AuditActions } from "../audit";

export interface DeletionResult {
  success: boolean;
  deletedCounts: {
    constituents: number;
    gifts: number;
    contacts: number;
    predictions: number;
    alerts: number;
    briefs: number;
    queries: number;
    uploads: number;
    reports: number;
  };
}

/**
 * Delete all data for an organization (cascade)
 * Retains audit logs but anonymizes them
 */
export async function deleteOrganizationData(
  organizationId: string,
  userId: string
): Promise<DeletionResult> {
  const result = await prisma.$transaction(async (tx) => {
    // Delete in order to respect foreign keys
    const [
      queries,
      briefs,
      alerts,
      predictions,
      contacts,
      gifts,
      constituents,
      uploads,
      reports,
    ] = await Promise.all([
      tx.naturalLanguageQuery.deleteMany({ where: { organizationId } }),
      tx.brief.deleteMany({ where: { organizationId } }),
      tx.alert.deleteMany({ where: { organizationId } }),
      tx.prediction.deleteMany({ where: { organizationId } }),
      tx.contact.deleteMany({ where: { organizationId } }),
      tx.gift.deleteMany({ where: { organizationId } }),
      tx.constituent.deleteMany({ where: { organizationId } }),
      tx.upload.deleteMany({ where: { organizationId } }),
      tx.report.deleteMany({ where: { organizationId } }),
    ]);

    return {
      constituents: constituents.count,
      gifts: gifts.count,
      contacts: contacts.count,
      predictions: predictions.count,
      alerts: alerts.count,
      briefs: briefs.count,
      queries: queries.count,
      uploads: uploads.count,
      reports: reports.count,
    };
  });

  // Create audit log entry
  await createAuditLog({
    organizationId,
    userId,
    action: AuditActions.DATA_DELETE,
    resourceType: "organization",
    resourceId: organizationId,
    details: {
      type: "full_data_deletion",
      deletedCounts: JSON.stringify(result),
    },
  });

  return {
    success: true,
    deletedCounts: result,
  };
}

/**
 * Delete a single constituent and all related data
 */
export async function deleteConstituent(
  organizationId: string,
  constituentId: string,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Delete related records first
    await Promise.all([
      tx.brief.deleteMany({ where: { constituentId } }),
      tx.alert.deleteMany({ where: { constituentId } }),
      tx.prediction.deleteMany({ where: { constituentId } }),
      tx.contact.deleteMany({ where: { constituentId } }),
      tx.gift.deleteMany({ where: { constituentId } }),
    ]);

    // Delete constituent
    await tx.constituent.delete({ where: { id: constituentId } });
  });

  // Audit log
  await createAuditLog({
    organizationId,
    userId,
    action: "constituent.delete",
    resourceType: "constituent",
    resourceId: constituentId,
  });
}

/**
 * Soft delete (deactivate) a constituent
 */
export async function deactivateConstituent(
  organizationId: string,
  constituentId: string,
  userId: string
): Promise<void> {
  await prisma.constituent.update({
    where: { id: constituentId },
    data: { isActive: false },
  });

  await createAuditLog({
    organizationId,
    userId,
    action: "constituent.deactivate",
    resourceType: "constituent",
    resourceId: constituentId,
  });
}
