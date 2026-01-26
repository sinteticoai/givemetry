// T026: Email verification template
import * as React from "react";

interface VerifyEmailTemplateProps {
  name: string;
  verifyUrl: string;
  expiresIn: string;
}

export function VerifyEmailTemplate({
  name,
  verifyUrl,
  expiresIn,
}: VerifyEmailTemplateProps) {
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
        <h2 style={{ color: "#333333", marginTop: 0 }}>
          Verify your email address
        </h2>

        <p style={{ color: "#666666", lineHeight: "1.6" }}>
          Hi {name},
        </p>

        <p style={{ color: "#666666", lineHeight: "1.6" }}>
          Thank you for signing up for GiveMetry. Please click the button below
          to verify your email address and complete your account setup.
        </p>

        <div style={{ textAlign: "center", margin: "30px 0" }}>
          <a
            href={verifyUrl}
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
            Verify Email Address
          </a>
        </div>

        <p style={{ color: "#666666", lineHeight: "1.6", fontSize: "14px" }}>
          This link will expire in {expiresIn}. If you didn&apos;t create an
          account with GiveMetry, you can safely ignore this email.
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
          <a href={verifyUrl} style={{ color: "#1a1a2e", wordBreak: "break-all" }}>
            {verifyUrl}
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

export function getVerifyEmailHtml(props: VerifyEmailTemplateProps): string {
  // Simple HTML version for broader email client support
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1a1a2e; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">GiveMetry</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333333; margin-top: 0;">Verify your email address</h2>
          <p style="color: #666666; line-height: 1.6;">Hi ${props.name},</p>
          <p style="color: #666666; line-height: 1.6;">
            Thank you for signing up for GiveMetry. Please click the button below to verify your email address.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${props.verifyUrl}" style="background-color: #1a1a2e; color: #ffffff; padding: 14px 30px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666666; line-height: 1.6; font-size: 14px;">
            This link will expire in ${props.expiresIn}.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
          <p style="color: #999999; font-size: 12px; line-height: 1.6;">
            Or copy this URL: <a href="${props.verifyUrl}" style="color: #1a1a2e;">${props.verifyUrl}</a>
          </p>
        </div>
      </body>
    </html>
  `;
}
