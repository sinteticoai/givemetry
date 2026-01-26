// Contact router - T041
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc/init";
import { getPortfolioFilter } from "../trpc/context";

const listSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  constituentId: z.string().uuid().optional(),
  contactType: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  sortBy: z.enum(["contactDate", "createdAt"]).default("contactDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const getSchema = z.object({
  id: z.string().uuid(),
});

const getByConstituentSchema = z.object({
  constituentId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(20),
});

const createSchema = z.object({
  constituentId: z.string().uuid(),
  contactType: z.enum(["meeting", "call", "email", "event", "letter"]),
  contactDate: z.date(),
  subject: z.string().optional(),
  notes: z.string().optional(),
  outcome: z.enum(["positive", "neutral", "negative", "no_response"]).optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.date().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().optional(),
  notes: z.string().optional(),
  outcome: z.enum(["positive", "neutral", "negative", "no_response"]).optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.date().nullable().optional(),
});

export const contactRouter = router({
  // T041: List contacts with filtering
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const portfolioFilter = getPortfolioFilter(ctx);

    const constituentWhere = portfolioFilter
      ? { constituent: portfolioFilter }
      : {};

    const where = {
      organizationId: ctx.session.user.organizationId,
      ...constituentWhere,
      ...(input.constituentId && { constituentId: input.constituentId }),
      ...(input.contactType && { contactType: input.contactType }),
      ...(input.startDate && { contactDate: { gte: input.startDate } }),
      ...(input.endDate && { contactDate: { lte: input.endDate } }),
    };

    const orderBy = {
      [input.sortBy]: input.sortOrder,
    };

    const contacts = await ctx.prisma.contact.findMany({
      where,
      orderBy,
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
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    let nextCursor: string | undefined;
    if (contacts.length > input.limit) {
      const nextItem = contacts.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items: contacts,
      nextCursor,
    };
  }),

  // T041: Get single contact
  get: protectedProcedure.input(getSchema).query(async ({ ctx, input }) => {
    const contact = await ctx.prisma.contact.findFirst({
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
            assignedOfficerId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!contact) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Contact not found",
      });
    }

    return contact;
  }),

  // T041: Get contacts by constituent
  getByConstituent: protectedProcedure
    .input(getByConstituentSchema)
    .query(async ({ ctx, input }) => {
      // Verify access to constituent
      const portfolioFilter = getPortfolioFilter(ctx);
      const constituent = await ctx.prisma.constituent.findFirst({
        where: {
          id: input.constituentId,
          ...portfolioFilter,
        },
      });

      if (!constituent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Constituent not found",
        });
      }

      const contacts = await ctx.prisma.contact.findMany({
        where: {
          constituentId: input.constituentId,
        },
        orderBy: { contactDate: "desc" },
        take: input.limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Calculate summary stats
      const stats = await ctx.prisma.contact.aggregate({
        where: { constituentId: input.constituentId },
        _count: true,
        _max: { contactDate: true },
      });

      const byType = await ctx.prisma.contact.groupBy({
        by: ["contactType"],
        where: { constituentId: input.constituentId },
        _count: true,
      });

      return {
        contacts,
        stats: {
          count: stats._count,
          lastContactDate: stats._max.contactDate,
          byType,
        },
      };
    }),

  // Create contact
  create: protectedProcedure
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify access to constituent
      const portfolioFilter = getPortfolioFilter(ctx);
      const constituent = await ctx.prisma.constituent.findFirst({
        where: {
          id: input.constituentId,
          ...portfolioFilter,
        },
      });

      if (!constituent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Constituent not found",
        });
      }

      const contact = await ctx.prisma.contact.create({
        data: {
          ...input,
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.session.user.organizationId,
          userId: ctx.session.user.id,
          action: "contact.create",
          resourceType: "contact",
          resourceId: contact.id,
        },
      });

      return contact;
    }),

  // Update contact
  update: protectedProcedure
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.contact.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session.user.organizationId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      const contact = await ctx.prisma.contact.update({
        where: { id: input.id },
        data: {
          subject: input.subject,
          notes: input.notes,
          outcome: input.outcome,
          nextAction: input.nextAction,
          nextActionDate: input.nextActionDate,
        },
      });

      return contact;
    }),
});
