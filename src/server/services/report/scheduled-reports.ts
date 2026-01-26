// T213: Scheduled report cron job
// Processes scheduled reports based on cron expressions

import { prisma } from "@/lib/prisma/client";
import { processReportJob } from "./report-worker";

/**
 * Parse a simple cron expression and check if it should run now
 * Supports: minute hour day-of-month month day-of-week
 *
 * Examples:
 * - "0 9 * * 1" = Every Monday at 9:00 AM
 * - "0 9 1 * *" = First day of every month at 9:00 AM
 * - "30 8 * * 1-5" = Weekdays at 8:30 AM
 */
function shouldRunNow(cronExpression: string, now: Date): boolean {
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Check minute
  if (minute !== "*" && !matchesCronPart(minute!, now.getMinutes())) {
    return false;
  }

  // Check hour
  if (hour !== "*" && !matchesCronPart(hour!, now.getHours())) {
    return false;
  }

  // Check day of month
  if (dayOfMonth !== "*" && !matchesCronPart(dayOfMonth!, now.getDate())) {
    return false;
  }

  // Check month (cron months are 1-12, JS months are 0-11)
  if (month !== "*" && !matchesCronPart(month!, now.getMonth() + 1)) {
    return false;
  }

  // Check day of week (0 = Sunday, 6 = Saturday)
  if (dayOfWeek !== "*" && !matchesCronPart(dayOfWeek!, now.getDay())) {
    return false;
  }

  return true;
}

/**
 * Match a cron part against a value
 * Supports: *, specific values, ranges (1-5), lists (1,3,5)
 */
function matchesCronPart(part: string, value: number): boolean {
  if (part === "*") return true;

  // Handle lists (e.g., "1,3,5")
  if (part.includes(",")) {
    return part.split(",").some((p) => matchesCronPart(p, value));
  }

  // Handle ranges (e.g., "1-5")
  if (part.includes("-")) {
    const [start, end] = part.split("-").map(Number);
    return value >= (start ?? 0) && value <= (end ?? 0);
  }

  // Handle step values (e.g., "*/5")
  if (part.includes("/")) {
    const [, step] = part.split("/");
    return value % (parseInt(step ?? "1", 10)) === 0;
  }

  // Direct match
  return parseInt(part, 10) === value;
}

/**
 * Calculate next run time from cron expression
 */
export function calculateNextRunTime(cronExpression: string, fromDate: Date = new Date()): Date {
  const next = new Date(fromDate);
  next.setSeconds(0, 0);

  // Try the next 366 days to find a match
  for (let i = 0; i < 366 * 24 * 60; i++) {
    next.setMinutes(next.getMinutes() + 1);

    if (shouldRunNow(cronExpression, next)) {
      return next;
    }
  }

  // Default to tomorrow at 9 AM if no match found
  const defaultNext = new Date(fromDate);
  defaultNext.setDate(defaultNext.getDate() + 1);
  defaultNext.setHours(9, 0, 0, 0);
  return defaultNext;
}

/**
 * Process all scheduled reports that are due
 */
export async function processScheduledReports(): Promise<number> {
  const now = new Date();

  // Find scheduled reports that are due
  const dueReports = await prisma.report.findMany({
    where: {
      status: "scheduled",
      scheduleCron: { not: null },
      nextRunAt: { lte: now },
    },
    orderBy: { nextRunAt: "asc" },
    take: 20, // Process in batches
  });

  let processed = 0;

  for (const schedule of dueReports) {
    if (!schedule.scheduleCron) continue;

    try {
      console.log(`Processing scheduled report: ${schedule.id}`);

      // Create a new report instance from the schedule
      const newReport = await prisma.report.create({
        data: {
          organizationId: schedule.organizationId,
          userId: schedule.userId,
          reportType: schedule.reportType,
          title: `${schedule.title} - ${now.toLocaleDateString()}`,
          parameters: schedule.parameters ?? undefined,
          status: "queued",
        },
      });

      // Process the report
      await processReportJob({
        reportId: newReport.id,
        organizationId: schedule.organizationId,
        reportType: schedule.reportType,
        parameters: (schedule.parameters as Record<string, unknown>) || {},
      });

      // Update schedule with next run time and last run time
      const nextRunAt = calculateNextRunTime(schedule.scheduleCron, now);

      await prisma.report.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          nextRunAt,
        },
      });

      // Send report to recipients if configured
      const parameters = schedule.parameters as Record<string, unknown>;
      const recipients = parameters?.recipients as string[] | undefined;

      if (recipients && recipients.length > 0) {
        await sendReportToRecipients(newReport.id, recipients);
      }

      processed++;
      console.log(`Scheduled report ${schedule.id} processed, next run at ${nextRunAt}`);
    } catch (error) {
      console.error(`Failed to process scheduled report ${schedule.id}:`, error);

      // Log the error but don't stop processing other reports
      await prisma.auditLog.create({
        data: {
          organizationId: schedule.organizationId,
          action: "report.schedule_failed",
          resourceType: "report",
          resourceId: schedule.id,
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
      });
    }
  }

  return processed;
}

/**
 * Send report to email recipients
 * In production, this would integrate with an email service
 */
async function sendReportToRecipients(reportId: string, recipients: string[]): Promise<void> {
  // Get report details
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      organization: { select: { name: true } },
    },
  });

  if (!report) return;

  // Log the email send attempt
  // In production, integrate with email service (e.g., Resend, SendGrid)
  console.log(`Would send report ${reportId} to:`, recipients);

  // Create audit log
  await prisma.auditLog.create({
    data: {
      organizationId: report.organizationId,
      action: "report.email_sent",
      resourceType: "report",
      resourceId: reportId,
      details: {
        recipients,
        reportTitle: report.title,
      },
    },
  });
}

/**
 * Clean up old completed reports (older than 90 days)
 */
export async function cleanupOldReports(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const result = await prisma.report.deleteMany({
    where: {
      status: "completed",
      createdAt: { lt: cutoffDate },
      // Don't delete scheduled templates
      scheduleCron: null,
    },
  });

  console.log(`Cleaned up ${result.count} old reports`);
  return result.count;
}

/**
 * Get schedule summary for monitoring
 */
export async function getScheduleSummary(): Promise<{
  totalScheduled: number;
  dueNow: number;
  failedRecently: number;
}> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [totalScheduled, dueNow, failedRecently] = await Promise.all([
    prisma.report.count({
      where: { status: "scheduled" },
    }),
    prisma.report.count({
      where: {
        status: "scheduled",
        nextRunAt: { lte: now },
      },
    }),
    prisma.report.count({
      where: {
        status: "failed",
        createdAt: { gte: oneDayAgo },
      },
    }),
  ]);

  return { totalScheduled, dueNow, failedRecently };
}
