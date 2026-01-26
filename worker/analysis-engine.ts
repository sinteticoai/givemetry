// T134: Analysis engine worker for batch prediction calculation
import { PrismaClient } from "@prisma/client";
import {
  calculateLapseRiskScore,
  type GiftRecord,
  type ContactRecord,
} from "@/server/services/analysis/lapse-risk";
import { storeBatchPredictions } from "@/server/services/analysis/prediction-store";

const prisma = new PrismaClient();

const BATCH_SIZE = 100; // Process constituents in batches
const POLL_INTERVAL = 60000; // 1 minute between checks

// Reserved for future job queue implementation
// interface AnalysisJob {
//   id: string;
//   organizationId: string;
//   type: "lapse_risk" | "priority" | "all";
//   status: "queued" | "processing" | "completed" | "failed";
//   createdAt: Date;
// }

/**
 * Main worker loop
 */
async function runWorker() {
  console.log("Analysis Engine Worker started");

  while (true) {
    try {
      // Check for organizations needing analysis refresh
      const orgNeedingRefresh = await findOrganizationNeedingRefresh();

      if (orgNeedingRefresh) {
        console.log(`Running analysis for organization: ${orgNeedingRefresh.id}`);
        await runAnalysisForOrganization(orgNeedingRefresh.id);
      } else {
        // No work needed, wait before polling again
        await sleep(POLL_INTERVAL);
      }
    } catch (error) {
      console.error("Analysis worker error:", error);
      await sleep(POLL_INTERVAL);
    }
  }
}

/**
 * Find an organization that needs analysis refresh
 * Criteria:
 * - Has constituents
 * - Has a recent completed upload (within last hour) OR
 * - Hasn't been analyzed in 24 hours
 */
async function findOrganizationNeedingRefresh(): Promise<{ id: string } | null> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find org with recent upload that hasn't triggered analysis
  const orgWithRecentUpload = await prisma.upload.findFirst({
    where: {
      status: "completed",
      completedAt: { gte: oneHourAgo },
      // Check that analysis hasn't been run since upload
      organization: {
        constituents: {
          some: {
            isActive: true,
            // No recent prediction update
            OR: [
              { lapseRiskScore: null },
              { updatedAt: { lt: oneHourAgo } },
            ],
          },
        },
      },
    },
    select: {
      organizationId: true,
    },
    orderBy: {
      completedAt: "desc",
    },
  });

  if (orgWithRecentUpload) {
    return { id: orgWithRecentUpload.organizationId };
  }

  // Find org that hasn't been analyzed in 24 hours
  const staleOrg = await prisma.organization.findFirst({
    where: {
      constituents: {
        some: {
          isActive: true,
          OR: [
            { lapseRiskScore: null },
            { updatedAt: { lt: oneDayAgo } },
          ],
        },
      },
    },
    select: {
      id: true,
    },
  });

  return staleOrg;
}

/**
 * Run lapse risk analysis for all constituents in an organization
 */
async function runAnalysisForOrganization(organizationId: string): Promise<void> {
  console.log(`Starting lapse risk analysis for org: ${organizationId}`);
  const startTime = Date.now();

  // Get total count for progress tracking
  const totalCount = await prisma.constituent.count({
    where: { organizationId, isActive: true },
  });

  console.log(`Found ${totalCount} constituents to analyze`);

  let processed = 0;
  let cursor: string | undefined;

  while (true) {
    // Fetch batch of constituents with their gifts and contacts
    const constituents = await prisma.constituent.findMany({
      where: { organizationId, isActive: true },
      take: BATCH_SIZE,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { id: "asc" },
      select: {
        id: true,
        gifts: {
          select: {
            amount: true,
            giftDate: true,
          },
        },
        contacts: {
          select: {
            contactDate: true,
            contactType: true,
            outcome: true,
          },
        },
      },
    });

    if (constituents.length === 0) break;

    // Calculate lapse risk for each constituent
    const predictions = constituents.map((c) => {
      const gifts: GiftRecord[] = c.gifts.map((g) => ({
        amount: Number(g.amount),
        date: g.giftDate,
      }));

      const contacts: ContactRecord[] = c.contacts.map((ct) => ({
        date: ct.contactDate,
        type: ct.contactType,
        outcome: ct.outcome || undefined,
      }));

      const result = calculateLapseRiskScore({ gifts, contacts });

      return {
        constituentId: c.id,
        result,
      };
    });

    // Store predictions in batch
    await storeBatchPredictions(prisma, organizationId, predictions, "lapse_risk");

    processed += constituents.length;
    const lastConstituent = constituents[constituents.length - 1];
    cursor = lastConstituent?.id;

    console.log(`Progress: ${processed}/${totalCount} (${Math.round(processed / totalCount * 100)}%)`);
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`Analysis complete: ${processed} constituents in ${duration.toFixed(1)}s`);

  // Create audit log
  await prisma.auditLog.create({
    data: {
      organizationId,
      action: "analysis.batch_complete",
      resourceType: "prediction",
      details: {
        type: "lapse_risk",
        count: processed,
        durationSeconds: duration,
      },
    },
  });
}

/**
 * Trigger analysis for a specific organization (called from upload completion)
 */
export async function triggerAnalysisForOrganization(organizationId: string): Promise<void> {
  // Queue the analysis by setting a marker (in this simple version, we just run it)
  // In production, this could add to a job queue
  console.log(`Analysis triggered for org: ${organizationId}`);

  // For now, run synchronously (in production, would queue for worker)
  try {
    await runAnalysisForOrganization(organizationId);
  } catch (error) {
    console.error(`Analysis failed for org ${organizationId}:`, error);
  }
}

/**
 * Calculate lapse risk for a single constituent (on-demand)
 */
export async function calculateConstituentLapseRisk(
  constituentId: string
): Promise<{ score: number; factors: unknown[] }> {
  const constituent = await prisma.constituent.findUnique({
    where: { id: constituentId },
    select: {
      id: true,
      organizationId: true,
      gifts: {
        select: {
          amount: true,
          giftDate: true,
        },
      },
      contacts: {
        select: {
          contactDate: true,
          contactType: true,
          outcome: true,
        },
      },
    },
  });

  if (!constituent) {
    throw new Error("Constituent not found");
  }

  const gifts: GiftRecord[] = constituent.gifts.map((g) => ({
    amount: Number(g.amount),
    date: g.giftDate,
  }));

  const contacts: ContactRecord[] = constituent.contacts.map((c) => ({
    date: c.contactDate,
    type: c.contactType,
    outcome: c.outcome || undefined,
  }));

  const result = calculateLapseRiskScore({ gifts, contacts });

  // Update constituent with new score
  await prisma.constituent.update({
    where: { id: constituentId },
    data: {
      lapseRiskScore: result.score,
      lapseRiskFactors: JSON.parse(JSON.stringify(result.factors)),
    },
  });

  return {
    score: result.score,
    factors: result.factors,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run worker if executed directly
if (require.main === module) {
  runWorker().catch(console.error);
}
