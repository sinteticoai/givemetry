# GiveMetry Full-Stack Architecture

**Version:** 2.0
**Created:** 2026-01-25
**Updated:** 2026-01-25
**Status:** Approved
**Author:** Winston (Architect Agent)
**Input:** PRD v1.0, Team Review

---

## Executive Summary

This document defines the complete technical architecture for GiveMetry, an AI-powered intelligence platform for university advancement offices. The architecture prioritizes:

1. **Rapid Phase 1 delivery** — Reuse proven patterns from Frontdesk/Converza
2. **Progressive enhancement** — Clean paths to Phase 2/3 features
3. **Multi-tenancy from day one** — Row-level isolation (RLS)
4. **AI-first design** — LLM integration as core capability, not afterthought
5. **Developer velocity** — Familiar stack, simple local setup, fast iteration

### Key Decisions (v2.0 Changes)

| Decision | Original | Revised | Rationale |
|----------|----------|---------|-----------|
| ORM | Drizzle | **Prisma 7** | Team familiarity, reuse tenant middleware |
| Multi-tenancy | Schema-per-tenant | **Row-level (RLS)** | Simpler ops, FERPA/SOC 2 compliant |
| Auth | SSO day one | **Credentials first** | Add SSO in Phase 2 when customers require |
| Jobs | BullMQ + Redis | **Webhooks + Railway workers** | Less infrastructure for MVP |
| Payments | Stripe | **None (invoice/ACH)** | Enterprise PO workflow |

**Estimated savings:** ~9 weeks of development time

---

## Architecture Principles

| Principle | Implementation |
|-----------|----------------|
| **User journeys drive design** | APIs map to user stories, not database tables |
| **Reuse proven patterns** | Lift Frontdesk/Converza patterns where applicable |
| **Boring technology where possible** | PostgreSQL, Node.js, Next.js, Prisma — proven stack |
| **Exciting technology where necessary** | Claude API for AI features, tRPC for DX |
| **Start simple, scale later** | Monorepo first, extract services only when needed |
| **Security at every layer** | Tenant isolation, encryption, audit logging built-in |
| **Developer experience matters** | Type safety, hot reload, clear conventions |

---

## Technology Stack

### Final Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  Next.js 14+ (App Router) + TypeScript + Tailwind CSS           │
│  React Query (via tRPC) + Zustand (client state)                │
│  shadcn/ui (components) + Recharts (visualizations)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  Next.js API Routes + tRPC (type-safe RPC)                      │
│  Zod (validation) + NextAuth.js (Credentials provider)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKGROUND JOBS                             │
│  Railway Workers (CSV processing)                                │
│  Database-backed job tracking (uploads table)                   │
│  No Redis queue for MVP — add BullMQ if scale demands           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│  PostgreSQL 15+ (primary store)                                 │
│  Prisma 7 (ORM) + Row-Level Security (RLS)                      │
│  pgvector extension (embeddings for semantic search)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI SERVICES                                 │
│  Anthropic Claude API (generation, NL parsing)                  │
│  OpenAI Embeddings (semantic search)                            │
│  Internal ML models (predictions, scoring)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Rationale

| Choice | Rationale | Alternatives Considered |
|--------|-----------|------------------------|
| **Next.js 14+ (App Router)** | Server components, built-in API routes, Railway-native | Remix, SvelteKit, separate frontend/backend |
| **TypeScript** | Type safety across full stack, better DX | JavaScript |
| **tRPC** | End-to-end type safety, great DX, greenfield opportunity | REST + Zod (familiar but less type-safe) |
| **Prisma 7** | Team knows it, tenant middleware exists, v7 type improvements | Drizzle (learning curve, rebuild patterns) |
| **PostgreSQL + RLS** | Proven, great JSON support, pgvector, RLS for tenant isolation | Schema-per-tenant (operational complexity) |
| **Railway Workers** | Native to deployment platform, no Redis for MVP | BullMQ (add later if needed) |
| **Claude API** | Best-in-class for explanations, reliable | GPT-4, local LLM |
| **shadcn/ui** | Copy-paste components, Tailwind-native, customizable | Radix, Chakra, MUI |

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│   │ Web Browser  │  │ Email Client │  │    Slack     │  │    Teams     │   │
│   │ (Dashboard)  │  │ (Priorities) │  │   (Alerts)   │  │   (Alerts)   │   │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
└──────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
           │                 │                 │                 │
           ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE / CDN                                         │
│                        Railway Edge / Cloudflare                             │
│              (Static assets, edge caching, DDoS protection)                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Next.js Application                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │   Pages     │  │ API Routes  │  │   tRPC      │                 │   │
│  │  │ (SSR/SSG)   │  │ (Auth/Upload│  │  Routers    │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  │                           │                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Service Layer                             │   │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │   │
│  │  │  │ Upload   │ │ Analysis │ │   AI     │ │ Tenant   │       │   │   │
│  │  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │       │   │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐ │
│  │              Background Workers (Railway)                              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │ │
│  │  │  CSV     │ │ Scoring  │ │   CRM    │ │ Report   │                 │ │
│  │  │ Parser   │ │  Engine  │ │   Sync   │ │Generator │                 │ │
│  │  │          │ │          │ │ (Phase2) │ │          │                 │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         PostgreSQL                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │  All tables include organization_id for row-level isolation     │ │ │
│  │  │  RLS policies enforce tenant boundaries at database level       │ │ │
│  │  │  Prisma middleware adds organization_id to all queries          │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │ Anthropic│ │  OpenAI  │ │Blackbaud │ │Salesforce│                       │
│  │  Claude  │ │Embeddings│ │   API    │ │   API    │                       │
│  │          │ │          │ │ (Phase2) │ │ (Phase2) │                       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow Example: Generate Donor Brief

```
1. User clicks "Generate Brief" for donor ID 12345
   │
   ▼
2. Frontend: React component calls tRPC mutation
   └── trpc.donor.generateBrief.mutate({ donorId: 12345 })
   │
   ▼
3. tRPC Router: Validates request, Prisma middleware adds org filter
   └── Verifies user session, getTenantPrisma() scopes all queries
   │
   ▼
4. AI Service: Constructs prompt with donor data
   └── Fetches donor record, giving history, contact history
   └── All queries automatically filtered by organization_id
   │
   ▼
5. Claude API: Generates structured brief
   └── Returns JSON with sections: summary, history, talking_points, ask_amount
   │
   ▼
6. Service: Validates output, stores in database
   └── Ensures no hallucination (all facts traced to source data)
   └── Saves brief to briefs table with organization_id
   │
   ▼
7. Response: Returns brief to frontend
   └── Frontend renders formatted brief with citations
```

---

## Multi-Tenancy Architecture

### Row-Level Isolation Strategy

All tenant data is stored in shared tables with `organization_id` column. Isolation is enforced at two layers:

1. **Application Layer:** Prisma middleware automatically filters all queries
2. **Database Layer:** PostgreSQL RLS policies as defense-in-depth

```
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Shared Tables                            │ │
│  │                                                             │ │
│  │  organizations    users           constituents              │ │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │ │
│  │  │ id         │  │ id         │  │ id                  │   │ │
│  │  │ name       │  │ org_id (FK)│  │ organization_id (FK)│   │ │
│  │  │ slug       │  │ email      │  │ first_name          │   │ │
│  │  │ settings   │  │ role       │  │ last_name           │   │ │
│  │  └────────────┘  └────────────┘  │ lapse_risk_score    │   │ │
│  │                                   │ ...                 │   │ │
│  │                                   └─────────────────────┘   │ │
│  │                                                             │ │
│  │  gifts              contacts          predictions           │ │
│  │  ┌────────────┐    ┌────────────┐    ┌────────────┐        │ │
│  │  │ id         │    │ id         │    │ id         │        │ │
│  │  │ org_id (FK)│    │ org_id (FK)│    │ org_id (FK)│        │ │
│  │  │ const_id   │    │ const_id   │    │ const_id   │        │ │
│  │  │ amount     │    │ type       │    │ score      │        │ │
│  │  │ ...        │    │ ...        │    │ ...        │        │ │
│  │  └────────────┘    └────────────┘    └────────────┘        │ │
│  │                                                             │ │
│  │  RLS Policy: WHERE organization_id = current_org_id()      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Prisma Tenant Middleware (Lifted from Frontdesk)

```typescript
// lib/prisma/tenant.ts
import { PrismaClient } from '@prisma/client';

// Singleton Prisma client
const globalPrisma = new PrismaClient();

// Tables that require organization_id filtering
const TENANT_TABLES = [
  'constituent',
  'gift',
  'contact',
  'prediction',
  'alert',
  'brief',
  'upload',
  'recommendation',
  'naturalLanguageQuery',
];

export function getTenantPrisma(organizationId: string) {
  return globalPrisma.$extends({
    query: {
      $allOperations({ model, operation, args, query }) {
        // Skip non-tenant tables
        if (!model || !TENANT_TABLES.includes(model.toLowerCase())) {
          return query(args);
        }

        // Add organization filter to reads
        if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(operation)) {
          args.where = {
            ...args.where,
            organizationId,
          };
        }

        // Add organization_id to creates
        if (['create', 'createMany'].includes(operation)) {
          if (operation === 'createMany') {
            args.data = args.data.map((d: any) => ({ ...d, organizationId }));
          } else {
            args.data = { ...args.data, organizationId };
          }
        }

        // Add filter to updates/deletes
        if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
          args.where = {
            ...args.where,
            organizationId,
          };
        }

        return query(args);
      },
    },
  });
}

// Usage in tRPC context
export type TenantPrisma = ReturnType<typeof getTenantPrisma>;
```

### PostgreSQL RLS (Defense-in-Depth)

```sql
-- Enable RLS on tenant tables
ALTER TABLE constituents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tenant tables

-- Create function to get current org from session
CREATE OR REPLACE FUNCTION current_org_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_org_id', TRUE), '')::UUID;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create RLS policy for constituents (repeat for each table)
CREATE POLICY tenant_isolation_policy ON constituents
  FOR ALL
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

-- Set org context at connection time (in Prisma middleware)
-- SET app.current_org_id = 'org-uuid-here';
```

### Why Two Layers?

| Layer | Purpose | Catches |
|-------|---------|---------|
| **Prisma middleware** | Primary enforcement, easy to test | Application bugs, forgotten WHERE clauses |
| **PostgreSQL RLS** | Defense-in-depth | Direct DB access, SQL injection, admin tools |

The Prisma layer handles 99.9% of cases. RLS is insurance against edge cases and direct database access.

---

## Database Schema

### Core Tables (Prisma Schema)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// ORGANIZATION & AUTH (no org_id filtering)
// ============================================

model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique

  // Settings
  settings  Json     @default("{}")
  features  Json     @default("{}")

  // Subscription
  plan      String   @default("trial")
  planExpiresAt DateTime?

  // Relationships
  users        User[]
  constituents Constituent[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model User {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Auth
  email          String       @unique
  passwordHash   String?      // NULL if SSO-only (Phase 2)

  // Profile
  name           String?
  role           String       @default("viewer") // admin, manager, gift_officer, viewer

  // Preferences
  preferences    Json         @default("{}")

  // Metadata
  lastLoginAt    DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  // Relationships
  briefs         Brief[]
  contacts       Contact[]
  uploads        Upload[]

  @@index([organizationId])
}

// ============================================
// TENANT DATA (all filtered by organizationId)
// ============================================

model Constituent {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // External reference
  externalId     String?
  externalSource String?      // 'blackbaud', 'salesforce', 'csv'

  // Demographics
  prefix         String?
  firstName      String?
  middleName     String?
  lastName       String
  suffix         String?

  // Contact
  email          String?
  phone          String?
  addressLine1   String?
  addressLine2   String?
  city           String?
  state          String?
  postalCode     String?
  country        String?

  // Affiliation
  constituentType String?     // alumni, parent, friend, etc.
  classYear      Int?
  schoolCollege  String?

  // Wealth indicators
  estimatedCapacity Decimal?  @db.Decimal(15, 2)
  capacitySource    String?
  capacityUpdatedAt DateTime?

  // Assignment
  assignedOfficerId String?
  portfolioTier     String?   // major, principal, leadership

  // Computed scores
  lapseRiskScore   Decimal?  @db.Decimal(5, 4)
  lapseRiskFactors Json?
  priorityScore    Decimal?  @db.Decimal(5, 4)
  priorityFactors  Json?
  engagementScore  Decimal?  @db.Decimal(5, 4)
  dataQualityScore Decimal?  @db.Decimal(5, 4)

  // Metadata
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  gifts       Gift[]
  contacts    Contact[]
  predictions Prediction[]
  briefs      Brief[]
  alerts      Alert[]

  @@unique([organizationId, externalId, externalSource])
  @@index([organizationId])
  @@index([organizationId, priorityScore(sort: Desc)])
  @@index([organizationId, lapseRiskScore(sort: Desc)])
  @@index([assignedOfficerId])
}

model Gift {
  id             String       @id @default(uuid())
  organizationId String
  constituentId  String
  constituent    Constituent  @relation(fields: [constituentId], references: [id], onDelete: Cascade)

  // Gift details
  externalId     String?
  amount         Decimal      @db.Decimal(15, 2)
  giftDate       DateTime     @db.Date
  giftType       String?      // cash, pledge, planned, in-kind

  // Designation
  fundName       String?
  fundCode       String?
  campaign       String?
  appeal         String?

  // Recognition
  recognitionAmount Decimal?  @db.Decimal(15, 2)
  isAnonymous       Boolean   @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@index([constituentId])
  @@index([giftDate(sort: Desc)])
}

model Contact {
  id             String       @id @default(uuid())
  organizationId String
  constituentId  String
  constituent    Constituent  @relation(fields: [constituentId], references: [id], onDelete: Cascade)
  userId         String?
  user           User?        @relation(fields: [userId], references: [id])

  // Contact details
  contactType    String       // meeting, call, email, event, letter
  contactDate    DateTime     @db.Date

  // Content
  subject        String?
  notes          String?      @db.Text

  // Outcome
  outcome        String?      // positive, neutral, negative, no_response
  nextAction     String?
  nextActionDate DateTime?    @db.Date

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@index([constituentId])
  @@index([contactDate(sort: Desc)])
}

model Prediction {
  id             String       @id @default(uuid())
  organizationId String
  constituentId  String
  constituent    Constituent  @relation(fields: [constituentId], references: [id], onDelete: Cascade)

  // Prediction type
  predictionType String       // lapse_risk, priority, upgrade_likelihood

  // Results
  score          Decimal      @db.Decimal(5, 4)
  confidence     Decimal      @db.Decimal(5, 4)
  factors        Json

  // Model info
  modelVersion   String?

  // Validity
  isCurrent      Boolean      @default(true)

  createdAt DateTime @default(now())

  @@index([organizationId])
  @@index([constituentId])
}

model Brief {
  id             String       @id @default(uuid())
  organizationId String
  constituentId  String
  constituent    Constituent  @relation(fields: [constituentId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id])

  // Content
  content        Json         // Structured brief content
  citations      Json         // Source data for each fact

  // Generation info
  promptTokens     Int?
  completionTokens Int?
  modelUsed        String?

  createdAt DateTime @default(now())

  @@index([organizationId])
  @@index([constituentId])
}

model Alert {
  id             String       @id @default(uuid())
  organizationId String
  constituentId  String
  constituent    Constituent  @relation(fields: [constituentId], references: [id], onDelete: Cascade)

  // Alert details
  alertType      String       // lapse_risk, upgrade_opportunity, anomaly
  severity       String       // high, medium, low

  // Content
  title          String
  description    String?      @db.Text
  factors        Json?

  // Status
  status         String       @default("active") // active, dismissed, acted_on
  actedOnAt      DateTime?
  actedOnBy      String?

  createdAt DateTime @default(now())

  @@index([organizationId])
  @@index([organizationId, status])
}

model Upload {
  id             String   @id @default(uuid())
  organizationId String
  userId         String
  user           User     @relation(fields: [userId], references: [id])

  // File info
  filename       String
  fileSize       Int?
  fileHash       String?
  storagePath    String?  // Path in file storage

  // Processing
  status         String   @default("queued") // queued, processing, completed, failed
  rowCount       Int?
  processedCount Int?
  errorCount     Int?
  errors         Json?
  progress       Int?     @default(0) // 0-100

  // Mapping
  fieldMapping   Json?

  // Timing
  startedAt      DateTime?
  completedAt    DateTime?
  createdAt      DateTime @default(now())

  @@index([organizationId])
  @@index([status])
}

model NaturalLanguageQuery {
  id             String   @id @default(uuid())
  organizationId String
  userId         String

  // Query
  queryText      String   @db.Text
  interpretedQuery Json?

  // Results
  resultCount    Int?
  resultIds      String[]

  // Feedback
  wasHelpful     Boolean?
  feedback       String?

  createdAt DateTime @default(now())

  @@index([organizationId])
}

model AuditLog {
  id             BigInt   @id @default(autoincrement())
  organizationId String?
  userId         String?

  action         String
  resourceType   String?
  resourceId     String?

  details        Json?
  ipAddress      String?
  userAgent      String?

  createdAt DateTime @default(now())

  @@index([organizationId, createdAt])
}
```

### Vector Storage (pgvector)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to constituents for semantic search
ALTER TABLE constituents ADD COLUMN embedding vector(1536);
CREATE INDEX idx_constituents_embedding ON constituents
  USING ivfflat (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
```

---

## API Architecture

### tRPC Router Structure

```
src/server/routers/
├── _app.ts              # Root router (combines all routers)
├── auth.ts              # Login, logout, session
├── organization.ts      # Org settings (admin only)
├── user.ts              # User management
├── upload.ts            # CSV upload and processing
├── constituent.ts       # Constituent CRUD + search
├── gift.ts              # Gift data access
├── contact.ts           # Contact logging
├── analysis.ts          # Health scores, predictions
├── ai.ts                # Donor briefs, NL query
├── alert.ts             # Alert management
└── report.ts            # Report generation
```

### tRPC Context Setup

```typescript
// server/trpc/context.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantPrisma } from '@/lib/prisma/tenant';
import { prisma } from '@/lib/prisma';

export async function createContext({ req, res }: CreateContextOptions) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return { prisma, session: null, tenantPrisma: null };
  }

  // Get user's organization
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });

  if (!user) {
    return { prisma, session: null, tenantPrisma: null };
  }

  // Create tenant-scoped Prisma client
  const tenantPrisma = getTenantPrisma(user.organizationId);

  return {
    prisma,
    tenantPrisma,
    session,
    user,
    organizationId: user.organizationId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### Example Router: AI Service

```typescript
// server/routers/ai.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { aiService } from '../services/ai';

export const aiRouter = router({
  // Generate donor brief
  generateBrief: protectedProcedure
    .input(z.object({
      constituentId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // tenantPrisma automatically filters by organization_id
      const constituent = await ctx.tenantPrisma.constituent.findUnique({
        where: { id: input.constituentId },
        include: {
          gifts: { orderBy: { giftDate: 'desc' }, take: 10 },
          contacts: { orderBy: { contactDate: 'desc' }, take: 10 },
        },
      });

      if (!constituent) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Role check: gift officers can only view their portfolio
      if (ctx.user.role === 'gift_officer' &&
          constituent.assignedOfficerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Generate brief via Claude
      const brief = await aiService.generateDonorBrief({
        constituent,
        gifts: constituent.gifts,
        contacts: constituent.contacts,
      });

      // Store brief (organization_id added by middleware)
      const savedBrief = await ctx.tenantPrisma.brief.create({
        data: {
          constituentId: constituent.id,
          userId: ctx.user.id,
          content: brief.content,
          citations: brief.citations,
          promptTokens: brief.usage.promptTokens,
          completionTokens: brief.usage.completionTokens,
          modelUsed: brief.model,
        },
      });

      return savedBrief;
    }),

  // Natural language query
  query: protectedProcedure
    .input(z.object({
      query: z.string().min(3).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const parsed = await aiService.parseNaturalLanguageQuery(input.query);

      if (!parsed.success) {
        return {
          success: false,
          message: parsed.message,
          suggestions: parsed.suggestions,
        };
      }

      // Execute parsed query (already org-scoped via tenantPrisma)
      const results = await executeStructuredQuery(ctx.tenantPrisma, parsed.query);

      // Log query for learning
      await ctx.tenantPrisma.naturalLanguageQuery.create({
        data: {
          userId: ctx.user.id,
          queryText: input.query,
          interpretedQuery: parsed.query,
          resultCount: results.length,
          resultIds: results.map(r => r.id),
        },
      });

      return {
        success: true,
        interpretation: parsed.humanReadable,
        results,
        count: results.length,
      };
    }),
});
```

---

## Background Jobs Architecture

### Webhooks-First Approach

For MVP, we avoid BullMQ/Redis complexity by using:

1. **Database-backed job tracking** via `uploads` table
2. **Railway Workers** for async processing
3. **Webhook triggers** for job initiation

### CSV Upload Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │     │  API Route   │     │   Storage    │
│              │     │              │     │  (S3/R2)     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │  1. Upload file    │                    │
       │───────────────────>│                    │
       │                    │  2. Save to storage │
       │                    │───────────────────>│
       │                    │                    │
       │                    │  3. Create upload  │
       │                    │     record         │
       │                    │  (status: queued)  │
       │                    │                    │
       │  4. Return         │                    │
       │  { uploadId,       │                    │
       │    status: queued }│                    │
       │<───────────────────│                    │
       │                    │                    │
       │                    │  5. Trigger worker │
       │                    │     (webhook/cron) │
       │                    │                    │
       │                    ▼                    │
       │            ┌──────────────┐             │
       │            │   Railway    │             │
       │            │   Worker     │             │
       │            └──────┬───────┘             │
       │                   │                     │
       │                   │  6. Fetch file      │
       │                   │<────────────────────│
       │                   │                     │
       │                   │  7. Process in      │
       │                   │     chunks          │
       │                   │  8. Update progress │
       │                   │                     │
       │  9. Poll status   │                     │
       │───────────────────>                     │
       │<───────────────────                     │
       │  { progress: 45% }                      │
```

### Worker Implementation

```typescript
// worker/csv-processor.ts
import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/prisma/tenant';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';

const CHUNK_SIZE = 1000;
const SYNC_THRESHOLD = 5000; // Files under this: process synchronously

export async function processUpload(uploadId: string) {
  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    include: { user: { include: { organization: true } } },
  });

  if (!upload || upload.status !== 'queued') {
    return;
  }

  const tenantPrisma = getTenantPrisma(upload.organizationId);

  // Update status
  await prisma.upload.update({
    where: { id: uploadId },
    data: { status: 'processing', startedAt: new Date() },
  });

  try {
    // Stream and process CSV
    let processed = 0;
    let errors: Array<{ row: number; error: string }> = [];
    const batch: any[] = [];

    const parser = createReadStream(upload.storagePath!)
      .pipe(parse({ columns: true, skip_empty_lines: true }));

    for await (const row of parser) {
      try {
        const constituent = mapRowToConstituent(row, upload.fieldMapping);
        batch.push(constituent);

        if (batch.length >= CHUNK_SIZE) {
          await tenantPrisma.constituent.createMany({
            data: batch,
            skipDuplicates: true,
          });
          processed += batch.length;
          batch.length = 0;

          // Update progress
          const progress = Math.floor((processed / upload.rowCount!) * 100);
          await prisma.upload.update({
            where: { id: uploadId },
            data: { processedCount: processed, progress },
          });
        }
      } catch (err) {
        errors.push({ row: processed + 1, error: (err as Error).message });
      }
    }

    // Final batch
    if (batch.length > 0) {
      await tenantPrisma.constituent.createMany({
        data: batch,
        skipDuplicates: true,
      });
      processed += batch.length;
    }

    // Mark complete
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        processedCount: processed,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        progress: 100,
        completedAt: new Date(),
      },
    });

    // Trigger analysis
    await triggerAnalysis(upload.organizationId);

  } catch (err) {
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'failed',
        errors: [{ error: (err as Error).message }],
      },
    });
  }
}

// For small files, process synchronously
export function shouldProcessSync(rowCount: number): boolean {
  return rowCount < SYNC_THRESHOLD;
}
```

### Adding BullMQ Later (If Needed)

The architecture supports dropping in BullMQ without major refactoring:

```typescript
// Future: Replace webhook trigger with queue
import { Queue } from 'bullmq';

const csvQueue = new Queue('csv-processing', { connection: redis });

// Instead of: triggerWorkerWebhook(uploadId)
// Use: await csvQueue.add('process', { uploadId });
```

---

## Authentication Architecture

### NextAuth + Credentials (MVP)

```typescript
// lib/auth.ts
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        };
      },
    }),
    // SSO providers added in Phase 2:
    // SAMLProvider({ ... }),
    // AzureADProvider({ ... }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
```

### Phase 2: Adding SSO

The architecture supports SSO without refactoring:

```typescript
// Phase 2: Add to providers array
import { OIDCProvider } from 'next-auth/providers/oidc';

// Per-tenant SSO config stored in organization.settings
const org = await getOrganization(email.split('@')[1]);
if (org?.settings?.sso) {
  // Dynamically configure SSO provider
}
```

---

## Security Architecture

### Authorization Model

```typescript
// lib/auth/permissions.ts
export const PERMISSIONS = {
  admin: ['*'],
  manager: [
    'constituents:read',
    'constituents:update',
    'gifts:read',
    'contacts:*',
    'analysis:read',
    'ai:generate',
    'reports:*',
    'users:read',
    'uploads:*',
  ],
  gift_officer: [
    'constituents:read:own',
    'constituents:update:own',
    'gifts:read:own',
    'contacts:*:own',
    'analysis:read:own',
    'ai:generate:own',
    'reports:read',
  ],
  viewer: [
    'analysis:read',
    'reports:read',
  ],
};

export function hasPermission(
  role: string,
  permission: string,
  ownerId?: string,
  userId?: string
): boolean {
  const rolePerms = PERMISSIONS[role] || [];

  if (rolePerms.includes('*')) return true;
  if (rolePerms.includes(permission)) return true;

  // Check :own scope
  const [resource, action, scope] = permission.split(':');
  if (rolePerms.includes(`${resource}:${action}:own`)) {
    return ownerId === userId;
  }

  return false;
}
```

### Audit Logging

```typescript
// lib/audit.ts
export async function auditLog(
  ctx: Context,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>
) {
  await ctx.prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      userId: ctx.user?.id,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: ctx.req?.ip,
      userAgent: ctx.req?.headers['user-agent'],
    },
  });
}

// Audited actions
const AUDITED_ACTIONS = [
  'user.login',
  'user.logout',
  'upload.create',
  'upload.complete',
  'brief.generate',
  'report.generate',
  'constituent.view',
  'constituent.update',
  'settings.change',
  'user.invite',
  'user.role_change',
];
```

---

## Infrastructure & Deployment

### Environment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTION                                  │
│                    Railway Platform                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │   Worker     │  │  PostgreSQL  │          │
│  │  (Next.js)   │  │  (Optional)  │  │   Database   │          │
│  │              │  │              │  │              │          │
│  │ Auto-scale   │  │ Cron/Webhook │  │  Managed     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  Branch: master                                                 │
│  Domain: app.givemetry.com                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       STAGING                                    │
│                    VPS (Docker Compose)                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │   Worker     │  │  PostgreSQL  │          │
│  │              │  │              │  │  (shared)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  Branch: dev                                                    │
│  Domain: staging.givemetry.com                                  │
│  Note: Database shared with local dev                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   LOCAL DEVELOPMENT                              │
│                      MacBook                                     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Next.js    │  │  PostgreSQL  │                            │
│  │   (dev)      │  │  (VPS or     │                            │
│  │              │  │   local)     │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                  │
│  Branch: dev                                                    │
│  URL: http://localhost:3000                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Docker Compose (Staging)

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://givemetry:${DB_PASSWORD}@postgres:5432/givemetry
      - NEXTAUTH_URL=https://staging.givemetry.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres

  postgres:
    image: pgvector/pgvector:pg16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=givemetry
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=givemetry
    ports:
      - "5432:5432"  # Exposed for local dev access

volumes:
  postgres_data:
```

---

## Appendix A: Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgresql://user:pass@host:5432/givemetry

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# File Storage (optional, can use local for dev)
S3_BUCKET=givemetry-uploads
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Optional: Phase 2 integrations
# BLACKBAUD_CLIENT_ID=...
# BLACKBAUD_CLIENT_SECRET=...
# SALESFORCE_CLIENT_ID=...
# SALESFORCE_CLIENT_SECRET=...
```

---

## Appendix B: ADR (Architecture Decision Records)

### ADR-001: Row-Level Isolation vs Schema-per-Tenant

**Status:** Accepted (v2.0)

**Context:** Need multi-tenancy for SaaS with 500+ tenants.

**Decision:** Row-level isolation via Prisma middleware + PostgreSQL RLS.

**Rationale:**
- FERPA, HECVAT, SOC 2 all accept logical isolation
- Single migration runs once (not 500+ times)
- Proven pattern from Frontdesk/Converza
- Simpler backup/restore, connection pooling
- Estimated 3 weeks saved vs schema-per-tenant

**Consequences:**
- All queries must include organization_id (handled by middleware)
- RLS policies needed for direct DB access scenarios

### ADR-002: Prisma vs Drizzle

**Status:** Accepted (v2.0)

**Context:** Need type-safe ORM for PostgreSQL.

**Decision:** Prisma 7 (same as Frontdesk).

**Rationale:**
- Team familiarity (no learning curve)
- Existing tenant middleware can be lifted
- Prisma 7 type safety improvements close gap with Drizzle
- Estimated 2 weeks saved

**Consequences:**
- Prisma client size slightly larger
- Must use Prisma-compatible patterns

### ADR-003: Webhooks vs BullMQ for Background Jobs

**Status:** Accepted (v2.0)

**Context:** Need async processing for CSV uploads and analysis.

**Decision:** Database-backed job tracking + Railway workers for MVP. Add BullMQ if scale demands.

**Rationale:**
- One less infrastructure component (no Redis)
- Railway has native worker support
- Pattern works at Frontdesk scale
- Easy to add BullMQ later without refactoring

**Consequences:**
- No automatic retry (must implement manually)
- Less visibility into job queues (build simple UI if needed)

### ADR-004: Credentials Auth vs SSO Day One

**Status:** Accepted (v2.0)

**Context:** Enterprise customers may require SSO.

**Decision:** NextAuth + Credentials for MVP. Add SSO providers in Phase 2.

**Rationale:**
- SSO adds significant complexity (SAML metadata, per-tenant IdP config)
- Most customers start with email/password during evaluation
- Architecture supports adding SSO without refactoring
- Estimated 1 week saved

**Consequences:**
- Must clearly communicate "SSO available Q2" to prospects who ask
- Structure code to support per-tenant SSO config from start

### ADR-005: Skip Stripe for Enterprise Payment Model

**Status:** Accepted (v2.0)

**Context:** Need to handle payments for $2.5K-$40K contracts.

**Decision:** No payment platform. Invoice/ACH workflow via accounting software.

**Rationale:**
- Universities use PO → Invoice → NET 30/60 → ACH/wire
- Even $2.5K purchases typically require purchase orders
- Stripe adds complexity for a workflow that doesn't match
- Can add Stripe later if self-service tier is added

**Consequences:**
- Manual invoicing initially
- Need simple contract/payment status tracking in database

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-25 | Winston | Initial architecture |
| 2.0 | 2026-01-25 | Winston | Revised per team review: Prisma, RLS, simplified auth/jobs |

---

*This architecture document provides the technical blueprint for GiveMetry. It should be used alongside the PRD for implementation planning.*
