import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, organizationName, message } = body;

    // Validate required fields
    if (!name || !email || !organizationName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // For now, log the contact request
    // In production, this would send an email via Resend or another service
    console.log("Contact form submission:", {
      name,
      email,
      organizationName,
      message,
      timestamp: new Date().toISOString(),
    });

    // If Resend is configured, send an email
    if (process.env.RESEND_API_KEY) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "noreply@givemetry.com",
            to: "hello@sintetico.ai",
            subject: `GiveMetry Contact: ${organizationName}`,
            html: `
              <h2>New Contact Form Submission</h2>
              <p><strong>Organization:</strong> ${organizationName}</p>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Message:</strong></p>
              <p>${message || "(No message provided)"}</p>
              <hr />
              <p style="color: #666; font-size: 12px;">
                Submitted at ${new Date().toISOString()}
              </p>
            `,
          }),
        });

        if (!response.ok) {
          console.error("Failed to send email:", await response.text());
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        // Don't fail the request if email fails - we still logged it
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
