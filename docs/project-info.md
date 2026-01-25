# GiveMetry Project Info

## Overview

AI-powered intelligence platform for university advancement offices. Transforms CRM data into actionable insights, predictive analytics, and automated workflows.

**Target:** Mid-tier research universities (R2/Master's) with $100M-$1B endowments using Blackbaud or Salesforce.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide React |
| State | React Query (via tRPC), Zustand |
| API | tRPC, Zod validation |
| Auth | NextAuth v5 (Credentials), Resend (transactional email) |
| Database | PostgreSQL 15+, Prisma 7, pgvector, Row-Level Security (RLS) |
| AI | Anthropic Claude API, OpenAI Embeddings |
| Deployment | Railway (prod), VPS Docker (staging) |

## Architecture

### Multi-Tenancy
- Row-level isolation via `organization_id` on all tenant tables
- Prisma middleware auto-filters queries
- PostgreSQL RLS as defense-in-depth

### Authentication
- Email/password with bcrypt (cost 10)
- Email verification (24h token expiry)
- Password reset (1h token expiry)
- JWT sessions (7-day, daily refresh)
- SSO planned for Phase 2

### Frontend Layout
- Desktop: 240px collapsible left sidebar
- Mobile: Bottom navigation
- Dark/light mode toggle (CSS variables, localStorage)

## File Map

### Documentation
```
docs/
├── main/
│   ├── architecture.md      # Full technical architecture (v2.0)
│   ├── prd.md               # Product requirements (v1.2)
│   └── project-brief.md     # Vision and market research
├── research/
│   └── initial docs/
│       └── reference-auth-architecture.md  # Auth patterns from Converza
├── project-info.md          # This file - architecture overview
└── project-log.md           # Session history
```

### Key Entities (Prisma Models)
- `Organization` - Tenant account
- `User` - Auth + profile (linked to org)
- `Constituent` - Donor/prospect records
- `Gift` - Transaction records
- `Contact` - Interaction history
- `Prediction` - AI-generated scores
- `Alert` - System notifications
- `Brief` - AI-generated donor documents
- `Upload` - CSV processing records
- `VerificationToken` - Email verification
- `PasswordResetToken` - Password reset

## Phasing

| Phase | Focus | Entry Point |
|-------|-------|-------------|
| 1 | Health Assessment + Predictive Insights | CSV upload |
| 2 | MGO Copilot | CRM sync (Blackbaud, Salesforce) |
| 3 | Enterprise Intelligence | Multi-unit, benchmarking |

## Key Decisions (ADRs)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | Prisma 7 | Team familiarity, reuse patterns |
| Multi-tenancy | Row-level (RLS) | Simpler ops, FERPA compliant |
| Auth | NextAuth v5 + Credentials | SSO-ready for Phase 2 |
| Email | Resend | Simple API, good deliverability |
| Jobs | DB-backed + Railway workers | No Redis for MVP |
| Payments | Invoice/ACH | Enterprise PO workflow |

## External Integrations

| Service | Purpose | Phase |
|---------|---------|-------|
| Anthropic Claude | Donor briefs, NL queries | 1 |
| OpenAI | Embeddings for semantic search | 1 |
| Resend | Transactional email | 1 |
| Blackbaud RE NXT | CRM sync | 2 |
| Salesforce NPSP | CRM sync | 2 |
