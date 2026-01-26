// T028: Email service with send functions
import { sendEmail, FROM_EMAIL } from "./resend";
import { getVerifyEmailHtml } from "./templates/verify-email";
import { getResetPasswordHtml } from "./templates/reset-password";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export interface SendVerificationEmailParams {
  to: string;
  name: string;
  token: string;
}

export async function sendVerificationEmail({
  to,
  name,
  token,
}: SendVerificationEmailParams) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  return sendEmail({
    to,
    subject: "Verify your email - GiveMetry",
    html: getVerifyEmailHtml({
      name,
      verifyUrl,
      expiresIn: "24 hours",
    }),
  });
}

export interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  token: string;
}

export async function sendPasswordResetEmail({
  to,
  name,
  token,
}: SendPasswordResetEmailParams) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  return sendEmail({
    to,
    subject: "Reset your password - GiveMetry",
    html: getResetPasswordHtml({
      name,
      resetUrl,
      expiresIn: "1 hour",
    }),
  });
}

export interface SendInviteEmailParams {
  to: string;
  inviterName: string;
  organizationName: string;
  token: string;
}

export async function sendInviteEmail({
  to,
  inviterName,
  organizationName,
  token,
}: SendInviteEmailParams) {
  const inviteUrl = `${APP_URL}/signup?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're invited to GiveMetry</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1a1a2e; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">GiveMetry</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333333; margin-top: 0;">You're invited!</h2>
          <p style="color: #666666; line-height: 1.6;">
            ${inviterName} has invited you to join <strong>${organizationName}</strong> on GiveMetry,
            the AI-powered advancement intelligence platform.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #1a1a2e; color: #ffffff; padding: 14px 30px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666666; line-height: 1.6; font-size: 14px;">
            This invitation will expire in 7 days.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `${inviterName} invited you to ${organizationName} on GiveMetry`,
    html,
  });
}

export { sendEmail, FROM_EMAIL };
