# Tasks: GiveMetry MVP (Phase 1)

**Input**: Design documents from `/specs/001-givemetry-mvp/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/, research.md, quickstart.md

**Tests**: TDD required per Constitution Principle III. Test tasks precede implementation in each phase. Red-Green-Refactor cycle enforced.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- `src/app/` - Next.js App Router pages
- `src/components/` - React components
- `src/server/` - tRPC routers and services
- `src/lib/` - Shared utilities
- `prisma/` - Database schema
- `worker/` - Background job processors
- `tests/` - Test files (unit/, integration/, e2e/, validation/)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Next.js 14+ project with TypeScript 5.x and App Router in repository root
- [x] T002 [P] Configure pnpm workspace and package.json scripts per quickstart.md
- [x] T003 [P] Setup ESLint, Prettier, and TypeScript strict mode configuration
- [x] T004 [P] Install and configure Tailwind CSS with shadcn/ui in src/components/ui/
- [x] T005 [P] Create .env.example with all environment variables per quickstart.md
- [x] T006 [P] Setup Vitest configuration for unit tests in vitest.config.ts
- [x] T007 [P] Setup Playwright configuration for e2e tests in playwright.config.ts
- [x] T008 Create project directory structure per plan.md (src/app/, src/components/, src/server/, src/lib/, prisma/, worker/, tests/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Prisma

- [x] T009 Create Prisma schema with all entities per data-model.md in prisma/schema.prisma
- [x] T010 Configure PostgreSQL connection with pgvector extension in prisma/schema.prisma
- [x] T011 Create Prisma client singleton with tenant context in src/lib/prisma/client.ts
- [x] T012 Implement RLS tenant middleware for Prisma in src/lib/prisma/tenant.ts
- [ ] T013 Create initial database migration in prisma/migrations/
- [x] T014 Create seed script with demo organization and test users in prisma/seed.ts

### tRPC Setup

- [x] T015 Initialize tRPC with context and superjson transformer in src/server/trpc/init.ts
- [x] T016 Create tRPC context with tenant Prisma client in src/server/trpc/context.ts
- [x] T017 Create root tRPC router in src/server/routers/_app.ts
- [x] T018 Setup tRPC API handler in src/app/api/trpc/[trpc]/route.ts
- [x] T019 Create tRPC React provider and hooks in src/lib/trpc/client.tsx

### Authentication Infrastructure

- [x] T020 Configure NextAuth v5 with Credentials provider in src/lib/auth/config.ts
- [x] T021 [P] Create secure token generation utilities in src/lib/auth/tokens.ts
- [x] T022 [P] Implement RBAC permission helpers in src/lib/auth/permissions.ts
- [x] T023 Setup NextAuth API routes in src/app/api/auth/[...nextauth]/route.ts
- [x] T024 Create auth middleware for session validation with idle timeout in src/middleware.ts

### Email Infrastructure

- [x] T025 Configure Resend email client in src/server/services/email/resend.ts
- [x] T026 [P] Create email verification template in src/server/services/email/templates/verify-email.tsx
- [x] T027 [P] Create password reset template in src/server/services/email/templates/reset-password.tsx
- [x] T028 Implement email service with send functions in src/server/services/email/index.ts

### File Storage Infrastructure

- [x] T029 Create S3/R2 storage client in src/lib/storage/s3.ts
- [x] T030 Implement presigned URL generation for uploads in src/lib/storage/presigned.ts
- [x] T031 Create local filesystem fallback for development in src/lib/storage/local.ts

### Shared UI Components

- [x] T032 Create app layout with sidebar navigation in src/components/layout/app-layout.tsx
- [x] T033 [P] Create sidebar component in src/components/layout/sidebar.tsx
- [x] T034 [P] Create header component with user menu in src/components/layout/header.tsx
- [x] T035 [P] Create loading spinner and skeleton components in src/components/shared/loading.tsx
- [x] T036 [P] Create error boundary and error display components in src/components/shared/error.tsx
- [x] T037 [P] Create empty state component in src/components/shared/empty-state.tsx

### Constituent Infrastructure (Required by Multiple Stories)

- [x] T038 Create constituent router with get, list procedures in src/server/routers/constituent.ts
- [x] T039 Add update, bulkAssign procedures to constituent router in src/server/routers/constituent.ts
- [x] T040 Create gift router with list, get, getByConstituent procedures in src/server/routers/gift.ts
- [x] T041 Create contact router with list, get, getByConstituent procedures in src/server/routers/contact.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 7 - Multi-Tenant Organization Access (Priority: P1) 🎯 MVP

**Goal**: Enable institution administrators to set up organizations and manage user access with role-based permissions

**Independent Test**: Create organization, invite users, verify role-based access restrictions work correctly

**Why First**: Authentication and multi-tenancy are prerequisites for all other features. No data can be securely stored or accessed without this foundation.

### Tests for User Story 7 (TDD - Write First, Verify Fail)

- [ ] T042 [P] [US7] Unit tests for auth token utilities in tests/unit/auth/tokens.test.ts
- [ ] T043 [P] [US7] Unit tests for RBAC permissions in tests/unit/auth/permissions.test.ts
- [ ] T044 [P] [US7] Integration tests for auth router (signup, verify, reset) in tests/integration/auth.test.ts
- [ ] T045 [US7] E2E test for complete signup-verify-login flow in tests/e2e/auth-flow.spec.ts

### Auth Router & Procedures

- [ ] T046 [US7] Implement auth.signup procedure (create org + admin user, send verification) in src/server/routers/auth.ts
- [ ] T047 [P] [US7] Create signup page UI in src/app/(auth)/signup/page.tsx
- [ ] T048 [US7] Implement auth.verifyEmail procedure in src/server/routers/auth.ts
- [ ] T049 [P] [US7] Create email verification page in src/app/(auth)/verify-email/page.tsx
- [ ] T050 [US7] Implement auth.forgotPassword procedure in src/server/routers/auth.ts
- [ ] T051 [P] [US7] Create forgot password page in src/app/(auth)/forgot-password/page.tsx
- [ ] T052 [US7] Implement auth.resetPassword procedure in src/server/routers/auth.ts
- [ ] T053 [P] [US7] Create reset password page in src/app/(auth)/reset-password/page.tsx
- [ ] T054 [US7] Create login page with credentials form in src/app/(auth)/login/page.tsx
- [ ] T055 [US7] Implement auth.getSession procedure in src/server/routers/auth.ts
- [ ] T056 [US7] Implement auth.changePassword procedure in src/server/routers/auth.ts
- [ ] T057 [US7] Implement auth.updateProfile procedure in src/server/routers/auth.ts

### User Management (Admin Features)

- [ ] T058 [US7] Create organization router with user invite procedure in src/server/routers/organization.ts
- [ ] T059 [US7] Create user router with list/update/delete procedures in src/server/routers/user.ts
- [ ] T060 [US7] Create settings page with user management UI in src/app/(dashboard)/settings/page.tsx
- [ ] T061 [P] [US7] Create user invite dialog component in src/components/settings/user-invite-dialog.tsx
- [ ] T062 [P] [US7] Create user list component with role editing in src/components/settings/user-list.tsx
- [ ] T063 [US7] Implement organization settings panel in src/components/settings/org-settings.tsx

### Route Protection

- [ ] T064 [US7] Create protected route wrapper with role checks in src/components/auth/protected-route.tsx
- [ ] T065 [US7] Implement portfolio-based access filtering in tRPC context in src/server/trpc/context.ts
- [ ] T066 [US7] Create audit log service for user actions in src/server/services/audit/index.ts

### Data Management (Admin Features)

- [ ] T067 [US7] Implement organization.deleteAllData procedure with confirmation in src/server/routers/organization.ts
- [ ] T068 [P] [US7] Create delete organization confirmation dialog in src/components/settings/delete-org-dialog.tsx
- [ ] T069 [US7] Add data deletion cascade logic (constituents, gifts, contacts, briefs) in src/server/services/data/deletion-cascade.ts
- [ ] T070 [US7] Create audit log entry for data deletion events in src/server/services/audit/index.ts

**Checkpoint**: At this point, User Story 7 should be fully functional - users can sign up, verify email, log in, manage passwords, and admins can invite users with appropriate roles and delete organization data

---

## Phase 4: User Story 1 - Upload and Analyze CRM Data (Priority: P1)

**Goal**: Enable Directors of Advancement Services to upload CSV data exports and receive confirmation with record counts

**Independent Test**: Upload a sample CSV file and receive confirmation of successful parsing with data completeness metrics

### Tests for User Story 1 (TDD - Write First, Verify Fail)

- [x] T071 [P] [US1] Unit tests for CSV parser in tests/unit/upload/csv-parser.test.ts
- [x] T072 [P] [US1] Unit tests for date detection in tests/unit/utils/dates.test.ts
- [x] T073 [P] [US1] Unit tests for field mapper in tests/unit/upload/field-mapper.test.ts
- [x] T074 [US1] Integration tests for upload router in tests/integration/upload.test.ts
- [x] T075 [US1] E2E test for upload-map-process flow in tests/e2e/upload-flow.spec.ts

### Upload Router & Procedures

- [x] T076 [US1] Create upload router with createPresignedUrl procedure in src/server/routers/upload.ts
- [x] T077 [US1] Implement confirmUpload procedure with field detection in src/server/routers/upload.ts
- [x] T078 [US1] Implement updateFieldMapping procedure in src/server/routers/upload.ts
- [x] T079 [US1] Implement get, list, retry, delete procedures in src/server/routers/upload.ts

### CSV Processing Service

- [x] T080 [US1] Create CSV parser service with Papa Parse streaming in src/server/services/upload/csv-parser.ts
- [x] T081 [P] [US1] Implement date format detection with chrono-node in src/lib/utils/dates.ts
- [x] T082 [US1] Create field mapping suggestions logic in src/server/services/upload/field-mapper.ts
- [x] T083 [US1] Implement data validation with Zod schemas in src/lib/utils/validation.ts
- [x] T084 [US1] Create constituent upsert logic with CRM ID matching in src/server/services/upload/constituent-processor.ts
- [x] T085 [P] [US1] Create gift import processor in src/server/services/upload/gift-processor.ts
- [x] T086 [P] [US1] Create contact import processor in src/server/services/upload/contact-processor.ts

### Background Worker

- [x] T087 [US1] Create CSV processing worker with database queue polling in worker/csv-processor.ts
- [x] T088 [US1] Implement progress tracking and status updates in worker/csv-processor.ts
- [x] T089 [US1] Add error handling with row-level error collection in worker/csv-processor.ts

### Upload UI

- [x] T090 [US1] Create uploads management page in src/app/(dashboard)/uploads/page.tsx
- [x] T091 [P] [US1] Create file upload dropzone component in src/components/uploads/upload-dropzone.tsx
- [x] T092 [P] [US1] Create field mapping UI component in src/components/uploads/field-mapping.tsx
- [x] T093 [P] [US1] Create upload progress indicator component in src/components/uploads/upload-progress.tsx
- [x] T094 [P] [US1] Create upload history list component in src/components/uploads/upload-list.tsx
- [x] T095 [US1] Create upload detail page with error display in src/app/(dashboard)/uploads/[id]/page.tsx

### Incremental Updates

- [x] T096 [US1] Implement duplicate detection with fuzzy matching in src/server/services/upload/duplicate-detector.ts
- [x] T097 [US1] Add incremental update logic (new/changed record detection) in src/server/services/upload/incremental-processor.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - users can upload CSVs, map fields, track processing progress, and view results

---

## Phase 5: User Story 2 - View Data Health Dashboard (Priority: P1)

**Goal**: Provide comprehensive data health assessment with quality scores and improvement recommendations

**Independent Test**: View dashboard after upload and see overall health score with category breakdowns

### Tests for User Story 2 (TDD - Write First, Verify Fail)

- [X] T098 [P] [US2] Unit tests for health scorer in tests/unit/analysis/health-scorer.test.ts
- [X] T099 [P] [US2] Unit tests for completeness scoring in tests/unit/analysis/completeness.test.ts
- [X] T100 [P] [US2] Unit tests for freshness scoring in tests/unit/analysis/freshness.test.ts
- [X] T101 [US2] Integration tests for analysis.getHealthScores in tests/integration/analysis.test.ts

### Analysis Service - Health Scoring

- [X] T102 [US2] Create data health scoring engine in src/server/services/analysis/health-scorer.ts
- [X] T103 [P] [US2] Implement completeness scoring in src/server/services/analysis/completeness.ts
- [X] T104 [P] [US2] Implement freshness scoring in src/server/services/analysis/freshness.ts
- [X] T105 [P] [US2] Implement consistency scoring in src/server/services/analysis/consistency.ts
- [X] T106 [P] [US2] Implement coverage scoring in src/server/services/analysis/coverage.ts
- [X] T107 [US2] Create recommendation generator based on health issues in src/server/services/analysis/recommendations.ts

### Analysis Router

- [X] T108 [US2] Create analysis router with getHealthScores procedure in src/server/routers/analysis.ts

### Dashboard UI

- [X] T109 [US2] Create main dashboard page in src/app/(dashboard)/dashboard/page.tsx
- [X] T110 [P] [US2] Create health score card component in src/components/dashboard/health-score-card.tsx
- [X] T111 [P] [US2] Create health category breakdown component in src/components/dashboard/health-breakdown.tsx
- [X] T112 [P] [US2] Create issue list component with examples in src/components/dashboard/issue-list.tsx
- [X] T113 [P] [US2] Create recommendations panel component in src/components/dashboard/recommendations-panel.tsx
- [X] T114 [US2] Create health trend chart with Recharts in src/components/charts/health-trend-chart.tsx

**Checkpoint**: At this point, User Story 2 should be fully functional - users can view data health scores with detailed breakdowns and recommendations

---

## Phase 6: User Story 3 - View Donor Lapse Risk Predictions (Priority: P1)

**Goal**: Show donors at risk of lapsing with explainable AI predictions

**Independent Test**: View lapse risk list and validate predictions include explainable factors

### Tests for User Story 3 (TDD - Write First, Verify Fail)

- [X] T115 [P] [US3] Unit tests for lapse risk engine in tests/unit/analysis/lapse-risk.test.ts
- [X] T116 [P] [US3] Unit tests for lapse factors (recency, frequency, monetary, contact) in tests/unit/analysis/lapse-factors.test.ts
- [X] T117 [US3] Golden dataset validation for lapse predictions in tests/validation/lapse-risk-golden.test.ts
- [X] T118 [US3] Integration tests for lapse risk procedures in tests/integration/analysis-lapse.test.ts

### Lapse Risk Prediction Service

- [X] T119 [US3] Create lapse risk calculation engine in src/server/services/analysis/lapse-risk.ts
- [X] T120 [P] [US3] Implement recency factor scoring in src/server/services/analysis/lapse-factors/recency.ts
- [X] T121 [P] [US3] Implement frequency factor scoring in src/server/services/analysis/lapse-factors/frequency.ts
- [X] T122 [P] [US3] Implement monetary factor scoring in src/server/services/analysis/lapse-factors/monetary.ts
- [X] T123 [P] [US3] Implement contact factor scoring in src/server/services/analysis/lapse-factors/contact.ts
- [X] T124 [US3] Create prediction storage service in src/server/services/analysis/prediction-store.ts
- [X] T125 [US3] Implement confidence indicator calculation in src/server/services/analysis/confidence.ts

### Analysis Router Extensions

- [X] T126 [US3] Add getLapseRiskList procedure to analysis router in src/server/routers/analysis.ts
- [X] T127 [US3] Add markLapseAddressed procedure in src/server/routers/analysis.ts

### Lapse Risk UI

- [X] T128 [US3] Create lapse risk panel page in src/app/(dashboard)/lapse-risk/page.tsx
- [X] T129 [P] [US3] Create lapse risk list component in src/components/lapse-risk/lapse-list.tsx
- [X] T130 [P] [US3] Create lapse risk detail card with explainable factors in src/components/lapse-risk/lapse-detail-card.tsx
- [X] T131 [P] [US3] Create lapse risk summary stats component in src/components/lapse-risk/lapse-summary.tsx
- [X] T132 [US3] Create gift officer filter dropdown in src/components/shared/officer-filter.tsx
- [X] T133 [US3] Implement mark as addressed/retained/dismissed actions in src/components/lapse-risk/lapse-actions.tsx

### Analysis Worker

- [X] T134 [US3] Create analysis engine worker for batch prediction in worker/analysis-engine.ts
- [X] T135 [US3] Trigger prediction recalculation on upload completion in worker/csv-processor.ts

**Checkpoint**: At this point, User Story 3 should be fully functional - users can view lapse risk predictions with explainable factors and record interventions

---

## Phase 7: User Story 4 - View Prospect Prioritization Scores (Priority: P1)

**Goal**: Show gift officers which prospects to focus on with composite scoring

**Independent Test**: View prioritized prospect list with scoring breakdown and reasoning

### Tests for User Story 4 (TDD - Write First, Verify Fail)

- [ ] T136 [P] [US4] Unit tests for priority scorer in tests/unit/analysis/priority-scorer.test.ts
- [ ] T137 [P] [US4] Unit tests for priority factors in tests/unit/analysis/priority-factors.test.ts
- [ ] T138 [US4] Integration tests for priority procedures in tests/integration/analysis-priority.test.ts

### Priority Scoring Service

- [ ] T139 [US4] Create priority scoring engine in src/server/services/analysis/priority-scorer.ts
- [ ] T140 [P] [US4] Implement capacity score calculation in src/server/services/analysis/priority-factors/capacity.ts
- [ ] T141 [P] [US4] Implement likelihood score (inverse lapse) in src/server/services/analysis/priority-factors/likelihood.ts
- [ ] T142 [P] [US4] Implement timing score calculation in src/server/services/analysis/priority-factors/timing.ts
- [ ] T143 [P] [US4] Implement recency score calculation in src/server/services/analysis/priority-factors/recency.ts

### Analysis Router Extensions

- [ ] T144 [US4] Add getPriorityList procedure to analysis router in src/server/routers/analysis.ts
- [ ] T145 [US4] Add providePriorityFeedback procedure in src/server/routers/analysis.ts
- [ ] T146 [US4] Add refreshPriorities procedure in src/server/routers/analysis.ts

### Priority Dashboard UI

- [ ] T147 [US4] Create priorities page in src/app/(dashboard)/priorities/page.tsx
- [ ] T148 [P] [US4] Create priority list component with ranking in src/components/priorities/priority-list.tsx
- [ ] T149 [P] [US4] Create priority detail card with factors in src/components/priorities/priority-detail-card.tsx
- [ ] T150 [P] [US4] Create priority feedback buttons in src/components/priorities/priority-feedback.tsx
- [ ] T151 [US4] Create refresh priorities button with loading state in src/components/priorities/refresh-button.tsx
- [ ] T152 [US4] Implement recently contacted filter toggle in src/components/priorities/contact-filter.tsx

**Checkpoint**: At this point, User Story 4 should be fully functional - gift officers can view prioritized prospects with explainable scoring

---

## Phase 8: User Story 5 - Generate AI Donor Brief (Priority: P1)

**Goal**: Generate one-page donor briefs instantly for meeting preparation

**Independent Test**: Generate a brief for any donor and verify all facts are cited from source data

### Tests for User Story 5 (TDD - Write First, Verify Fail)

- [ ] T153 [P] [US5] Unit tests for Claude client wrapper in tests/unit/ai/claude.test.ts
- [ ] T154 [P] [US5] Unit tests for citation validator in tests/unit/ai/citation-validator.test.ts
- [ ] T155 [US5] Integration tests for brief generation in tests/integration/ai-brief.test.ts
- [ ] T156 [US5] Golden dataset validation for brief accuracy in tests/validation/brief-accuracy.test.ts

### AI Infrastructure

- [ ] T157 [US5] Create Claude API client wrapper in src/lib/ai/claude.ts
- [ ] T158 [P] [US5] Create OpenAI embeddings client in src/lib/ai/embeddings.ts
- [ ] T159 [US5] Create prompt templates directory structure in src/lib/ai/prompts/
- [ ] T160 [US5] Create donor brief generation prompt in src/lib/ai/prompts/donor-brief.ts

### Brief Generation Service

- [ ] T161 [US5] Create brief generation service in src/server/services/ai/brief-generator.ts
- [ ] T162 [US5] Implement citation extraction and validation in src/server/services/ai/citation-validator.ts
- [ ] T163 [US5] Create brief caching for AI fallback in src/server/services/ai/brief-cache.ts

### AI Router

- [ ] T164 [US5] Create AI router with generateBrief procedure in src/server/routers/ai.ts
- [ ] T165 [US5] Add getBrief, listBriefs procedures in src/server/routers/ai.ts
- [ ] T166 [US5] Add updateBrief, flagBriefError procedures in src/server/routers/ai.ts

### Brief UI

- [ ] T167 [US5] Create donor detail page in src/app/(dashboard)/donors/[id]/page.tsx
- [ ] T168 [P] [US5] Create generate brief button component in src/components/briefs/generate-brief-button.tsx
- [ ] T169 [P] [US5] Create brief display component with sections in src/components/briefs/brief-display.tsx
- [ ] T170 [P] [US5] Create brief section with citations in src/components/briefs/brief-section.tsx
- [ ] T171 [US5] Create brief edit mode component in src/components/briefs/brief-editor.tsx
- [ ] T172 [US5] Create PDF export button using @react-pdf/renderer in src/components/briefs/export-pdf-button.tsx
- [ ] T173 [US5] Create brief PDF template in src/components/briefs/brief-pdf-template.tsx
- [ ] T174 [US5] Create error flagging dialog in src/components/briefs/flag-error-dialog.tsx

**Checkpoint**: At this point, User Story 5 should be fully functional - users can generate, view, edit, and export donor briefs

---

## Phase 9: User Story 6 - Natural Language Data Query (Priority: P1)

**Goal**: Allow users to ask questions about data in plain English

**Independent Test**: Ask various natural language questions and receive relevant results with interpreted query display

### Tests for User Story 6 (TDD - Write First, Verify Fail)

- [ ] T175 [P] [US6] Unit tests for NL query parser in tests/unit/ai/nl-query-parser.test.ts
- [ ] T176 [P] [US6] Unit tests for query translator in tests/unit/ai/query-translator.test.ts
- [ ] T177 [US6] Integration tests for NL query procedures in tests/integration/ai-query.test.ts
- [ ] T178 [US6] NL query corpus validation (20-50 representative queries) in tests/validation/nl-query-corpus.test.ts

### NL Query Service

- [ ] T179 [US6] Create NL query parsing service with Claude function calling in src/server/services/ai/nl-query-parser.ts
- [ ] T180 [US6] Create query function schema for Claude in src/lib/ai/prompts/query-function.ts
- [ ] T181 [US6] Implement query to Prisma filter translation in src/server/services/ai/query-translator.ts
- [ ] T182 [US6] Create saved queries service in src/server/services/ai/saved-queries.ts

### AI Router Extensions

- [ ] T183 [US6] Add query procedure to AI router in src/server/routers/ai.ts
- [ ] T184 [US6] Add saveQuery, getSavedQueries, deleteSavedQuery procedures in src/server/routers/ai.ts
- [ ] T185 [US6] Add queryFeedback procedure in src/server/routers/ai.ts

### Query UI

- [ ] T186 [US6] Create global search bar component in src/components/shared/global-search.tsx
- [ ] T187 [P] [US6] Create query results display component in src/components/query/query-results.tsx
- [ ] T188 [P] [US6] Create interpreted query display component in src/components/query/interpreted-query.tsx
- [ ] T189 [US6] Create save query dialog in src/components/query/save-query-dialog.tsx
- [ ] T190 [US6] Create saved queries list in src/components/query/saved-queries-list.tsx
- [ ] T191 [US6] Create query feedback buttons in src/components/query/query-feedback.tsx
- [ ] T192 [US6] Create missing data explanation component in src/components/query/missing-data-alert.tsx

**Checkpoint**: At this point, User Story 6 should be fully functional - users can ask natural language questions and get relevant results

---

## Phase 10: User Story 8 - View Next Best Action Recommendations (Priority: P2)

**Goal**: Provide recommended actions for each prioritized prospect

**Independent Test**: View action recommendations for any donor with contextual reasoning

### Tests for User Story 8 (TDD - Write First, Verify Fail)

- [ ] T193 [P] [US8] Unit tests for recommendation engine in tests/unit/ai/recommendation-engine.test.ts
- [ ] T194 [US8] Integration tests for recommendation procedures in tests/integration/ai-recommendation.test.ts

### Recommendation Service

- [ ] T195 [US8] Create next-best-action recommendation engine in src/server/services/ai/recommendation-engine.ts
- [ ] T196 [US8] Create action type definitions and templates in src/server/services/ai/action-types.ts

### AI Router Extensions

- [ ] T197 [US8] Add getRecommendation procedure to AI router in src/server/routers/ai.ts
- [ ] T198 [US8] Add markActionComplete procedure in src/server/routers/ai.ts

### Recommendation UI

- [ ] T199 [US8] Create recommendation card component in src/components/recommendations/recommendation-card.tsx
- [ ] T200 [P] [US8] Create action reasoning display in src/components/recommendations/action-reasoning.tsx
- [ ] T201 [US8] Create mark complete button with next action display in src/components/recommendations/complete-action-button.tsx
- [ ] T202 [US8] Integrate recommendations into priority detail view in src/components/priorities/priority-detail-card.tsx

**Checkpoint**: At this point, User Story 8 should be fully functional - users can view and complete recommended actions

---

## Phase 11: User Story 9 - Generate One-Click Executive Report (Priority: P2)

**Goal**: Generate board-ready executive summaries instantly

**Independent Test**: Generate a report and verify it includes all sections with professional formatting

### Tests for User Story 9 (TDD - Write First, Verify Fail)

- [ ] T203 [P] [US9] Unit tests for report generator in tests/unit/report/report-generator.test.ts
- [ ] T204 [P] [US9] Unit tests for content aggregator in tests/unit/report/content-aggregator.test.ts
- [ ] T205 [US9] Integration tests for report procedures in tests/integration/report.test.ts

### Report Generation Service

- [ ] T206 [US9] Create report generation service in src/server/services/report/report-generator.ts
- [ ] T207 [US9] Create executive report content aggregator in src/server/services/report/content-aggregator.ts
- [ ] T208 [US9] Create PDF report template with @react-pdf/renderer in src/server/services/report/pdf-template.tsx

### Report Router

- [ ] T209 [US9] Create report router with generate procedure in src/server/routers/report.ts
- [ ] T210 [US9] Add get, list, delete procedures in src/server/routers/report.ts
- [ ] T211 [US9] Add schedule, getSchedules, cancelSchedule procedures in src/server/routers/report.ts

### Report Worker

- [ ] T212 [US9] Create report generation worker in worker/report-generator.ts
- [ ] T213 [US9] Implement scheduled report cron job in worker/report-scheduler.ts

### Report UI

- [ ] T214 [US9] Create reports page in src/app/(dashboard)/reports/page.tsx
- [ ] T215 [P] [US9] Create generate report button with options in src/components/reports/generate-report-button.tsx
- [ ] T216 [P] [US9] Create report list component in src/components/reports/report-list.tsx
- [ ] T217 [US9] Create report customization dialog in src/components/reports/report-customization-dialog.tsx
- [ ] T218 [US9] Create schedule report dialog in src/components/reports/schedule-dialog.tsx
- [ ] T219 [US9] Create report preview component in src/components/reports/report-preview.tsx

**Checkpoint**: At this point, User Story 9 should be fully functional - users can generate and schedule executive reports

---

## Phase 12: User Story 10 - View Anomaly and Opportunity Alerts (Priority: P2)

**Goal**: Alert users to unusual patterns and emerging opportunities

**Independent Test**: View alert feed and verify anomalies include pattern descriptions

### Tests for User Story 10 (TDD - Write First, Verify Fail)

- [ ] T220 [P] [US10] Unit tests for anomaly detector in tests/unit/analysis/anomaly-detector.test.ts
- [ ] T221 [P] [US10] Unit tests for alert generator in tests/unit/analysis/alert-generator.test.ts
- [ ] T222 [US10] Integration tests for alert procedures in tests/integration/alert.test.ts

### Anomaly Detection Service

- [ ] T223 [US10] Create anomaly detection engine in src/server/services/analysis/anomaly-detector.ts
- [ ] T224 [P] [US10] Implement engagement spike detector in src/server/services/analysis/anomaly-detectors/engagement-spike.ts
- [ ] T225 [P] [US10] Implement giving pattern change detector in src/server/services/analysis/anomaly-detectors/giving-pattern.ts
- [ ] T226 [P] [US10] Implement contact gap detector in src/server/services/analysis/anomaly-detectors/contact-gap.ts
- [ ] T227 [US10] Create alert generation service in src/server/services/analysis/alert-generator.ts

### Alert Router

- [ ] T228 [US10] Create alert router with list, get, dismiss, markActed procedures in src/server/routers/alert.ts

### Alert UI

- [ ] T229 [US10] Create alerts page in src/app/(dashboard)/alerts/page.tsx
- [ ] T230 [P] [US10] Create alert list component in src/components/alerts/alert-list.tsx
- [ ] T231 [P] [US10] Create alert detail card with pattern description in src/components/alerts/alert-detail-card.tsx
- [ ] T232 [US10] Create alert action buttons (dismiss, acted on) in src/components/alerts/alert-actions.tsx
- [ ] T233 [US10] Add alerts badge to sidebar navigation in src/components/layout/sidebar.tsx

**Checkpoint**: At this point, User Story 10 should be fully functional - users can view and act on anomaly alerts

---

## Phase 13: User Story 11 - Portfolio Balance Assessment (Priority: P2)

**Goal**: Show portfolio balance metrics across gift officers

**Independent Test**: View portfolio distribution visualizations and imbalance flags

### Tests for User Story 11 (TDD - Write First, Verify Fail)

- [ ] T234 [P] [US11] Unit tests for portfolio metrics calculator in tests/unit/analysis/portfolio-metrics.test.ts
- [ ] T235 [P] [US11] Unit tests for imbalance detection in tests/unit/analysis/portfolio-imbalance.test.ts
- [ ] T236 [US11] Integration tests for portfolio metrics procedures in tests/integration/analysis-portfolio.test.ts

### Portfolio Metrics Service

- [ ] T237 [US11] Create portfolio metrics calculator in src/server/services/analysis/portfolio-metrics.ts
- [ ] T238 [US11] Create imbalance detection logic in src/server/services/analysis/portfolio-imbalance.ts
- [ ] T239 [US11] Create rebalancing suggestion generator in src/server/services/analysis/rebalancing-suggestions.ts

### Analysis Router Extensions

- [ ] T240 [US11] Add getPortfolioMetrics procedure to analysis router in src/server/routers/analysis.ts

### Portfolio UI

- [ ] T241 [US11] Create portfolio balance section on dashboard in src/components/dashboard/portfolio-balance.tsx
- [ ] T242 [P] [US11] Create officer metrics cards component in src/components/portfolio/officer-metrics-card.tsx
- [ ] T243 [P] [US11] Create portfolio distribution chart in src/components/charts/portfolio-distribution-chart.tsx
- [ ] T244 [US11] Create imbalance alerts component in src/components/portfolio/imbalance-alerts.tsx
- [ ] T245 [US11] Create rebalancing preview component (preview only per spec) in src/components/portfolio/rebalancing-preview.tsx

**Checkpoint**: At this point, User Story 11 should be fully functional - users can view portfolio balance and imbalances

---

## Phase 14: Constituent Detail Views (Supporting Stories)

**Goal**: Detailed constituent views used across multiple stories

**⚠️ DEPENDENCY**: Requires Phase 4 (US1 Upload) completion - constituent data must exist before these views are useful

### Constituent UI

- [ ] T246 [P] Create donors list page in src/app/(dashboard)/donors/page.tsx
- [ ] T247 [P] Create constituent list component with filtering in src/components/donors/constituent-list.tsx
- [ ] T248 [P] Create constituent search and filters in src/components/donors/constituent-filters.tsx
- [ ] T249 [P] Create constituent card component in src/components/donors/constituent-card.tsx
- [ ] T250 Create constituent detail sidebar in src/components/donors/constituent-detail.tsx
- [ ] T251 Create giving history timeline in src/components/donors/giving-history.tsx
- [ ] T252 Create contact history timeline in src/components/donors/contact-history.tsx

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Error Handling & Loading States

- [ ] T253 [P] Implement global error boundary in src/app/error.tsx
- [ ] T254 [P] Create loading.tsx files for all dashboard routes
- [ ] T255 [P] Create not-found.tsx for 404 handling in src/app/not-found.tsx
- [ ] T256 Implement toast notifications for success/error feedback in src/components/shared/toaster.tsx

### Performance & Caching

- [ ] T257 Implement React Query caching configuration in src/lib/trpc/client.ts
- [ ] T258 Add optimistic updates for common mutations
- [ ] T259 Create database indexes per data-model.md recommendations

### Security Hardening

- [ ] T260 Review and test RLS policies across all tenant tables
- [ ] T261 Implement rate limiting on auth endpoints
- [ ] T262 Add CSP headers and security middleware
- [ ] T263 Audit sensitive data handling in logs

### Landing Page

- [ ] T264 Create public landing page in src/app/page.tsx
- [ ] T265 Add redirect logic for authenticated users

### Final Validation

- [ ] T266 Run full E2E test suite against quickstart.md scenarios
- [ ] T267 Validate all user stories work independently
- [ ] T268 Performance testing: verify <2s page loads, <10s briefs, <5s queries

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 7 (Phase 3)**: First story - auth is required by all others
- **User Stories 1-6 (Phases 4-9)**: All depend on Phase 2 + Phase 3 (auth)
  - US1 (Upload) can start after US7
  - US2 (Health Dashboard) depends on US1 (needs data)
  - US3 (Lapse Risk) depends on US1 (needs data)
  - US4 (Priorities) depends on US3 (uses lapse risk inverse)
  - US5 (Briefs) can start after US7, needs data from US1
  - US6 (NL Query) can start after US7, needs data from US1
- **User Stories 8-11 (Phases 10-13)**: P2 stories, depend on P1 completion
- **Constituent Detail Views (Phase 14)**: Depends on US1 completion (needs data)
- **Polish (Phase 15)**: Depends on all desired user stories being complete

### User Story Dependencies

```
US7 (Auth) → Required by all
     ↓
US1 (Upload) → Required for data-dependent stories
     ↓
┌────┴────┐
↓         ↓
US2     US5 (Briefs)
US3     US6 (NL Query)
↓
US4 (Priorities)
     ↓
US8 (Recommendations) - P2
US9 (Reports) - P2
US10 (Alerts) - P2
US11 (Portfolio) - P2
```

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- After US7 (Auth) + US1 (Upload), stories US2-US6 can progress in parallel
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel

---

## Parallel Example: User Story 5 (AI Briefs)

```bash
# Launch parallel test tasks first (TDD):
Task: "Unit tests for Claude client wrapper in tests/unit/ai/claude.test.ts"
Task: "Unit tests for citation validator in tests/unit/ai/citation-validator.test.ts"

# Verify tests FAIL, then launch parallel infrastructure:
Task: "Create Claude API client wrapper in src/lib/ai/claude.ts"
Task: "Create OpenAI embeddings client in src/lib/ai/embeddings.ts"

# Then launch parallel UI components:
Task: "Create generate brief button component in src/components/briefs/generate-brief-button.tsx"
Task: "Create brief display component in src/components/briefs/brief-display.tsx"
Task: "Create brief section with citations in src/components/briefs/brief-section.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 7 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 7 (Auth/Multi-tenancy) - **tests first, then implement**
4. Complete Phase 4: User Story 1 (Upload) - **tests first, then implement**
5. Complete Phase 5: User Story 2 (Health Dashboard) - **tests first, then implement**
6. **STOP and VALIDATE**: Run test suite, deploy/demo
7. This delivers: Auth + Upload + Health Dashboard = Core diagnostic value

### Incremental P1 Delivery

1. Foundation + US7 + US1 + US2 → Deploy (Basic diagnostic)
2. Add US3 (Lapse Risk) → Deploy (Predictive value)
3. Add US4 (Priorities) → Deploy (Actionable insights)
4. Add US5 (Briefs) → Deploy (AI value proposition)
5. Add US6 (NL Query) → Deploy (Full P1 MVP)

### Parallel Team Strategy

With multiple developers after Foundation + Auth:

- Developer A: User Story 1 (Upload) → US2 (Health)
- Developer B: User Story 3 (Lapse Risk) → US4 (Priorities)
- Developer C: User Story 5 (Briefs) → US6 (NL Query)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- **TDD Workflow**: Write tests → Verify FAIL → Implement → Verify PASS → Refactor
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total tasks: 268
- Test tasks: 45 (included in user story counts below)
- User Story task counts:
  - US7 (Auth/Multi-tenancy): 29 tasks (4 test + 25 implementation)
  - US1 (Upload): 27 tasks (5 test + 22 implementation)
  - US2 (Health Dashboard): 17 tasks (4 test + 13 implementation)
  - US3 (Lapse Risk): 21 tasks (4 test + 17 implementation)
  - US4 (Priorities): 17 tasks (3 test + 14 implementation)
  - US5 (Briefs): 22 tasks (4 test + 18 implementation)
  - US6 (NL Query): 18 tasks (4 test + 14 implementation)
  - US8 (Recommendations): 10 tasks (2 test + 8 implementation)
  - US9 (Reports): 17 tasks (3 test + 14 implementation)
  - US10 (Alerts): 14 tasks (3 test + 11 implementation)
  - US11 (Portfolio): 12 tasks (3 test + 9 implementation)
- Setup/Foundational/Constituent Views/Polish: 64 tasks
