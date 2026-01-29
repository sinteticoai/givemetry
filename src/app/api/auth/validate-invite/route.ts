// Validate invite token API route
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    );
  }

  try {
    // Find the verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 400 }
      );
    }

    // Check if expired
    if (verificationToken.expires < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Find the user associated with this email
    const user = await prisma.user.findFirst({
      where: { email: verificationToken.identifier },
      select: {
        email: true,
        name: true,
        passwordHash: true,
        organization: {
          select: { name: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 400 }
      );
    }

    // Check if user already has a password (already accepted)
    if (user.passwordHash) {
      return NextResponse.json(
        { error: "This invitation has already been accepted" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      email: user.email,
      name: user.name,
      organizationName: user.organization.name,
    });
  } catch (error) {
    console.error("Error validating invite:", error);
    return NextResponse.json(
      { error: "Failed to validate invitation" },
      { status: 500 }
    );
  }
}
