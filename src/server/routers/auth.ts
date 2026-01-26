// Auth router - T046-T057
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc/init";
import {
  generateVerificationToken,
  generatePasswordResetToken,
  hashToken,
  generateSlug,
} from "@/lib/auth/tokens";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "@/server/services/email";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(1, "Name is required"),
  organizationName: z.string().min(1, "Organization name is required"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  preferences: z.record(z.string(), z.any()).optional(),
});

export const authRouter = router({
  // T046: Signup - create org + admin user, send verification
  signup: publicProcedure.input(signupSchema).mutation(async ({ ctx, input }) => {
    // Check if email already exists
    const existingUser = await ctx.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An account with this email already exists",
      });
    }

    // Generate organization slug
    const baseSlug = generateSlug(input.organizationName);
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (await ctx.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 12);

    // In development mode, auto-verify users
    const isDev = process.env.NODE_ENV === "development";

    // Generate verification token (only needed in production)
    const { token, hashedToken, expires } = generateVerificationToken();

    // Create organization and user in a transaction
    await ctx.prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug,
        },
      });

      // Create admin user (auto-verified in dev mode)
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          organizationId: organization.id,
          role: "admin",
          emailVerified: isDev ? new Date() : null,
        },
      });

      // Create verification token (only in production)
      if (!isDev) {
        await tx.verificationToken.create({
          data: {
            identifier: input.email,
            token: hashedToken,
            expires,
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          action: "user.signup",
          resourceType: "user",
          resourceId: user.id,
        },
      });

    });

    // Send verification email (only in production)
    if (!isDev) {
      await sendVerificationEmail({
        to: input.email,
        name: input.name,
        token,
      });
    }

    return {
      success: true,
      message: isDev
        ? "Account created and auto-verified (dev mode). You can now sign in."
        : "Account created. Please check your email to verify your account.",
    };
  }),

  // T048: Verify email
  verifyEmail: publicProcedure
    .input(verifyEmailSchema)
    .mutation(async ({ ctx, input }) => {
      const hashedToken = hashToken(input.token);

      // Find and validate token
      const verificationToken = await ctx.prisma.verificationToken.findFirst({
        where: {
          token: hashedToken,
          expires: { gt: new Date() },
        },
      });

      if (!verificationToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification link",
        });
      }

      // Update user and delete token
      await ctx.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { email: verificationToken.identifier },
          data: { emailVerified: new Date() },
        });

        await tx.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: verificationToken.identifier,
              token: hashedToken,
            },
          },
        });
      });

      return {
        success: true,
        message: "Email verified successfully. You can now sign in.",
      };
    }),

  // T050: Forgot password
  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return {
          success: true,
          message: "If an account exists, a reset link has been sent.",
        };
      }

      // Generate reset token
      const { token, hashedToken, expires } = generatePasswordResetToken();

      // Delete any existing reset tokens for this email
      await ctx.prisma.passwordResetToken.deleteMany({
        where: { email: input.email },
      });

      // Create new reset token
      await ctx.prisma.passwordResetToken.create({
        data: {
          email: input.email,
          token: hashedToken,
          expires,
        },
      });

      // Send reset email
      await sendPasswordResetEmail({
        to: input.email,
        name: user.name || "User",
        token,
      });

      return {
        success: true,
        message: "If an account exists, a reset link has been sent.",
      };
    }),

  // T052: Reset password
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const hashedToken = hashToken(input.token);

      // Find and validate token
      const resetToken = await ctx.prisma.passwordResetToken.findFirst({
        where: {
          token: hashedToken,
          expires: { gt: new Date() },
        },
      });

      if (!resetToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset link",
        });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(input.password, 12);

      // Update password and delete token
      await ctx.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { email: resetToken.email },
          data: { passwordHash },
        });

        await tx.passwordResetToken.delete({
          where: { id: resetToken.id },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: "user.password_reset",
            resourceType: "user",
            resourceId: user.id,
          },
        });
      });

      return {
        success: true,
        message: "Password reset successfully. You can now sign in.",
      };
    }),

  // T55: Get session
  getSession: protectedProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  // T56: Change password
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current password is incorrect",
        });
      }

      // Hash and update new password
      const passwordHash = await bcrypt.hash(input.newPassword, 12);

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "user.password_change",
          resourceType: "user",
          resourceId: user.id,
        },
      });

      return { success: true };
    }),

  // T57: Update profile
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          name: input.name,
          ...(input.preferences && { preferences: input.preferences }),
        },
      });

      return { success: true, user };
    }),
});
