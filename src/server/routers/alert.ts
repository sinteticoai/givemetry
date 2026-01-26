// Alert router - Phase 12 (US10)
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc/init";
import { getPortfolioFilter } from "../trpc/context";

const listSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  status: z.enum(["active", "dismissed", "acted_on"]).optional(),
  alertType: z.string().optional(),
  severity: z.enum(["high", "medium", "low"]).optional(),
});

export const alertRouter = router({
  // List alerts
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const portfolioFilter = getPortfolioFilter(ctx);

    const constituentWhere = portfolioFilter
      ? { constituent: portfolioFilter }
      : {};

    const alerts = await ctx.prisma.alert.findMany({
      where: {
        organizationId: ctx.session.user.organizationId,
        ...constituentWhere,
        ...(input.status && { status: input.status }),
        ...(input.alertType && { alertType: input.alertType }),
        ...(input.severity && { severity: input.severity }),
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: input.limit + 1,
      ...(input.cursor && {
        cursor: { id: input.cursor },
        skip: 1,
      }),
      include: {
        constituent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    let nextCursor: string | undefined;
    if (alerts.length > input.limit) {
      const nextItem = alerts.pop();
      nextCursor = nextItem?.id;
    }

    return { items: alerts, nextCursor };
  }),

  // Get single alert
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const alert = await ctx.prisma.alert.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
        include: {
          constituent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              assignedOfficer: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!alert) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert not found",
        });
      }

      return alert;
    }),

  // Dismiss alert
  dismiss: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const alert = await ctx.prisma.alert.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
      });

      if (!alert) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert not found",
        });
      }

      await ctx.prisma.alert.update({
        where: { id: input.id },
        data: {
          status: "dismissed",
          actedOnAt: new Date(),
          actedOnBy: ctx.session.user.name || ctx.session.user.email,
        },
      });

      return { success: true };
    }),

  // Mark alert as acted upon
  markActed: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const alert = await ctx.prisma.alert.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
      });

      if (!alert) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert not found",
        });
      }

      await ctx.prisma.alert.update({
        where: { id: input.id },
        data: {
          status: "acted_on",
          actedOnAt: new Date(),
          actedOnBy: ctx.session.user.name || ctx.session.user.email,
          description: input.notes
            ? `${alert.description}\n\nAction notes: ${input.notes}`
            : alert.description,
        },
      });

      return { success: true };
    }),

  // Get alert counts (for badge)
  counts: protectedProcedure.query(async ({ ctx }) => {
    const portfolioFilter = getPortfolioFilter(ctx);

    const constituentWhere = portfolioFilter
      ? { constituent: portfolioFilter }
      : {};

    const [active, high] = await Promise.all([
      ctx.prisma.alert.count({
        where: {
          organizationId: ctx.session.user.organizationId,
          ...constituentWhere,
          status: "active",
        },
      }),
      ctx.prisma.alert.count({
        where: {
          organizationId: ctx.session.user.organizationId,
          ...constituentWhere,
          status: "active",
          severity: "high",
        },
      }),
    ]);

    return { active, high };
  }),
});
