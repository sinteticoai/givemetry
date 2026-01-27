/**
 * Seed script for initial super admin account
 *
 * Run with: pnpm db:seed:admin
 * Or manually: npx tsx prisma/seed-admin.ts
 *
 * Environment variables required:
 * - INITIAL_ADMIN_EMAIL (default: admin@givemetry.com)
 * - INITIAL_ADMIN_PASSWORD (required - no default for security)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL || "admin@givemetry.com";
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!password) {
    console.error("Error: INITIAL_ADMIN_PASSWORD environment variable is required");
    console.error("Set it before running this script:");
    console.error("  export INITIAL_ADMIN_PASSWORD='your-secure-password'");
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("Error: Password must be at least 12 characters long");
    process.exit(1);
  }

  console.log(`Creating/updating super admin: ${email}`);

  const hashedPassword = await bcrypt.hash(password, 12);

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email },
    update: {
      // Update password if it changed
      passwordHash: hashedPassword,
      updatedAt: new Date(),
    },
    create: {
      email,
      name: "Initial Admin",
      passwordHash: hashedPassword,
      role: "super_admin",
      isActive: true,
    },
  });

  console.log(`✓ Super admin created/updated:`);
  console.log(`  ID: ${superAdmin.id}`);
  console.log(`  Email: ${superAdmin.email}`);
  console.log(`  Role: ${superAdmin.role}`);
  console.log(`  Active: ${superAdmin.isActive}`);
}

async function main() {
  try {
    await seedSuperAdmin();
  } catch (error) {
    console.error("Failed to seed super admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
