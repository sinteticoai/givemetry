// Local file upload endpoint for development
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { ExtendedSession } from "@/lib/auth/config";
import prisma from "@/lib/prisma/client";
import { uploadFile, generateStorageKey } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const session = (await auth()) as ExtendedSession | null;
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uploadId = params.id;
    const organizationId = session.user.organizationId;

    // Verify upload exists and belongs to user's organization
    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        organizationId,
        status: "queued",
      },
    });

    if (!upload) {
      return NextResponse.json(
        { error: "Upload not found or already processed" },
        { status: 404 }
      );
    }

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate storage key
    const key = generateStorageKey(organizationId, uploadId, upload.filename);

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save to storage
    await uploadFile(key, buffer);

    // Update upload record with storage path
    await prisma.upload.update({
      where: { id: uploadId },
      data: { storagePath: key },
    });

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
