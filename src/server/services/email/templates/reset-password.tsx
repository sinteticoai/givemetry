// T027: Password reset email template
import * as React from "react";

interface ResetPasswordTemplateProps {
  name: string;
  resetUrl: string;
  expiresIn: string;
}

export function ResetPasswordTemplate({
  name,
  resetUrl,
  expiresIn,
}: ResetPasswordTemplateProps) {
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "#1a1a2e",
          padding: "30px",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <h1
          style={{
            color: "#ffffff",
            margin: 0,
            fontSize: "24px",
          }}
        >
          GiveMetry
        </h1>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "30px",
          border: "1px solid #e5e5e5",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
        }}
      >
        <h2 style={{ color: "#333333", marginTop: 0 }}>Reset your password</h2>

        <p style={{ color: "#666666", lineHeight: "1.6" }}>Hi {name},</p>

        <p style={{ color: "#666666", lineHeight: "1.6" }}>
          We received a request to reset your password. Click the button below
          to choose a new password.
        </p>

        <div style={{ textAlign: "center", margin: "30px 0" }}>
          <a
            href={resetUrl}
            style={{
              backgroundColor: "#1a1a2e",
              color: "#ffffff",
              padding: "14px 30px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-block",
              fontWeight: "bold",
            }}
          >
            Reset Password
          </a>
        </div>

        <p style={{ color: "#666666", lineHeight: "1.6", fontSize: "14px" }}>
          This link will expire in {expiresIn}. If you didn&apos;t request a
          password reset, you can safely ignore this email. Your password will
          remain unchanged.
        </p>

        <hr
          style={{
            border: "none",
            borderTop: "1px solid #e5e5e5",
            margin: "30px 0",
          }}
        />

        <p
          style={{
            color: "#999999",
            fontSize: "12px",
            lineHeight: "1.6",
          }}
        >
          If the button doesn&apos;t work, copy and paste this URL into your
          browser:
          <br />
          <a href={resetUrl} style={{ color: "#1a1a2e", wordBreak: "break-all" }}>
            {resetUrl}
          </a>
        </p>
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "20px",
          color: "#999999",
          fontSize: "12px",
        }}
      >
        <p style={{ margin: 0 }}>
          GiveMetry - AI-Powered Advancement Intelligence
        </p>
      </div>
    </div>
  );
}

export function getResetPasswordHtml(props: ResetPasswordTemplateProps): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1a1a2e; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">GiveMetry</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333333; margin-top: 0;">Reset your password</h2>
          <p style="color: #666666; line-height: 1.6;">Hi ${props.name},</p>
          <p style="color: #666666; line-height: 1.6;">
            We received a request to reset your password. Click the button below to choose a new password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${props.resetUrl}" style="background-color: #1a1a2e; color: #ffffff; padding: 14px 30px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666666; line-height: 1.6; font-size: 14px;">
            This link will expire in ${props.expiresIn}. If you didn't request this, ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
          <p style="color: #999999; font-size: 12px; line-height: 1.6;">
            Or copy this URL: <a href="${props.resetUrl}" style="color: #1a1a2e;">${props.resetUrl}</a>
          </p>
        </div>
      </body>
    </html>
  `;
}
