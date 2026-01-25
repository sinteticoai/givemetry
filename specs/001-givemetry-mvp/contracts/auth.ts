/**
 * Auth Router Contract
 * GiveMetry MVP (Phase 1)
 *
 * Handles authentication, session management, and user account operations.
 * Uses NextAuth v5 with Credentials provider.
 */

import { z } from 'zod';

// ============================================
// Input Schemas
// ============================================

export const signupInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(255),
  organizationName: z.string().min(1).max(255),
});

export const loginInput = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const forgotPasswordInput = z.object({
  email: z.string().email(),
});

export const resetPasswordInput = z.object({
  token: z.string(),
  password: z.string().min(8).max(100),
});

export const verifyEmailInput = z.object({
  token: z.string(),
});

export const resendVerificationInput = z.object({
  email: z.string().email(),
});

export const changePasswordInput = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(100),
});

export const updateProfileInput = z.object({
  name: z.string().min(1).max(255).optional(),
  preferences: z.record(z.unknown()).optional(),
});

// ============================================
// Output Schemas
// ============================================

export const sessionOutput = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
    role: z.enum(['admin', 'manager', 'gift_officer', 'viewer']),
    organizationId: z.string().uuid(),
  }),
  organization: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
});

export const signupOutput = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string().uuid().optional(),
});

export const genericSuccessOutput = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================
// Router Definition (tRPC-style)
// ============================================

/**
 * auth.signup
 * - Creates organization + admin user
 * - Sends verification email
 * - Returns success (user cannot login until verified)
 *
 * POST /api/auth/signup
 */
export type SignupProcedure = {
  input: z.infer<typeof signupInput>;
  output: z.infer<typeof signupOutput>;
};

/**
 * auth.getSession
 * - Returns current session if authenticated
 * - Returns null if not authenticated
 *
 * Middleware: Public (no auth required)
 */
export type GetSessionProcedure = {
  input: void;
  output: z.infer<typeof sessionOutput> | null;
};

/**
 * auth.forgotPassword
 * - Sends password reset email (always returns success to prevent enumeration)
 *
 * POST /api/auth/forgot-password
 */
export type ForgotPasswordProcedure = {
  input: z.infer<typeof forgotPasswordInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

/**
 * auth.resetPassword
 * - Validates token and resets password
 * - Deletes token after use
 *
 * POST /api/auth/reset-password
 */
export type ResetPasswordProcedure = {
  input: z.infer<typeof resetPasswordInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

/**
 * auth.verifyEmail
 * - Validates token and marks email as verified
 * - Deletes token after use
 *
 * GET /api/auth/verify-email?token=xxx
 */
export type VerifyEmailProcedure = {
  input: z.infer<typeof verifyEmailInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

/**
 * auth.resendVerification
 * - Sends new verification email
 * - Rate limited: 1 per minute
 *
 * POST /api/auth/resend-verification
 */
export type ResendVerificationProcedure = {
  input: z.infer<typeof resendVerificationInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

/**
 * auth.changePassword
 * - Requires current password verification
 * - Updates password hash
 *
 * Middleware: Protected (requires auth)
 */
export type ChangePasswordProcedure = {
  input: z.infer<typeof changePasswordInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

/**
 * auth.updateProfile
 * - Updates user name and preferences
 *
 * Middleware: Protected (requires auth)
 */
export type UpdateProfileProcedure = {
  input: z.infer<typeof updateProfileInput>;
  output: z.infer<typeof genericSuccessOutput>;
};
