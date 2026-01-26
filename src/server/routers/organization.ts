// Organization router - T058, T63, T67
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  adminProcedure,
} from "../trpc/init";
import {
  generateVerificationToken,
} from "@/lib/auth/tokens";
import { sendInviteEmail } from "@/server/services/email";

const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "manager", "gift_officer", "viewer"]),
});

const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  features: z.record(z.string(), z.boolean()).optional(),
});

const deleteDataSchema = z.object({
  confirmPhrase: z.literal("DELETE ALL DATA"),
});

export const organizationRouter = router({
  // Get current organization
  get: protectedProcedure.query(async ({ ctx }) => {
    const organization = await ctx.prisma.organization.findUnique({
      where: { id: ctx.session.user.organizationId },
      include: {
        _count: {
          select: {
            users: true,
            constituents: true,
            uploads: true,
          },
        },
      },
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    return organization;
  }),

  // T058: Invite user to organization
  inviteUser: adminProcedure
    .input(inviteUserSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }

      // Get organization and inviter details
      const organization = await ctx.prisma.organization.findUnique({
        where: { id: ctx.session.user.organizationId },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Generate invite token
      const { token, hashedToken } = generateVerificationToken();

      // Create pending user with invite token
      await ctx.prisma.$transaction(async (tx) => {
        // Store invite token
        await tx.verificationToken.create({
          data: {
            identifier: input.email,
            token: hashedToken,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        // Create user without password (will be set on signup)
        await tx.user.create({
          data: {
            email: input.email,
            name: input.name,
            organizationId: organization.id,
            role: input.role,
            // No passwordHash - user will set password on first login
          },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            organizationId: organization.id,
            userId: ctx.session.user.id,
            action: "user.invite",
            resourceType: "user",
            details: { invitedEmail: input.email, role: input.role },
          },
        });
      });

      // Send invite email
      await sendInviteEmail({
        to: input.email,
        inviterName: ctx.session.user.name || "Admin",
        organizationName: organization.name,
        token,
      });

      return { success: true };
    }),

  // T63: Update organization settings
  updateSettings: adminProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const organization = await ctx.prisma.organization.update({
        where: { id: ctx.session.user.organizationId },
        data: {
          name: input.name,
          ...(input.settings && { settings: input.settings }),
          ...(input.features && { features: input.features }),
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: ctx.session.user.id,
          action: "settings.change",
          resourceType: "organization",
          resourceId: organization.id,
          details: { name: input.name },
        },
      });

      return organization;
    }),

  // T67: Delete all organization data
  deleteAllData: adminProcedure
    .input(deleteDataSchema)
    .mutation(async ({ ctx }) => {
      const organizationId = ctx.session.user.organizationId;

      // This is a destructive operation - cascade delete all data
      await ctx.prisma.$transaction(async (tx) => {
        // Delete in order to respect foreign keys
        await tx.naturalLanguageQuery.deleteMany({ where: { organizationId } });
        await tx.brief.deleteMany({ where: { organizationId } });
        await tx.alert.deleteMany({ where: { organizationId } });
        await tx.prediction.deleteMany({ where: { organizationId } });
        await tx.contact.deleteMany({ where: { organizationId } });
        await tx.gift.deleteMany({ where: { organizationId } });
        await tx.constituent.deleteMany({ where: { organizationId } });
        await tx.upload.deleteMany({ where: { organizationId } });
        await tx.report.deleteMany({ where: { organizationId } });

        // Audit log (keep this, just anonymize)
        await tx.auditLog.create({
          data: {
            organizationId,
            userId: ctx.session.user.id,
            action: "data.delete",
            resourceType: "organization",
            resourceId: organizationId,
            details: { type: "full_data_deletion" },
          },
        });
      });

      return { success: true };
    }),
});
