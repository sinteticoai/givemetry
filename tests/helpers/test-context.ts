// Test context helpers for integration tests
import { prisma } from "@/lib/prisma/client";
import type { UserRole } from "@prisma/client";

interface CreateTestContextOptions {
  role?: UserRole;
  seedData?: boolean;
}

interface TestContext {
  ctx: {
    prisma: typeof prisma;
    session: {
      user: {
        id: string;
        organizationId: string;
        email: string;
        role: UserRole;
      };
      expires: string;
    };
  };
  prisma: typeof prisma;
  cleanup: () => Promise<void>;
}

// Track created entities for cleanup
const createdEntities: {
  users: string[];
  organizations: string[];
  reports: string[];
  constituents: string[];
} = {
  users: [],
  organizations: [],
  reports: [],
  constituents: [],
};

/**
 * Create a test context with optional seeded data
 */
export async function createTestContext(
  options: CreateTestContextOptions = {}
): Promise<TestContext> {
  const { role = "manager", seedData = false } = options;

  // Create test organization
  const organization = await prisma.organization.create({
    data: {
      name: `Test Organization ${Date.now()}`,
      slug: `test-org-${Date.now()}`,
    },
  });
  createdEntities.organizations.push(organization.id);

  // Create test user
  const user = await prisma.user.create({
    data: {
      organizationId: organization.id,
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
      role,
    },
  });
  createdEntities.users.push(user.id);

  // Seed data if requested
  if (seedData) {
    // Create some test constituents
    const constituents = await Promise.all(
      Array.from({ length: 5 }).map((_, i) =>
        prisma.constituent.create({
          data: {
            organizationId: organization.id,
            externalId: `test-const-${Date.now()}-${i}`,
            firstName: `Test`,
            lastName: `Constituent ${i}`,
            email: `constituent${i}@example.com`,
            isActive: true,
            priorityScore: Math.random(),
            lapseRiskScore: Math.random(),
          },
        })
      )
    );
    createdEntities.constituents.push(...constituents.map((c) => c.id));

    // Create some test gifts
    for (const constituent of constituents) {
      await prisma.gift.createMany({
        data: Array.from({ length: 3 }).map((_, i) => ({
          organizationId: organization.id,
          constituentId: constituent.id,
          amount: Math.floor(Math.random() * 10000) + 1000,
          giftDate: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
        })),
      });
    }
  }

  const ctx = {
    prisma,
    session: {
      user: {
        id: user.id,
        organizationId: organization.id,
        email: user.email,
        role: user.role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  };

  return {
    ctx,
    prisma,
    cleanup: async () => {
      // Cleanup will be done in cleanupTestContext
    },
  };
}

/**
 * Clean up test context and associated data
 */
export async function cleanupTestContext(context: TestContext): Promise<void> {
  const { ctx } = context;

  try {
    // Delete reports for this organization
    await prisma.report.deleteMany({
      where: { organizationId: ctx.session.user.organizationId },
    });

    // Delete audit logs
    await prisma.auditLog.deleteMany({
      where: { organizationId: ctx.session.user.organizationId },
    });

    // Delete gifts
    await prisma.gift.deleteMany({
      where: { organizationId: ctx.session.user.organizationId },
    });

    // Delete contacts
    await prisma.contact.deleteMany({
      where: { organizationId: ctx.session.user.organizationId },
    });

    // Delete constituents
    await prisma.constituent.deleteMany({
      where: { organizationId: ctx.session.user.organizationId },
    });

    // Delete user
    await prisma.user.delete({
      where: { id: ctx.session.user.id },
    });

    // Delete organization
    await prisma.organization.delete({
      where: { id: ctx.session.user.organizationId },
    });
  } catch (error) {
    console.error("Error cleaning up test context:", error);
  }
}

/**
 * Clean up all test entities (use at the end of test suite)
 */
export async function cleanupAllTestEntities(): Promise<void> {
  try {
    // Delete in reverse order of dependencies
    for (const reportId of createdEntities.reports) {
      await prisma.report.delete({ where: { id: reportId } }).catch(() => {});
    }

    for (const constituentId of createdEntities.constituents) {
      await prisma.constituent.delete({ where: { id: constituentId } }).catch(() => {});
    }

    for (const userId of createdEntities.users) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }

    for (const orgId of createdEntities.organizations) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    }

    // Reset tracking
    createdEntities.users = [];
    createdEntities.organizations = [];
    createdEntities.reports = [];
    createdEntities.constituents = [];
  } catch (error) {
    console.error("Error cleaning up all test entities:", error);
  }
}

/**
 * Mock authenticated session for API route tests
 */
export function mockSession(role: UserRole = "manager") {
  return {
    user: {
      id: "test-user-id",
      organizationId: "test-org-id",
      email: "test@example.com",
      name: "Test User",
      role,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
