// T212: Report generation worker
// Handles background report generation

import { prisma } from "@/lib/prisma/client";
import {
  generateExecutiveReport,
  generatePortfolioHealthReport,
  generateLapseRiskReport,
  generatePrioritiesReport,
  type ReportGeneratorInput,
} from "./report-generator";
import { aggregateReportContent } from "./content-aggregator";

interface ReportJob {
  reportId: string;
  organizationId: string;
  reportType: string;
  parameters: Record<string, unknown>;
}

/**
 * Process a single report generation job
 */
export async function processReportJob(job: ReportJob): Promise<void> {
  const { reportId, organizationId, reportType, parameters } = job;

  try {
    // Update status to generating
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "generating" },
    });

    // Fetch organization data
    const [organization, constituents, gifts, contacts, users] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      }),
      prisma.constituent.findMany({
        where: { organizationId, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          priorityScore: true,
          lapseRiskScore: true,
          estimatedCapacity: true,
          assignedOfficerId: true,
          dataQualityScore: true,
        },
      }),
      prisma.gift.findMany({
        where: {
          organizationId,
          ...(parameters.startDate
            ? { giftDate: { gte: new Date(parameters.startDate as string) } }
            : {}),
          ...(parameters.endDate
            ? { giftDate: { lte: new Date(parameters.endDate as string) } }
            : {}),
        },
        select: {
          id: true,
          constituentId: true,
          amount: true,
          giftDate: true,
        },
      }),
      prisma.contact.findMany({
        where: {
          organizationId,
          ...(parameters.startDate
            ? { contactDate: { gte: new Date(parameters.startDate as string) } }
            : {}),
          ...(parameters.endDate
            ? { contactDate: { lte: new Date(parameters.endDate as string) } }
            : {}),
        },
        select: {
          id: true,
          constituentId: true,
          contactDate: true,
          contactType: true,
        },
      }),
      prisma.user.findMany({
        where: { organizationId, role: "gift_officer" },
        select: { id: true, name: true },
      }),
    ]);

    // Aggregate content
    const dateRange =
      parameters.startDate && parameters.endDate
        ? {
            start: new Date(parameters.startDate as string),
            end: new Date(parameters.endDate as string),
          }
        : undefined;

    const aggregatedData = await aggregateReportContent({
      organizationId,
      constituents: constituents.map((c) => ({
        ...c,
        priorityScore: c.priorityScore ? Number(c.priorityScore) : null,
        lapseRiskScore: c.lapseRiskScore ? Number(c.lapseRiskScore) : null,
        estimatedCapacity: c.estimatedCapacity ? Number(c.estimatedCapacity) : null,
        dataQualityScore: c.dataQualityScore ? Number(c.dataQualityScore) : null,
      })),
      gifts: gifts.map((g) => ({
        ...g,
        amount: Number(g.amount),
      })),
      contacts,
      users,
      dateRange,
    });

    // Get report record for title
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { title: true, userId: true },
    });

    // Generate report content
    const reportInput: ReportGeneratorInput = {
      organizationId,
      organizationName: organization?.name || "Unknown Organization",
      userId: report?.userId || "system",
      reportType:
        reportType === "executive"
          ? "executive_summary"
          : reportType === "portfolio"
            ? "portfolio_health"
            : reportType === "lapse_risk"
              ? "lapse_risk"
              : reportType === "priorities"
                ? "priorities"
                : "custom",
      sections: (parameters.sections as string[]) || [
        "portfolioHealth",
        "topOpportunities",
        "riskAlerts",
        "keyMetrics",
        "recommendedActions",
        "portfolioBalance",
      ],
      dateRange,
      customTitle: report?.title,
      customCommentary: parameters.customCommentary as string | undefined,
      includeLogo: (parameters.includeLogo as boolean) ?? true,
      aggregatedData,
    };

    let content;
    switch (reportType) {
      case "portfolio":
        content = await generatePortfolioHealthReport(reportInput);
        break;
      case "lapse_risk":
        content = await generateLapseRiskReport(reportInput);
        break;
      case "priorities":
        content = await generatePrioritiesReport(reportInput);
        break;
      default:
        content = await generateExecutiveReport(reportInput);
    }

    // Update report with content
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: "completed",
        content: JSON.parse(JSON.stringify(content)),
      },
    });

    console.log(`Report ${reportId} generated successfully`);
  } catch (error) {
    console.error(`Report ${reportId} generation failed:`, error);

    // Mark as failed
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "failed" },
    });

    throw error;
  }
}

/**
 * Process all queued reports
 */
export async function processQueuedReports(): Promise<number> {
  const queuedReports = await prisma.report.findMany({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    take: 10, // Process in batches
  });

  let processed = 0;

  for (const report of queuedReports) {
    try {
      await processReportJob({
        reportId: report.id,
        organizationId: report.organizationId,
        reportType: report.reportType,
        parameters: (report.parameters as Record<string, unknown>) || {},
      });
      processed++;
    } catch (error) {
      console.error(`Failed to process report ${report.id}:`, error);
    }
  }

  return processed;
}

/**
 * Retry failed reports (max 3 attempts)
 */
export async function retryFailedReports(): Promise<number> {
  const failedReports = await prisma.report.findMany({
    where: {
      status: "failed",
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  let retried = 0;

  for (const report of failedReports) {
    const parameters = report.parameters as Record<string, unknown>;
    const retryCount = (parameters._retryCount as number) || 0;

    if (retryCount >= 3) {
      console.log(`Report ${report.id} exceeded max retries`);
      continue;
    }

    try {
      // Update retry count
      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: "queued",
          parameters: {
            ...parameters,
            _retryCount: retryCount + 1,
          },
        },
      });

      await processReportJob({
        reportId: report.id,
        organizationId: report.organizationId,
        reportType: report.reportType,
        parameters,
      });

      retried++;
    } catch (error) {
      console.error(`Retry failed for report ${report.id}:`, error);
    }
  }

  return retried;
}
