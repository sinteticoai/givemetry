// T025: Resend email client configuration
import { Resend } from "resend";

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export const resend = { getClient: getResend };

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "noreply@givemetry.com";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: React.ReactElement;
}

export async function sendEmail(options: EmailOptions) {
  const client = resend.getClient();

  if (!client) {
    // eslint-disable-next-line no-console
    console.log("[Email Mock]", options.subject, "to", options.to);
    return { id: "mock-email-id" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      react: options.react,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to send email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Email send error:", error);
    throw error;
  }
}
