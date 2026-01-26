// Report router - Phase 11 (US9)
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, managerProcedure } from "../trpc/init";

const generateSchema = z.object({
  reportType: z.enum(["executive", "portfolio", "campaign"]),
  title: z.string().min(1).max(255),
  parameters: z
    .object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      includeCharts: z.boolean().default(true),
      includeRecommendations: z.boolean().default(true),
    })
    .optional(),
});

const scheduleSchema = z.object({
  reportType: z.enum(["executive", "portfolio", "campaign"]),
  title: z.string().min(1).max(255),
  cron: z.string().regex(/^[\d*,/-]+\s[\d*,/-]+\s[\d*,/-]+\s[\d*,/-]+\s[\d*,/-]+$/),
  parameters: z.record(z.string(), z.any()).optional(),
});

export const reportRouter = router({
  // Generate report
  generate: managerProcedure
    .input(generateSchema)
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          reportType: input.reportType,
          title: input.title,
          parameters: input.parameters,
          status: "queued",
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "report.generate",
          resourceType: "report",
          resourceId: report.id,
        },
      });

      return report;
    }),

  // Get report
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

  // List reports
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

  // Delete report
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

      await ctx.prisma.report.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Schedule report
  schedule: managerProcedure
    .input(scheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          reportType: input.reportType,
          title: input.title,
          ...(input.parameters && { parameters: input.parameters }),
          scheduleCron: input.cron,
          status: "scheduled",
        },
      });

      return report;
    }),

  // Get schedules
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

  // Cancel schedule
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

      return { success: true };
    }),
});
