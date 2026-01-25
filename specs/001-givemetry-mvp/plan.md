# Implementation Plan: GiveMetry MVP (Phase 1)

**Branch**: `001-givemetry-mvp` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-givemetry-mvp/spec.md`
**Architecture**: [architecture.md](/opt/apps/givemetry/docs/main/architecture.md)

## Summary

Build the GiveMetry MVP — an AI-powered intelligence platform for university advancement offices. Phase 1 delivers CSV-based data upload, health assessment dashboards, lapse risk predictions, prospect prioritization, AI-generated donor briefs, and natural language querying. The technical approach uses Next.js 14+ with App Router, tRPC for type-safe APIs, Prisma 7 with PostgreSQL (RLS for multi-tenancy), Claude API for AI features, and NextAuth v5 for authentication.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS
**Primary Dependencies**: Next.js 14+, tRPC, Prisma 7, Zod, NextAuth v5, Claude API (Anthropic), OpenAI Embeddings, Resend
**UI Framework**: React 18, shadcn/ui, Tailwind CSS, Recharts, Lucide React
**Storage**: PostgreSQL 15+ with pgvector extension, S3/R2 for file storage
**Testing**: Vitest (unit), Playwright (e2e), tRPC testing utilities
**Target Platform**: Web application (Railway production, VPS staging)
**Project Type**: Monorepo (Next.js full-stack)
**Performance Goals**: 10K records/min CSV processing, <2s page loads, <10s brief generation, <5s NL queries
**Constraints**: 500MB max upload, 100 concurrent users/org, 24h session / 30min idle timeout
**Scale/Scope**: 500+ tenant organizations, 1M constituents per tenant max

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. CRM-Agnostic** | PASS | Phase 1 uses CSV upload only; no CRM coupling |
| **II. Explainable AI** | PASS | FR-015, FR-016 require explanations and citations for all AI outputs |
| **III. Test-First Development** | PASS | Testing strategy defined; Vitest + Playwright |
| **IV. Multi-Tenancy First** | PASS | RLS + Prisma middleware; all entities have organizationId |
| **V. Security & Compliance** | PASS | RLS, bcrypt, JWT sessions, audit logs, encryption at rest/transit |
| **VI. Simplicity** | PASS | Monorepo structure, database-backed jobs (no Redis for MVP) |
| **VII. Documentation Separation** | PASS | Spec is technology-agnostic; plan contains all technical details |

**Domain Terminology Compliance**: Using Constituent, MGO, Portfolio, Lapse, Capacity, Affinity per constitution.

## Project Structure

### Documentation (this feature)

```text
specs/001-givemetry-mvp/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
│   ├── auth.ts
│   ├── upload.ts
│   ├── constituent.ts
│   ├── analysis.ts
│   ├── ai.ts
│   └── report.ts
└── checklists/
    └── requirements.md  # Validation checklist
```

### Source Code (repository root)

```text
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth pages (login, signup, reset, verify)
│   │   ├── login/
│   │   ├── signup/
│   │   ├── verify-email/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (dashboard)/          # Authenticated app routes
│   │   ├── dashboard/        # Main dashboard
│   │   ├── donors/           # Constituent list & detail
│   │   ├── priorities/       # Gift officer priority view
│   │   ├── lapse-risk/       # Lapse risk panel
│   │   ├── alerts/           # Anomaly alerts
│   │   ├── reports/          # Executive reports
│   │   ├── uploads/          # Upload management
│   │   └── settings/         # Org & user settings
│   ├── api/
│   │   ├── auth/             # NextAuth routes
│   │   ├── trpc/             # tRPC handler
│   │   └── upload/           # File upload endpoint
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── layout/               # Sidebar, header, nav
│   ├── dashboard/            # Dashboard widgets
│   ├── donors/               # Constituent components
│   ├── briefs/               # Donor brief components
│   ├── charts/               # Recharts visualizations
│   └── shared/               # Common components
├── server/
│   ├── routers/              # tRPC routers
│   │   ├── _app.ts           # Root router
│   │   ├── auth.ts
│   │   ├── organization.ts
│   │   ├── user.ts
│   │   ├── upload.ts
│   │   ├── constituent.ts
│   │   ├── gift.ts
│   │   ├── contact.ts
│   │   ├── analysis.ts
│   │   ├── ai.ts
│   │   ├── alert.ts
│   │   └── report.ts
│   ├── services/             # Business logic
│   │   ├── upload/           # CSV parsing, validation
│   │   ├── analysis/         # Health scores, predictions
│   │   ├── ai/               # Claude integration
│   │   └── email/            # Resend integration
│   └── trpc/
│       ├── context.ts        # tRPC context with tenant Prisma
│       └── init.ts           # tRPC initialization
├── lib/
│   ├── prisma/
│   │   ├── client.ts         # Prisma client singleton
│   │   └── tenant.ts         # Tenant middleware
│   ├── auth/
│   │   ├── config.ts         # NextAuth configuration
│   │   ├── tokens.ts         # Token generation
│   │   └── permissions.ts    # RBAC logic
│   ├── ai/
│   │   ├── claude.ts         # Claude API client
│   │   ├── embeddings.ts     # OpenAI embeddings
│   │   └── prompts/          # Prompt templates
│   ├── utils/
│   │   ├── csv.ts            # CSV parsing utilities
│   │   ├── dates.ts          # Date format detection
│   │   └── validation.ts     # Zod schemas
│   └── constants.ts
├── hooks/                    # React hooks
├── stores/                   # Zustand stores
└── types/                    # TypeScript types

prisma/
├── schema.prisma             # Database schema
├── migrations/               # Prisma migrations
└── seed.ts                   # Seed data

worker/
├── csv-processor.ts          # CSV processing worker
├── analysis-engine.ts        # Scoring engine
└── report-generator.ts       # PDF generation

tests/
├── unit/                     # Vitest unit tests
├── integration/              # API integration tests
└── e2e/                      # Playwright e2e tests
```

**Structure Decision**: Next.js monorepo with App Router. Server logic in `src/server/`, shared library code in `src/lib/`, UI components in `src/components/`. Worker processes in separate `worker/` directory for Railway deployment.

## Complexity Tracking

No constitution violations requiring justification. Architecture follows simplicity principle:
- Single Next.js application (no microservices)
- Database-backed job queue (no Redis)
- Monorepo structure (no package management overhead)

---

## Phase 0: Research Summary

See [research.md](./research.md) for detailed findings.

### Key Technical Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **CSV Parsing** | Papa Parse + streaming | Handles 500MB files, browser-compatible for preview |
| **Date Detection** | chrono-node + fallback patterns | Robust NL date parsing with explicit format fallback |
| **Lapse Risk Model** | Rule-based MVP, ML later | Faster to ship, explainable, can add ML in Phase 2 |
| **Priority Scoring** | Weighted composite formula | Transparent, adjustable weights, explainable |
| **NL Query** | Claude function calling | Structured output, reliable parsing, good accuracy |
| **PDF Generation** | @react-pdf/renderer | React-based, server-side rendering, professional output |
| **File Storage** | S3-compatible (R2) | Cost-effective, Railway-compatible, CDN integration |
| **Background Jobs** | Railway cron + database queue | No Redis dependency, sufficient for MVP scale |

### External Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| Anthropic Claude | Brief generation, NL parsing, explanations | Cache + warning banner |
| OpenAI | Embeddings for semantic search | Disable semantic features |
| Resend | Transactional email | Queue + manual retry |
| S3/R2 | File storage | Local filesystem (dev only) |

---

## Phase 1: Design Artifacts

### Data Model

See [data-model.md](./data-model.md) for complete entity definitions.

Key entities mapped from spec:
- Organization (tenant root)
- User (authentication, roles)
- Upload (CSV processing)
- Constituent (donors/prospects)
- Gift (transactions)
- Contact (interactions)
- Prediction (AI scores)
- Alert (anomalies)
- Brief (AI documents)
- NaturalLanguageQuery (saved queries)
- AuditLog (compliance)

### API Contracts

See [contracts/](./contracts/) directory for tRPC router definitions.

Core routers:
- `auth` - Login, logout, session management
- `upload` - CSV upload, field mapping, processing status
- `constituent` - CRUD, search, filtering
- `analysis` - Health scores, predictions, portfolio metrics
- `ai` - Brief generation, NL query, recommendations
- `report` - Executive report generation

### Quickstart

See [quickstart.md](./quickstart.md) for development setup instructions.

---

## Implementation Phases

### Phase A: Foundation (Auth + Multi-tenancy)
1. Database schema + migrations
2. Prisma tenant middleware
3. NextAuth configuration
4. Email verification flow
5. Password reset flow
6. Role-based access control

### Phase B: Data Ingestion
1. File upload endpoint
2. CSV parser service
3. Field mapping UI
4. Background processing worker
5. Incremental update logic

### Phase C: Analysis Engine
1. Data health scoring
2. Lapse risk calculation
3. Priority scoring
4. Confidence indicators
5. Prediction storage

### Phase D: AI Features
1. Claude integration
2. Donor brief generation
3. NL query parsing
4. Next-best-action recommendations
5. Anomaly detection

### Phase E: Dashboards & Reports
1. Dashboard components
2. Constituent list/detail
3. Priority view
4. Lapse risk view
5. Executive report generation

### Phase F: Polish & Testing
1. Error handling
2. Loading states
3. Empty states
4. E2E test coverage
5. Performance optimization

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI hallucination | Citations required, source-only data, user feedback loop |
| Large file processing | Streaming parser, background workers, progress indication |
| Multi-tenant data leak | RLS + middleware double enforcement, integration tests |
| Prediction accuracy | Confidence indicators, historical validation, model versioning |
| Claude API outages | Caching, graceful degradation, warning banners |

---

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Set up development environment per quickstart.md
3. Begin Phase A: Foundation

---

*This plan implements the GiveMetry MVP specification while adhering to the project constitution and architecture guidelines.*
