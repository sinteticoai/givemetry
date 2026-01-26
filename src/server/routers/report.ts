// T209-T211: Report router - Phase 11 (US9)
// Full implementation with generate, get, list, delete, schedule, getSchedules, cancelSchedule
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, managerProcedure } from "../trpc/init";
import {
  generateExecutiveReport,
  generatePortfolioHealthReport,
  generateLapseRiskReport,
  generatePrioritiesReport,
  type ReportGeneratorInput,
} from "../services/report/report-generator";
import { aggregateReportContent } from "../services/report/content-aggregator";

// Input schemas
const generateSchema = z.object({
  reportType: z.enum(["executive", "portfolio", "campaign", "lapse_risk", "priorities"]),
  title: z.string().min(1).max(255),
  format: z.enum(["pdf", "html"]).default("pdf"),
  sections: z
    .array(
      z.enum([
        "portfolioHealth",
        "topOpportunities",
        "riskAlerts",
        "keyMetrics",
        "recommendedActions",
        "portfolioBalance",
      ])
    )
    .optional(),
  parameters: z
    .object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      includeCharts: z.boolean().default(true),
      includeRecommendations: z.boolean().default(true),
    })
    .optional(),
  customCommentary: z.string().max(5000).optional(),
  includeLogo: z.boolean().default(true),
});

const scheduleSchema = z.object({
  reportType: z.enum(["executive", "portfolio", "campaign", "lapse_risk", "priorities"]),
  title: z.string().min(1).max(255),
  cron: z.string().regex(/^[\d*,/-]+\s[\d*,/-]+\s[\d*,/-]+\s[\d*,/-]+\s[\d*,/-]+$/),
  parameters: z.record(z.string(), z.unknown()).optional(),
  sections: z
    .array(
      z.enum([
        "portfolioHealth",
        "topOpportunities",
        "riskAlerts",
        "keyMetrics",
        "recommendedActions",
        "portfolioBalance",
      ])
    )
    .optional(),
  recipients: z.array(z.string().email()).optional(),
});

/**
 * Calculate next run time from cron expression
 */
function calculateNextRunTime(cronExpression: string): Date {
  // Simple implementation: next occurrence
  // For production, use a proper cron parser
  const parts = cronExpression.split(" ");
  const now = new Date();
  const next = new Date(now);

  // Parse minute and hour if specified
  const minute = parts[0];
  const hour = parts[1];

  if (minute !== "*") {
    next.setMinutes(parseInt(minute || "0", 10));
  }
  if (hour !== "*") {
    next.setHours(parseInt(hour || "9", 10));
  }

  // If time has passed today, add a day
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

export const reportRouter = router({
  // T209: Generate report
  generate: managerProcedure.input(generateSchema).mutation(async ({ ctx, input }) => {
    const organizationId = ctx.session.user.organizationId;

    // Create report record with queued status
    const report = await ctx.prisma.report.create({
      data: {
        organizationId,
        userId: ctx.session.user.id,
        reportType: input.reportType,
        title: input.title,
        parameters: {
          format: input.format,
          sections: input.sections,
          startDate: input.parameters?.startDate?.toISOString(),
          endDate: input.parameters?.endDate?.toISOString(),
          includeCharts: input.parameters?.includeCharts,
          includeRecommendations: input.parameters?.includeRecommendations,
          customCommentary: input.customCommentary,
          includeLogo: input.includeLogo,
        },
        status: "queued",
      },
    });

    // Audit log
    await ctx.prisma.auditLog.create({
      data: {
        organizationId,
        userId: ctx.session.user.id,
        action: "report.generate",
        resourceType: "report",
        resourceId: report.id,
        details: {
          reportType: input.reportType,
          title: input.title,
        },
      },
    });

    // In a real implementation, we would queue this for background processing
    // For now, we'll generate immediately for smaller organizations

    try {
      // Fetch organization data
      const [organization, constituents, gifts, contacts, users] = await Promise.all([
        ctx.prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true },
        }),
        ctx.prisma.constituent.findMany({
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
        ctx.prisma.gift.findMany({
          where: {
            organizationId,
            ...(input.parameters?.startDate && {
              giftDate: { gte: input.parameters.startDate },
            }),
            ...(input.parameters?.endDate && {
              giftDate: { lte: input.parameters.endDate },
            }),
          },
          select: {
            id: true,
            constituentId: true,
            amount: true,
            giftDate: true,
          },
        }),
        ctx.prisma.contact.findMany({
          where: {
            organizationId,
            ...(input.parameters?.startDate && {
              contactDate: { gte: input.parameters.startDate },
            }),
            ...(input.parameters?.endDate && {
              contactDate: { lte: input.parameters.endDate },
            }),
          },
          select: {
            id: true,
            constituentId: true,
            contactDate: true,
            contactType: true,
          },
        }),
        ctx.prisma.user.findMany({
          where: { organizationId, role: "gift_officer" },
          select: { id: true, name: true },
        }),
      ]);

      // Update status to generating
      await ctx.prisma.report.update({
        where: { id: report.id },
        data: { status: "generating" },
      });

      // Aggregate content
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
        dateRange:
          input.parameters?.startDate && input.parameters?.endDate
            ? {
                start: input.parameters.startDate,
                end: input.parameters.endDate,
              }
            : undefined,
      });

      // Generate report content based on type
      const reportInput: ReportGeneratorInput = {
        organizationId,
        organizationName: organization?.name || "Unknown Organization",
        userId: ctx.session.user.id,
        reportType:
          input.reportType === "executive"
            ? "executive_summary"
            : input.reportType === "portfolio"
              ? "portfolio_health"
              : input.reportType === "lapse_risk"
                ? "lapse_risk"
                : input.reportType === "priorities"
                  ? "priorities"
                  : "custom",
        sections:
          input.sections || [
            "portfolioHealth",
            "topOpportunities",
            "riskAlerts",
            "keyMetrics",
            "recommendedActions",
            "portfolioBalance",
          ],
        dateRange:
          input.parameters?.startDate && input.parameters?.endDate
            ? {
                start: input.parameters.startDate,
                end: input.parameters.endDate,
              }
            : undefined,
        customTitle: input.title,
        customCommentary: input.customCommentary,
        includeLogo: input.includeLogo,
        aggregatedData,
      };

      let content;
      switch (input.reportType) {
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
      const updatedReport = await ctx.prisma.report.update({
        where: { id: report.id },
        data: {
          status: "completed",
          content: JSON.parse(JSON.stringify(content)),
          // In production, we'd generate PDF and store path
          // storagePath: `/reports/${report.id}.pdf`,
        },
      });

      return updatedReport;
    } catch (error) {
      // Mark as failed
      await ctx.prisma.report.update({
        where: { id: report.id },
        data: { status: "failed" },
      });

      console.error("Report generation failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate report",
      });
    }
  }),

  // T210: Get report
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      return report;
    }),

  // T210: List reports
  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
        reportType: z.string().optional(),
        status: z.enum(["queued", "generating", "completed", "failed", "scheduled"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const reports = await ctx.prisma.report.findMany({
        where: {
          organizationId: ctx.session.user.organizationId,
          ...(input.reportType && { reportType: input.reportType }),
          ...(input.status && { status: input.status }),
          // Exclude scheduled reports from regular list
          ...(input.status !== "scheduled" && { scheduleCron: null }),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      });

      let nextCursor: string | undefined;
      if (reports.length > input.limit) {
        const nextItem = reports.pop();
        nextCursor = nextItem?.id;
      }

      return { items: reports, nextCursor };
    }),

  // T210: Delete report
  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      // TODO: Delete associated file from storage if exists
      // if (report.storagePath) {
      //   await deleteFile(report.storagePath);
      // }

      await ctx.prisma.report.delete({
        where: { id: input.id },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "report.delete",
          resourceType: "report",
          resourceId: input.id,
        },
      });

      return { success: true };
    }),

  // T211: Schedule report
  schedule: managerProcedure.input(scheduleSchema).mutation(async ({ ctx, input }) => {
    const nextRunAt = calculateNextRunTime(input.cron);

    const report = await ctx.prisma.report.create({
      data: {
        organizationId: ctx.session.user.organizationId,
        userId: ctx.session.user.id,
        reportType: input.reportType,
        title: input.title,
        parameters: {
          sections: input.sections,
          recipients: input.recipients,
          ...((input.parameters as object) || {}),
        },
        scheduleCron: input.cron,
        nextRunAt,
        status: "scheduled",
      },
    });

    // Audit log
    await ctx.prisma.auditLog.create({
      data: {
        organizationId: ctx.session.user.organizationId,
        userId: ctx.session.user.id,
        action: "report.schedule",
        resourceType: "report",
        resourceId: report.id,
        details: {
          cron: input.cron,
          nextRunAt: nextRunAt.toISOString(),
        },
      },
    });

    return report;
  }),

  // T211: Get schedules
  getSchedules: protectedProcedure.query(async ({ ctx }) => {
    const schedules = await ctx.prisma.report.findMany({
      where: {
        organizationId: ctx.session.user.organizationId,
        status: "scheduled",
        scheduleCron: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });

    return schedules;
  }),

  // T211: Cancel schedule
  cancelSchedule: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
          status: "scheduled",
        },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scheduled report not found",
        });
      }

      await ctx.prisma.report.delete({
        where: { id: input.id },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "report.cancel_schedule",
          resourceType: "report",
          resourceId: input.id,
        },
      });

      return { success: true };
    }),

  // Get report content for preview/rendering
  getContent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
          status: "completed",
        },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found or not yet completed",
        });
      }

      return {
        id: report.id,
        title: report.title,
        reportType: report.reportType,
        content: report.content,
        createdAt: report.createdAt,
      };
    }),
});
