// T014: Seed script with demo organization and test users
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo organization
  const organization = await prisma.organization.upsert({
    where: { slug: "demo-university" },
    update: {},
    create: {
      name: "Demo University",
      slug: "demo-university",
      settings: {
        timezone: "America/New_York",
        fiscalYearStart: 7, // July
      },
      features: {
        aiFeatures: true,
        advancedAnalytics: true,
      },
      plan: "professional",
    },
  });

  console.log(`Created organization: ${organization.name}`);

  // Create test users
  const users = [
    {
      email: "admin@demo.givemetry.com",
      password: "DemoAdmin123!",
      name: "Demo Admin",
      role: "admin" as UserRole,
    },
    {
      email: "manager@demo.givemetry.com",
      password: "DemoManager123!",
      name: "Sarah Manager",
      role: "manager" as UserRole,
    },
    {
      email: "mgo@demo.givemetry.com",
      password: "DemoMGO123!",
      name: "John Officer",
      role: "gift_officer" as UserRole,
    },
    {
      email: "viewer@demo.givemetry.com",
      password: "DemoViewer123!",
      name: "View Only",
      role: "viewer" as UserRole,
    },
  ];

  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        passwordHash,
        name: userData.name,
        role: userData.role,
        organizationId: organization.id,
        emailVerified: new Date(), // Pre-verified for demo
      },
    });
    console.log(`Created user: ${user.email} (${user.role})`);
  }

  // Get MGO user for assignments
  const mgo = await prisma.user.findUnique({
    where: { email: "mgo@demo.givemetry.com" },
  });

  // Create sample constituents
  const constituentData = [
    {
      externalId: "CONST-001",
      firstName: "Robert",
      lastName: "Smith",
      email: "robert.smith@email.com",
      phone: "555-0101",
      constituentType: "alumni",
      classYear: 1985,
      schoolCollege: "Engineering",
      estimatedCapacity: 500000,
      portfolioTier: "major",
      lapseRiskScore: 0.25,
      priorityScore: 0.85,
      dataQualityScore: 0.9,
    },
    {
      externalId: "CONST-002",
      firstName: "Jennifer",
      lastName: "Williams",
      email: "j.williams@email.com",
      phone: "555-0102",
      constituentType: "alumni",
      classYear: 1990,
      schoolCollege: "Business",
      estimatedCapacity: 250000,
      portfolioTier: "major",
      lapseRiskScore: 0.75,
      priorityScore: 0.7,
      dataQualityScore: 0.85,
    },
    {
      externalId: "CONST-003",
      firstName: "Michael",
      lastName: "Johnson",
      email: "m.johnson@email.com",
      phone: "555-0103",
      constituentType: "parent",
      estimatedCapacity: 100000,
      portfolioTier: "leadership",
      lapseRiskScore: 0.5,
      priorityScore: 0.6,
      dataQualityScore: 0.75,
    },
    {
      externalId: "CONST-004",
      firstName: "Emily",
      lastName: "Brown",
      email: "emily.brown@email.com",
      phone: "555-0104",
      constituentType: "alumni",
      classYear: 2005,
      schoolCollege: "Arts & Sciences",
      estimatedCapacity: 75000,
      portfolioTier: "leadership",
      lapseRiskScore: 0.15,
      priorityScore: 0.55,
      dataQualityScore: 0.95,
    },
    {
      externalId: "CONST-005",
      firstName: "David",
      lastName: "Miller",
      email: "d.miller@email.com",
      constituentType: "friend",
      estimatedCapacity: 1000000,
      portfolioTier: "principal",
      lapseRiskScore: 0.4,
      priorityScore: 0.9,
      dataQualityScore: 0.6,
    },
  ];

  for (const data of constituentData) {
    const constituent = await prisma.constituent.upsert({
      where: {
        organizationId_externalId_externalSource: {
          organizationId: organization.id,
          externalId: data.externalId,
          externalSource: "csv",
        },
      },
      update: {},
      create: {
        ...data,
        organizationId: organization.id,
        externalSource: "csv",
        assignedOfficerId: mgo?.id,
        lapseRiskFactors: {
          factors: [
            { name: "recency", value: "6 months since last gift", impact: "low" },
            { name: "frequency", value: "Annual giving pattern", impact: "low" },
          ],
        },
        priorityFactors: {
          factors: [
            { name: "capacity", score: 0.8 },
            { name: "likelihood", score: 0.7 },
            { name: "timing", score: 0.6 },
            { name: "recency", score: 0.5 },
          ],
        },
      },
    });

    // Create sample gifts for each constituent
    const giftAmounts = [1000, 2500, 5000, 10000, 25000];
    const giftYears = [2021, 2022, 2023, 2024, 2025];

    for (let i = 0; i < 3; i++) {
      const amount = giftAmounts[Math.floor(Math.random() * giftAmounts.length)]!;
      const year = giftYears[Math.floor(Math.random() * giftYears.length)]!;
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;

      await prisma.gift.create({
        data: {
          organizationId: organization.id,
          constituentId: constituent.id,
          externalId: `GIFT-${constituent.externalId}-${i}`,
          amount,
          giftDate: new Date(year, month - 1, day),
          giftType: ["cash", "pledge", "planned"][Math.floor(Math.random() * 3)]!,
          fundName: "Annual Fund",
          campaign: "Annual Giving",
        },
      });
    }

    // Create sample contacts for each constituent
    const contactTypes = ["meeting", "call", "email", "event"];
    const outcomes = ["positive", "neutral", "no_response"];

    for (let i = 0; i < 2; i++) {
      const year = 2024 + Math.floor(Math.random() * 2);
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;

      await prisma.contact.create({
        data: {
          organizationId: organization.id,
          constituentId: constituent.id,
          userId: mgo?.id,
          contactType: contactTypes[Math.floor(Math.random() * contactTypes.length)]!,
          contactDate: new Date(year, month - 1, day),
          subject: "Cultivation meeting",
          notes: "Discussed upcoming campaign priorities",
          outcome: outcomes[Math.floor(Math.random() * outcomes.length)]!,
        },
      });
    }

    console.log(`Created constituent: ${constituent.firstName} ${constituent.lastName}`);
  }

  // Create sample alerts
  const constituents = await prisma.constituent.findMany({
    where: { organizationId: organization.id },
    take: 3,
  });

  for (const constituent of constituents) {
    if (Number(constituent.lapseRiskScore) > 0.5) {
      await prisma.alert.create({
        data: {
          organizationId: organization.id,
          constituentId: constituent.id,
          alertType: "lapse_risk",
          severity: Number(constituent.lapseRiskScore) > 0.7 ? "high" : "medium",
          title: `High lapse risk: ${constituent.firstName} ${constituent.lastName}`,
          description: "This donor has shown signs of declining engagement.",
          factors: constituent.lapseRiskFactors ?? undefined,
        },
      });
    }
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
