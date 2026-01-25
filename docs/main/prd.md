# GiveMetry Product Requirements Document

**Version:** 1.2
**Created:** 2026-01-25
**Updated:** 2026-01-25
**Status:** Draft
**Input:** Project Brief v1.0, Architecture v2.0

---

## Executive Summary

GiveMetry is an **AI-powered intelligence platform for university advancement offices** that transforms existing CRM data into actionable insights, predictive analytics, and automated workflows. Unlike competitors that require CRM replacement or deliver "just another score," GiveMetry answers the question advancement leaders ask daily: **"Who should we focus on, and what should we do next?"**

### Product Vision

A **governance-first, CRM-agnostic intelligence layer** that:
1. Delivers explainable "who to call today" recommendations with predicted outcomes
2. Generates AI-powered donor briefs and natural language querying
3. Measures closed-loop outcomes (recommendations → meetings → asks → gifts)
4. Requires no CRM replacement — works alongside Blackbaud, Salesforce, and others

### Phasing Overview

| Phase | Name | Core Value | Entry Point |
|-------|------|------------|-------------|
| **Phase 1** | Advancement Health Assessment + Predictive Insights | Diagnostic + AI recommendations | CSV upload |
| **Phase 2** | MGO Copilot | Real-time workflow integration | CRM sync |
| **Phase 3** | Advancement Intelligence Platform | Enterprise forecasting & optimization | Multi-unit |

---

## Problem Statement

### The Advancement Office Crisis

University advancement offices face a perfect storm:

| Challenge | Evidence |
|-----------|----------|
| **Staff burnout** | 46% of gift officers plan to leave within 2 years |
| **Portfolio overload** | MGOs manage 150-250 prospects (standard is 75-150) |
| **Data paralysis** | Wealth screenings from 3+ years ago sit untouched |
| **Tool fatigue** | Average office uses 5-7 disconnected systems |
| **Reporting burden** | 40%+ of advancement services time on manual reports |

### The Technology Gap

**Current solutions fail because:**
- CRM platforms (Blackbaud, Salesforce) are systems of record, not systems of action
- Point solutions (iWave, DonorSearch) deliver scores without actionable recommendations
- Workflow overlays (EverTrue, Gravyty) require heavy adoption and feel like "another platform"

### The Whitespace

**No solution owns:** CRM-agnostic AI intelligence that delivers daily prioritization with explainable predictions, measures outcomes, and includes governance controls — without requiring CRM replacement.

> "We have plenty of data. We have wealth screenings from three years ago we haven't touched. I don't need more data; I need to know which 5 people my gift officer should call tomorrow."
> — Director of Research, Private University

---

## Target Market

### Beachhead Segment

**Mid-tier research universities:** R2 doctoral + Master's institutions with $100M-$1B endowments using Blackbaud or Salesforce CRM.

| Criterion | Specification |
|-----------|---------------|
| Carnegie Classification | R2 (139) + Master's Large/Medium (~500) |
| Endowment | $100M-$1B |
| Advancement team size | 5-25 staff |
| CRM platform | Blackbaud RE NXT or Salesforce |
| **Total addressable** | **400-600 institutions** |

### Key Personas

| Persona | Role in Deal | What Wins Them |
|---------|--------------|----------------|
| **VP of Advancement** | Economic buyer | Peer references, measurable lift, low risk |
| **Director of Advancement Services** | Primary buyer, champion | Integration credibility, time savings |
| **Director of Prospect Research** | Evaluator, influencer | Explainable AI, methodology transparency |
| **Major Gift Officer** | End user, adoption gate | Weekly priorities, less admin |
| **CIO / IT Security** | Veto power | SOC 2, HECVAT, SSO, clean architecture |

---

# Phase 1: Advancement Health Assessment + Predictive Insights (MVP)

**Value Proposition:** "See where you stand, who's at risk, and who to prioritize — in days, not months."

**Entry Point:** CSV export from CRM (no integration required)
**Timeline:** 2-4 weeks from upload to insights
**Price Point:** $2,500-$10,000 one-time diagnostic

---

## Phase 1 User Scenarios & Testing

### User Story 1.1 - Upload and Analyze CRM Data (Priority: P1)

As a **Director of Advancement Services**, I want to upload our CRM data export so that I can get an AI-powered assessment of our advancement health without a complex integration project.

**Why this priority:** This is the entry point for all value. Without data ingestion, nothing else works. Must be frictionless to reduce adoption barriers.

**Independent Test:** Can be fully tested by uploading a sample CSV and receiving confirmation of successful parsing. Delivers immediate value by showing data completeness metrics.

**Acceptance Scenarios:**

1. **Given** I have a CSV export from Blackbaud RE NXT, **When** I upload the file through the web interface, **Then** the system parses constituent, gift, and contact history data within 5 minutes and displays a processing confirmation.

2. **Given** I upload a CSV with missing required columns, **When** processing begins, **Then** the system identifies missing fields, suggests mapping alternatives, and allows me to proceed with available data or re-upload.

3. **Given** I upload a large file (100K+ records), **When** processing completes, **Then** the system handles the volume without timeout and provides progress indication during processing.

4. **Given** I have previously uploaded data, **When** I upload an updated export, **Then** the system identifies new/changed records and updates analysis incrementally.

---

### User Story 1.2 - View Data Health Dashboard (Priority: P1)

As a **Director of Advancement Services**, I want to see a comprehensive data health assessment so that I can understand the quality and completeness of our CRM data and prioritize data cleanup efforts.

**Why this priority:** Data health visibility is foundational. It builds trust in subsequent AI recommendations and identifies quick wins for data improvement.

**Independent Test:** Can be fully tested by viewing the dashboard after upload. Delivers value by quantifying data quality issues that were previously unknown.

**Acceptance Scenarios:**

1. **Given** data has been uploaded, **When** I view the Data Health Dashboard, **Then** I see overall health score (0-100) with breakdown by category: completeness, freshness, consistency, and coverage.

2. **Given** the dashboard is displayed, **When** I click on any health category, **Then** I see specific issues identified with counts and examples (e.g., "2,847 constituents missing email addresses").

3. **Given** data quality issues are identified, **When** I view the recommendations panel, **Then** I see prioritized actions ranked by impact (e.g., "Updating contact info for top 500 donors would improve engagement tracking by 34%").

---

### User Story 1.3 - View Donor Lapse Risk Predictions (Priority: P1)

As a **Director of Prospect Research**, I want to see which donors are at risk of lapsing so that we can proactively intervene before we lose them.

**Why this priority:** Churn prediction is core AI value. Retaining existing donors is 5-10x more cost-effective than acquiring new ones. This directly impacts revenue.

**Independent Test:** Can be fully tested by viewing the lapse risk list and validating predictions against known patterns. Delivers value by surfacing at-risk donors that would otherwise be missed.

**Acceptance Scenarios:**

1. **Given** historical giving data is available, **When** I view the Lapse Risk panel, **Then** I see donors ranked by lapse probability (high/medium/low) with predicted timeframe.

2. **Given** a donor is flagged as high risk, **When** I click to view details, **Then** I see explainable factors: "Last gift: 18 months ago, Giving frequency declined from annual to none, Similar donors lapsed at 73% rate, No contact in 14 months."

3. **Given** the lapse risk list is displayed, **When** I filter by gift officer assignment, **Then** I see only donors in that portfolio, enabling targeted intervention planning.

4. **Given** a donor is flagged, **When** I mark them as "addressed" or "retained", **Then** the system tracks intervention outcomes for model improvement.

---

### User Story 1.4 - View Prospect Prioritization Scores (Priority: P1)

As a **Major Gift Officer**, I want to see which prospects I should focus on this week so that I can maximize my limited time on the highest-potential opportunities.

**Why this priority:** This is the "who to call today" core promise. Without prioritization, GiveMetry is just another dashboard. This is the primary differentiator.

**Independent Test:** Can be fully tested by viewing prioritized prospect list and validating reasoning. Delivers value by providing actionable daily/weekly focus.

**Acceptance Scenarios:**

1. **Given** I am a gift officer with an assigned portfolio, **When** I view my Priority Dashboard, **Then** I see my top 10 prospects ranked by composite score (capacity × likelihood × timing × recency).

2. **Given** a prospect is highly ranked, **When** I view their priority details, **Then** I see explainable reasoning: "High capacity ($250K+), Recent engagement (event attendance last month), Optimal timing (fiscal year-end), Affinity match (Engineering college donor, new building campaign active)."

3. **Given** the prioritization list, **When** I click "Refresh for this week", **Then** the system generates updated priorities based on latest data and excludes recently contacted prospects.

4. **Given** I disagree with a prioritization, **When** I provide feedback ("Not now" or "Already in conversation"), **Then** the system adjusts and learns from my input.

---

### User Story 1.5 - Generate AI Donor Brief (Priority: P1)

As a **Major Gift Officer**, I want to generate a one-page donor brief instantly so that I can prepare for meetings without spending 30 minutes digging through multiple systems.

**Why this priority:** This is a "wow factor" feature that demonstrates immediate tangible value. Addresses the "5-7 disconnected systems" pain point directly.

**Independent Test:** Can be fully tested by generating a brief for any donor. Delivers value by saving 20-30 minutes of meeting prep time per donor.

**Acceptance Scenarios:**

1. **Given** I select a donor from any list, **When** I click "Generate Brief", **Then** I receive a formatted one-page document within 10 seconds containing: giving history summary, relationship highlights, conversation starters, and recommended ask amount/purpose.

2. **Given** the brief is generated, **When** I review the content, **Then** all facts are sourced from uploaded data with no hallucinated information, and each section cites the data source.

3. **Given** I need to customize the brief, **When** I click "Edit", **Then** I can modify content and save a personalized version.

4. **Given** I need to share the brief, **When** I click "Export", **Then** I can download as PDF or copy to clipboard for pasting into other systems.

---

### User Story 1.6 - Natural Language Data Query (Priority: P1)

As a **Director of Advancement Services**, I want to ask questions about our data in plain English so that I can get answers without building complex reports or knowing query syntax.

**Why this priority:** This is a key differentiator and "magic" moment in demos. Dramatically lowers barrier to insights and makes the tool accessible to non-technical users.

**Independent Test:** Can be fully tested by asking various natural language questions. Delivers value by providing instant answers that previously required IT/report requests.

**Acceptance Scenarios:**

1. **Given** I am on any dashboard, **When** I type "Show me donors who gave $10K+ last year but haven't been contacted in 6 months", **Then** the system returns a filtered list matching those criteria within 5 seconds.

2. **Given** I ask a question, **When** results are displayed, **Then** I see the interpreted query ("Showing: Donors with total giving >= $10,000 in FY2025 AND last contact date < July 2025") so I can verify understanding.

3. **Given** the system misinterprets my question, **When** I click "Refine", **Then** I can adjust parameters or rephrase, and the system learns from corrections.

4. **Given** I ask a question that cannot be answered with available data, **When** processing completes, **Then** the system explains what's missing: "Cannot determine contact history — no contact date field was found in uploaded data."

5. **Given** I frequently ask similar questions, **When** I click "Save Query", **Then** I can name and save it for one-click access later.

---

### User Story 1.7 - View Next Best Action Recommendations (Priority: P2)

As a **Major Gift Officer**, I want to see recommended actions for each prioritized prospect so that I know not just WHO to contact but WHAT to do.

**Why this priority:** Transforms prioritization from a list into a playbook. Increases likelihood of action and improves outcomes.

**Independent Test:** Can be fully tested by viewing action recommendations for any donor. Delivers value by providing specific, contextual guidance.

**Acceptance Scenarios:**

1. **Given** I view a prioritized prospect, **When** I look at their profile, **Then** I see a recommended next action: "Schedule discovery meeting" / "Send personalized thank you" / "Invite to upcoming Engineering event" / "Request updated wealth screening."

2. **Given** an action is recommended, **When** I view the reasoning, **Then** I understand why: "Invite to event recommended because: donor has Engineering affinity, hasn't attended event in 2 years, Building Excellence campaign launch event is in 3 weeks."

3. **Given** I complete a recommended action, **When** I mark it complete, **Then** the system generates the next recommended action and tracks completion for outcome measurement.

---

### User Story 1.8 - Generate One-Click Executive Report (Priority: P2)

As a **VP of Advancement**, I want to generate a board-ready executive summary instantly so that I can prepare for leadership meetings without burdening my team with manual report creation.

**Why this priority:** Directly addresses the "40% time on manual reporting" pain point. Creates value for the economic buyer (VP), not just end users.

**Independent Test:** Can be fully tested by generating a report. Delivers value by eliminating hours of manual report compilation.

**Acceptance Scenarios:**

1. **Given** analysis has been completed, **When** I click "Generate Executive Report", **Then** I receive a formatted PDF within 30 seconds containing: portfolio health overview, top opportunities, risk alerts, key metrics vs. benchmarks, and recommended actions.

2. **Given** the report is generated, **When** I review it, **Then** all charts and metrics are presentation-ready with professional formatting suitable for board distribution.

3. **Given** I want to customize the report, **When** I access report settings, **Then** I can select which sections to include, add custom commentary, and brand with institution logo.

4. **Given** I need regular reports, **When** I set up a schedule, **Then** the system emails me updated reports weekly/monthly automatically.

---

### User Story 1.9 - View Anomaly and Opportunity Alerts (Priority: P2)

As a **Director of Prospect Research**, I want to be alerted to unusual patterns and emerging opportunities so that we can act on signals that would otherwise be missed.

**Why this priority:** Demonstrates proactive AI value — the system is watching even when users aren't. Surfaces opportunities and risks that manual review would miss.

**Independent Test:** Can be fully tested by reviewing alert feed. Delivers value by highlighting actionable anomalies automatically.

**Acceptance Scenarios:**

1. **Given** the system has analyzed data, **When** I view the Alerts panel, **Then** I see flagged anomalies: upgrade opportunities (increased engagement, capacity signals), risk alerts (sudden disengagement), and unusual patterns (repeated website visits, event registration spike).

2. **Given** an alert is displayed, **When** I click for details, **Then** I see the specific pattern detected and why it's significant: "Dr. Williams visited giving page 4 times this week (previous: 0 visits/month). Similar behavior preceded gifts 67% of the time."

3. **Given** I review an alert, **When** I mark it as "Acted on" or "Dismissed", **Then** the system learns from my feedback to improve future alert relevance.

---

### User Story 1.10 - Portfolio Balance Assessment (Priority: P2)

As a **Director of Advancement Services**, I want to see how portfolios are balanced across gift officers so that I can identify overloaded staff and underserved prospects.

**Why this priority:** Addresses burnout crisis (46% turnover) by making workload imbalances visible. Sets up Phase 3 optimization features.

**Independent Test:** Can be fully tested by viewing portfolio distribution visualizations. Delivers value by quantifying workload imbalances.

**Acceptance Scenarios:**

1. **Given** portfolio assignments exist in the data, **When** I view Portfolio Balance, **Then** I see each gift officer's portfolio size, total capacity managed, and engagement status distribution.

2. **Given** imbalances exist, **When** the system analyzes portfolios, **Then** it flags issues: "Sarah manages 187 prospects (team avg: 142). 34% of her portfolio has no contact in 12+ months."

3. **Given** I identify an overloaded portfolio, **When** I click "Suggest Rebalancing", **Then** the system recommends specific prospects to reassign based on capacity and affinity matching (preview only in Phase 1, automated in Phase 3).

---

### User Story 1.11 - Multi-Tenant Organization Access (Priority: P2)

As an **institution administrator**, I want to set up our organization with appropriate user roles so that staff can access only the data and features relevant to their role.

**Why this priority:** Required for SaaS multi-tenancy. Security and access control are table stakes for enterprise sales.

**Independent Test:** Can be fully tested by creating organization, inviting users, and verifying access restrictions.

**Acceptance Scenarios:**

1. **Given** I am the first user from my institution, **When** I complete registration, **Then** I can create an organization, set organization details, and become the admin.

2. **Given** I am an admin, **When** I invite team members, **Then** I can assign roles: Admin (full access), Manager (view all, limited config), Gift Officer (own portfolio only), Viewer (read-only dashboards).

3. **Given** a gift officer logs in, **When** they view data, **Then** they see only their assigned portfolio and cannot access other officers' prospects or organization-wide admin settings.

4. **Given** we use email/password authentication, **When** a user registers, **Then** they receive an email verification link and cannot access the system until verified.

5. **Given** a user forgets their password, **When** they request a reset, **Then** they receive a secure reset link (1-hour expiry) and can set a new password.

6. **Given** a user is verified and logs in, **When** credentials are validated, **Then** a JWT session is established with appropriate role permissions.

---

### Phase 1 Edge Cases

- **What happens when CSV has unexpected date formats?** System attempts auto-detection and allows manual format specification if needed.
- **How does the system handle duplicate records?** Fuzzy matching identifies potential duplicates; user confirms merge or marks as distinct.
- **What if a user uploads competitor/different institution data?** Organization isolation ensures data is never visible across tenants; anomaly detection flags unusual patterns.
- **How does prediction work with limited history?** System adjusts confidence levels and clearly indicates when predictions have low confidence due to insufficient data.
- **What if the AI generates incorrect donor brief content?** All facts are sourced from uploaded data only (no external hallucination); citations shown for verification; user can flag errors.

---

## Phase 1 Requirements

### Functional Requirements

**Data Ingestion**
- **FR-101**: System MUST accept CSV uploads up to 500MB containing constituent, gift, and contact data
- **FR-102**: System MUST parse common CRM export formats (Blackbaud RE NXT, Salesforce NPSP) with field auto-mapping
- **FR-103**: System MUST validate data integrity and report parsing errors with line-level detail
- **FR-104**: System MUST support incremental updates without requiring full re-upload

**Analysis & Scoring**
- **FR-105**: System MUST calculate data health scores across completeness, freshness, consistency, and coverage dimensions
- **FR-106**: System MUST generate donor lapse risk predictions with probability scores and explainable factors
- **FR-107**: System MUST generate prospect prioritization scores using capacity, likelihood, timing, and recency signals
- **FR-108**: System MUST provide confidence levels for all predictions indicating data sufficiency

**AI Features**
- **FR-109**: System MUST generate donor briefs from uploaded data within 10 seconds
- **FR-110**: System MUST process natural language queries and return relevant results within 5 seconds
- **FR-111**: System MUST generate next-best-action recommendations based on donor state and context
- **FR-112**: System MUST detect anomalies and surface alerts for unusual patterns
- **FR-113**: System MUST generate executive reports in PDF format on demand

**Explainability & Governance**
- **FR-114**: System MUST provide human-readable explanations for all AI predictions and recommendations
- **FR-115**: System MUST cite data sources for all generated content (no hallucination)
- **FR-116**: System MUST log all AI-generated outputs for audit purposes
- **FR-117**: System MUST allow users to provide feedback on predictions for model improvement

**Multi-Tenancy & Access Control**
- **FR-118**: System MUST isolate all data by organization with no cross-tenant visibility (via row-level security)
- **FR-119**: System MUST support role-based access control (Admin, Manager, Gift Officer, Viewer)
- **FR-120**: System MUST support email/password authentication with secure password hashing (bcrypt)
- **FR-121**: System MUST require email verification before account activation (24-hour token expiry)
- **FR-122**: System MUST support password reset via secure email link (1-hour token expiry)
- **FR-123**: System MUST send transactional emails via Resend (verification, password reset)
- **FR-124**: System MUST maintain audit logs of user actions and data access

### Key Entities (Phase 1)

- **Organization**: Institution account with settings, branding, and user management
- **User**: Individual with role, authentication, and preferences within an organization
- **DataUpload**: CSV file with parsing status, field mappings, and processing history
- **Constituent**: Donor/prospect record with demographics, relationships, and computed scores
- **Gift**: Transaction record with amount, date, designation, and attribution
- **Contact**: Interaction record (meeting, call, email, event) with date and outcome
- **Prediction**: AI-generated score (lapse risk, prioritization) with confidence and explanation
- **Alert**: System-generated notification for anomaly or opportunity detection
- **Brief**: AI-generated donor document with content and citations
- **Query**: Natural language question with interpretation and results

---

## Phase 1 Success Criteria

### Measurable Outcomes

- **SC-101**: Users can upload CRM data and view health dashboard within 15 minutes of first login
- **SC-102**: Donor briefs generate in under 10 seconds with 95%+ factual accuracy (no hallucination)
- **SC-103**: Natural language queries return relevant results for 80%+ of common advancement questions
- **SC-104**: Lapse risk predictions achieve 70%+ accuracy when validated against historical outcomes
- **SC-105**: Executive reports generate in under 30 seconds and are rated "board-ready" by 80%+ of VP users
- **SC-106**: Gift officers report 50%+ reduction in meeting prep time when using donor briefs
- **SC-107**: 90%+ of AI recommendations include clear, understandable explanations

### Business Metrics (Phase 1)

- **SC-108**: 50%+ of diagnostic customers convert to Phase 2 subscription
- **SC-109**: Net Promoter Score of 50+ from Phase 1 users
- **SC-110**: Average time from signup to first insight delivery under 1 day

---

# Phase 2: MGO Copilot

**Value Proposition:** "Know who to call today — delivered to your inbox, tracked to outcomes."

**Entry Point:** Successful Phase 1 diagnostic
**Prerequisite:** CRM integration (Blackbaud, Salesforce)
**Price Point:** $20,000-$40,000/year subscription

---

## Phase 2 User Scenarios & Testing

### User Story 2.1 - Bi-Directional CRM Sync (Priority: P1)

As a **Director of Advancement Services**, I want GiveMetry to sync with our CRM in real-time so that insights are always current and actions are logged back automatically.

**Why this priority:** Foundation for Phase 2. Without live sync, the system becomes stale and requires manual re-uploads.

**Independent Test:** Can be fully tested by connecting CRM and verifying data flows both directions.

**Acceptance Scenarios:**

1. **Given** I am an admin, **When** I configure CRM integration, **Then** I can authenticate via OAuth to Blackbaud RE NXT or Salesforce and select sync frequency (real-time, hourly, daily).

2. **Given** integration is active, **When** a new gift is recorded in the CRM, **Then** GiveMetry reflects the update within the configured sync interval and recalculates affected scores.

3. **Given** a gift officer marks "Contact Made" in GiveMetry, **When** sync runs, **Then** the contact record is created in the CRM with appropriate activity type and notes.

4. **Given** sync encounters an error, **When** the issue occurs, **Then** admins receive notification with specific error details and retry options.

---

### User Story 2.2 - Daily Priority Delivery (Priority: P1)

As a **Major Gift Officer**, I want my weekly priorities delivered to me automatically so that I start each week knowing exactly who to focus on without logging into another system.

**Why this priority:** Reduces friction to zero. Gift officers don't need to log in — insights come to them where they already work.

**Independent Test:** Can be fully tested by configuring delivery and receiving scheduled messages.

**Acceptance Scenarios:**

1. **Given** I am a gift officer, **When** I configure my preferences, **Then** I can choose delivery method (email, Slack, Teams) and frequency (daily, weekly, Monday morning).

2. **Given** it's my scheduled delivery time, **When** the system sends my priorities, **Then** I receive my top 5-10 prospects with brief context and recommended actions, formatted for quick scanning.

3. **Given** I receive a priority email, **When** I click on a prospect, **Then** I'm taken directly to their full profile in GiveMetry (or can view a mobile-friendly summary inline).

---

### User Story 2.3 - Outcome Tracking & Attribution (Priority: P1)

As a **VP of Advancement**, I want to see which GiveMetry recommendations led to actual meetings and gifts so that I can measure ROI and justify the investment.

**Why this priority:** Closed-loop attribution is a key differentiator. Proves value and builds case for renewal/expansion.

**Independent Test:** Can be fully tested by tracking recommendations through to outcomes and viewing attribution reports.

**Acceptance Scenarios:**

1. **Given** a prospect was recommended by GiveMetry, **When** a gift officer logs a meeting with them, **Then** the system tracks the connection: "Recommendation → Meeting (14 days later)."

2. **Given** a meeting was held, **When** a gift is subsequently recorded, **Then** the system attributes the gift to the recommendation chain and calculates influenced revenue.

3. **Given** I am a VP, **When** I view the ROI Dashboard, **Then** I see: total recommendations made, action rate (% acted upon), meetings attributed, gifts attributed, and total influenced revenue.

4. **Given** multiple factors influenced a gift, **When** attribution is calculated, **Then** the system uses reasonable attribution logic (e.g., recommendation within 90 days of gift) and clearly explains methodology.

---

### User Story 2.4 - Portfolio Health Monitoring (Priority: P2)

As a **Director of Prospect Research**, I want ongoing portfolio health monitoring so that I'm alerted when portfolios degrade rather than discovering issues in quarterly reviews.

**Why this priority:** Moves from point-in-time assessment to continuous monitoring. Proactive vs. reactive management.

**Independent Test:** Can be fully tested by setting health thresholds and receiving alerts when triggered.

**Acceptance Scenarios:**

1. **Given** CRM sync is active, **When** the system analyzes portfolios continuously, **Then** health scores update automatically and trends are tracked over time.

2. **Given** portfolio health drops below threshold, **When** the decline is detected, **Then** relevant managers receive alerts: "Sarah's portfolio health dropped from 72 to 58 this month. Primary driver: 23 prospects with no contact in 90+ days."

3. **Given** I view portfolio trends, **When** I examine the history, **Then** I see health score trajectory with annotations for significant events (staff changes, campaign launches, etc.).

---

### User Story 2.5 - Meeting Prep Automation (Priority: P2)

As a **Major Gift Officer**, I want GiveMetry to automatically prepare me for upcoming meetings so that I'm always informed without manual preparation.

**Why this priority:** Extends the donor brief concept to workflow integration. Calendar-aware assistance.

**Independent Test:** Can be fully tested by connecting calendar and receiving meeting prep before scheduled donor meetings.

**Acceptance Scenarios:**

1. **Given** I connect my calendar, **When** a meeting is scheduled with a constituent in the system, **Then** GiveMetry automatically identifies the donor and queues a brief.

2. **Given** a donor meeting is tomorrow, **When** my daily prep runs, **Then** I receive an updated donor brief emailed or delivered via preferred channel with any new information since last contact.

3. **Given** a meeting involves multiple attendees, **When** the system prepares the brief, **Then** it identifies all known constituents and provides context for each.

---

### Phase 2 Edge Cases

- **What if CRM credentials expire?** System alerts admin, pauses sync gracefully, and provides re-authentication flow.
- **What if sync creates duplicate contacts?** Matching logic prevents duplicates; conflicts flagged for human review.
- **How does outcome attribution handle gifts from non-recommended donors?** Gifts are tracked regardless; "influenced" metrics only count recommendation-attributed outcomes.
- **What if gift officer doesn't act on recommendations?** System tracks inaction as signal; adjusts future recommendations; surfaces in manager reporting without being punitive.

---

## Phase 2 Requirements

### Functional Requirements

**CRM Integration**
- **FR-201**: System MUST support OAuth-based integration with Blackbaud RE NXT and Salesforce NPSP
- **FR-202**: System MUST sync constituent, gift, and contact data bi-directionally
- **FR-203**: System MUST support configurable sync frequency (real-time, hourly, daily)
- **FR-204**: System MUST handle sync errors gracefully with retry logic and admin notification
- **FR-205**: System MUST map fields between GiveMetry schema and CRM-specific schemas

**Authentication (SSO)**
- **FR-206**: System MUST support SSO via SAML 2.0 and OIDC for enterprise customers
- **FR-207**: System MUST support per-tenant SSO configuration (institutional identity providers)

**Workflow Delivery**
- **FR-208**: System MUST deliver priority recommendations via email, Slack, and Microsoft Teams
- **FR-209**: System MUST support configurable delivery schedules per user
- **FR-210**: System MUST integrate with calendar systems to identify upcoming donor meetings
- **FR-211**: System MUST auto-generate meeting prep materials for scheduled donor interactions

**Outcome Tracking**
- **FR-212**: System MUST track recommendation → action → outcome chains
- **FR-213**: System MUST attribute meetings and gifts to originating recommendations
- **FR-214**: System MUST calculate and display ROI metrics including influenced revenue
- **FR-215**: System MUST support configurable attribution windows (default 90 days)

**Continuous Monitoring**
- **FR-216**: System MUST continuously recalculate scores as new data syncs
- **FR-217**: System MUST track health score trends over time
- **FR-218**: System MUST alert managers when portfolio health degrades below thresholds

---

## Phase 2 Success Criteria

### Measurable Outcomes

- **SC-201**: CRM integration completes in under 1 day with admin-only configuration (no IT involvement required)
- **SC-202**: 80%+ of gift officers engage with delivered priorities weekly
- **SC-203**: Outcome attribution tracks 90%+ of gifts back to recommendation chains
- **SC-204**: Users report 30%+ increase in prospect contact frequency after Phase 2 adoption
- **SC-205**: Meeting prep automation saves average 2+ hours per gift officer per week

### Business Metrics (Phase 2)

- **SC-206**: Net revenue retention of 110%+ (expansion within accounts)
- **SC-207**: 80%+ of Phase 2 customers renew after first year
- **SC-208**: Average account expands to 1.5x initial contract value within 18 months

---

# Phase 3: Advancement Intelligence Platform

**Value Proposition:** "Campaign forecasting, portfolio optimization, and institutional benchmarking — enterprise intelligence at scale."

**Entry Point:** Mature Phase 2 deployment
**Prerequisite:** 12+ months of outcome data for forecasting accuracy
**Price Point:** $50,000-$150,000/year enterprise subscription

---

## Phase 3 User Scenarios & Testing

### User Story 3.1 - Campaign Pipeline Forecasting (Priority: P1)

As a **VP of Advancement**, I want AI-powered campaign forecasting so that I can accurately project fundraising outcomes and communicate confidently to leadership.

**Why this priority:** High-value enterprise feature. Campaign forecasting is a major pain point and competitive differentiator.

**Independent Test:** Can be fully tested by generating forecasts and comparing to historical accuracy.

**Acceptance Scenarios:**

1. **Given** 12+ months of historical data, **When** I create a campaign forecast, **Then** the system projects expected revenue by month with confidence intervals based on historical conversion rates and current pipeline.

2. **Given** a forecast is generated, **When** I view the methodology, **Then** I see explainable assumptions: "Based on: current pipeline of $4.2M at various stages, historical close rates by stage, seasonal patterns, and similar campaign performance."

3. **Given** actual results differ from forecast, **When** I update actuals, **Then** the system recalibrates future projections and explains variance: "September came in 12% below forecast due to 2 major donor deferrals."

4. **Given** I'm considering strategy changes, **When** I model scenarios, **Then** I can see projected impact: "If we add 2 gift officers, projected revenue increases 18% based on productivity assumptions."

---

### User Story 3.2 - AI-Powered Portfolio Optimization (Priority: P1)

As a **Director of Advancement Services**, I want AI recommendations for portfolio assignments so that prospects are matched to the best gift officer for their profile.

**Why this priority:** Moves from visibility (Phase 1) to action. Addresses burnout and improves match quality.

**Independent Test:** Can be fully tested by running optimization and reviewing recommended reassignments.

**Acceptance Scenarios:**

1. **Given** portfolios are imbalanced, **When** I run optimization, **Then** the system recommends specific reassignments: "Move 12 prospects from Sarah to Michael — better affinity match (Engineering donors) and rebalances workload."

2. **Given** optimization runs, **When** I review recommendations, **Then** I see rationale for each: "Dr. Chen recommended for Jennifer because: same alma mater, Jennifer closed 3 similar donors, current officer has 180% of target portfolio size."

3. **Given** I approve recommendations, **When** I execute changes, **Then** the system updates assignments and syncs to CRM, notifying affected gift officers.

4. **Given** a new prospect enters the system, **When** auto-assignment is enabled, **Then** the system recommends optimal gift officer assignment based on capacity, affinity, and historical success patterns.

---

### User Story 3.3 - Donor Churn Intervention System (Priority: P1)

As a **Director of Prospect Research**, I want automated intervention workflows for at-risk donors so that we systematically prevent churn before it happens.

**Why this priority:** Elevates lapse prediction (Phase 1) to automated intervention. Proactive retention at scale.

**Independent Test:** Can be fully tested by configuring intervention rules and tracking triggered workflows.

**Acceptance Scenarios:**

1. **Given** a donor reaches high lapse risk, **When** threshold is crossed, **Then** the system auto-creates intervention task, assigns to appropriate owner, and optionally triggers automated touchpoint (e.g., thank you letter).

2. **Given** intervention rules are configured, **When** I define a rule, **Then** I can specify: risk threshold, delay before action, intervention type (task, email, notification), and owner assignment logic.

3. **Given** interventions are tracked, **When** I view retention metrics, **Then** I see: donors flagged, interventions triggered, successful retentions (gave again), and retention rate improvement vs. baseline.

---

### User Story 3.4 - Cross-Institution Benchmarking (Priority: P2)

As a **VP of Advancement**, I want to see how our metrics compare to peer institutions so that I can contextualize our performance and identify improvement opportunities.

**Why this priority:** Unique value only possible with multiple customers. Creates competitive moat and institutional FOMO.

**Independent Test:** Can be fully tested by viewing anonymized benchmark comparisons.

**Acceptance Scenarios:**

1. **Given** benchmarking is enabled, **When** I view my dashboard, **Then** I see my metrics alongside anonymized peer cohort: "Your donor retention rate (67%) vs. peer median (71%) — Below median, opportunity area."

2. **Given** peer comparison shows a gap, **When** I click for details, **Then** I see anonymized best practices: "Top quartile institutions average 4.2 contacts per major donor annually vs. your 2.8."

3. **Given** I want to define my peer group, **When** I configure benchmarking, **Then** I can select cohort criteria: Carnegie classification, endowment size, region, or custom peer set.

4. **Given** data is shared for benchmarking, **When** aggregation occurs, **Then** all institutional data is anonymized and no individual donor information crosses tenant boundaries.

---

### User Story 3.5 - Multi-Unit Management (Priority: P2)

As a **CDO (Chief Development Officer)** of a large university, I want to manage multiple advancement units (schools, athletics, hospital) with unified reporting and appropriate access controls.

**Why this priority:** Enterprise requirement for large institutions. Expands addressable market to R1 universities.

**Independent Test:** Can be fully tested by configuring multiple units and verifying rollup reporting.

**Acceptance Scenarios:**

1. **Given** I have multiple units, **When** I configure organizational structure, **Then** I can create units (e.g., "College of Engineering", "Athletics", "Medical Center") with separate portfolios and staff.

2. **Given** units are configured, **When** staff log in, **Then** they see only their unit's data unless granted cross-unit access.

3. **Given** I have central oversight, **When** I view executive dashboards, **Then** I see rollup metrics across all units with drill-down capability.

4. **Given** a prospect has relationships with multiple units, **When** coordination is needed, **Then** the system flags multi-unit interest and facilitates coordination without creating duplicate outreach.

---

### Phase 3 Edge Cases

- **What if forecasting data is insufficient?** System indicates confidence level and recommends data collection to improve accuracy.
- **How are portfolio optimization recommendations weighted?** Configurable weighting (capacity, affinity, workload) with explainable defaults.
- **What if an institution doesn't want to share benchmarking data?** Participation is opt-in; non-participants can't view benchmarks.
- **How does multi-unit handle gift splitting?** Supports split gifts with configurable credit allocation rules.

---

## Phase 3 Requirements

### Functional Requirements

**Forecasting**
- **FR-301**: System MUST generate campaign revenue forecasts with configurable time horizons
- **FR-302**: System MUST provide confidence intervals for all projections
- **FR-303**: System MUST support scenario modeling with adjustable assumptions
- **FR-304**: System MUST track forecast accuracy and auto-calibrate models

**Portfolio Optimization**
- **FR-305**: System MUST recommend portfolio reassignments based on capacity, affinity, and historical success
- **FR-306**: System MUST support auto-assignment of new prospects
- **FR-307**: System MUST sync assignment changes to integrated CRM
- **FR-308**: System MUST provide explainable rationale for all optimization recommendations

**Automated Interventions**
- **FR-309**: System MUST support configurable intervention rules triggered by risk thresholds
- **FR-310**: System MUST auto-create tasks and send notifications based on rules
- **FR-311**: System MUST track intervention outcomes and retention impact
- **FR-312**: System MUST support integration with marketing automation for triggered communications

**Benchmarking**
- **FR-313**: System MUST aggregate anonymized metrics across participating institutions
- **FR-314**: System MUST support configurable peer cohort definitions
- **FR-315**: System MUST ensure no individual donor data crosses tenant boundaries
- **FR-316**: System MUST provide opt-in/opt-out controls for benchmarking participation

**Enterprise Features**
- **FR-317**: System MUST support multi-unit organizational hierarchies
- **FR-318**: System MUST provide rollup reporting across units
- **FR-319**: System MUST support unit-specific access controls
- **FR-320**: System MUST handle multi-unit prospect coordination and gift splitting

---

## Phase 3 Success Criteria

### Measurable Outcomes

- **SC-301**: Campaign forecasts achieve 85%+ accuracy within confidence intervals
- **SC-302**: Portfolio optimization recommendations are accepted 70%+ of the time
- **SC-303**: Automated interventions reduce donor lapse rate by 20%+ vs. baseline
- **SC-304**: Benchmarking participation reaches 50%+ of customer base within 12 months of launch
- **SC-305**: Multi-unit deployments complete in under 30 days

### Business Metrics (Phase 3)

- **SC-306**: Average contract value increases 2x from Phase 2 to Phase 3
- **SC-307**: Phase 3 customers have 95%+ annual retention rate
- **SC-308**: Phase 3 revenue represents 40%+ of total ARR by Year 3

---

# Technical Architecture

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION                                │
│                    Railway (master branch)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js Application (App Router)            │   │
│  │   - Server-rendered pages + API routes + tRPC           │   │
│  │   - NextAuth v5 (Credentials auth, SSO in Phase 2)      │   │
│  │   - Resend (transactional email: verification, reset)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Railway Workers (database-backed jobs)           │   │
│  │   - CSV processing, scoring, report generation          │   │
│  │   - No Redis/BullMQ for MVP (add if scale demands)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                    ┌──────┴──────┐                              │
│                    │  PostgreSQL │                              │
│                    │  + pgvector │                              │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        STAGING                                   │
│                    VPS (dev branch)                              │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐  │
│  │   Web App   │  │   Workers (optional for local dev)      │  │
│  └─────────────┘  └─────────────────────────────────────────┘  │
│                           │                                      │
│                    ┌──────┴──────┐                              │
│                    │  PostgreSQL │  ◄── Shared with local dev   │
│                    │  + pgvector │                              │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     LOCAL DEVELOPMENT                            │
│                   MacBook (dev branch)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │   Next.js dev server (hot reload)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                    ┌──────┴──────┐                              │
│                    │  PostgreSQL │  ◄── VPS database (remote)   │
│                    │  (via VPS)  │      or local Postgres       │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## Multi-Tenancy Architecture

**Strategy:** Row-level isolation (RLS) with shared tables

```
┌─────────────────────────────────────────────────┐
│              PostgreSQL Database                 │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │            Shared Tables                   │  │
│  │  All tables include organization_id        │  │
│  │                                            │  │
│  │  - constituents (org_id, ...)             │  │
│  │  - gifts (org_id, ...)                    │  │
│  │  - predictions (org_id, ...)              │  │
│  │  - contacts (org_id, ...)                 │  │
│  │  - alerts (org_id, ...)                   │  │
│  │                                            │  │
│  │  RLS Policy: WHERE org_id = current_org() │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ Isolation enforced at two layers:          │  │
│  │ 1. Application: Prisma middleware          │  │
│  │ 2. Database: PostgreSQL RLS policies       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Benefits:**
- FERPA, HECVAT, SOC 2 compliant (logical isolation)
- Single migration runs once (not per-tenant)
- Simpler backup/restore and connection pooling
- Proven pattern; scales well for 500+ tenants
- Defense-in-depth with RLS as database-level safeguard

## AI/LLM Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI Service Layer                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    AI Router                               │  │
│  │   - Request routing based on task type                    │  │
│  │   - Rate limiting and cost management                     │  │
│  │   - Response caching for common queries                   │  │
│  └────────────┬───────────────────────────┬─────────────────┘  │
│               │                           │                      │
│  ┌────────────▼────────┐     ┌───────────▼──────────────┐      │
│  │ Claude API          │     │ Embedding Service        │      │
│  │ - Donor briefs      │     │ - Semantic search        │      │
│  │ - NL query parsing  │     │ - Similarity matching    │      │
│  │ - Explanations      │     │ - Query understanding    │      │
│  │ - Report generation │     │                          │      │
│  └─────────────────────┘     └──────────────────────────┘      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  ML Models (Internal)                     │  │
│  │   - Lapse risk prediction (trained on historical data)   │  │
│  │   - Prioritization scoring (multi-factor model)          │  │
│  │   - Anomaly detection (statistical + ML hybrid)          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
Phase 1 (CSV Upload):
CSV File → Parser → Validator → Field Mapper → PostgreSQL (RLS) → Analysis Engine → Predictions
                                                      ↓
                                    Railway Worker (async for large files)

Phase 2 (CRM Sync):
CRM API ←→ Sync Service → Change Detection → PostgreSQL → Real-time Analysis → Delivery Service
                ↓
         Write-back Queue → CRM API (contacts, activities logged back)

Phase 3 (Enterprise):
Multiple Units → Aggregation Service → Forecasting Models → Executive Dashboards
                         ↓
              Anonymization → Benchmarking Aggregates
```

## Key Architecture Decisions

The following decisions were made during architecture review (see `architecture.md` for full ADRs):

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | Prisma 7 | Team familiarity, reuse tenant middleware |
| Multi-tenancy | Row-level isolation (RLS) | Simpler ops, FERPA/SOC 2 compliant |
| Phase 1 Auth | NextAuth v5 + Credentials | Email verification, password reset, SSO-ready for Phase 2 |
| Transactional Email | Resend | Simple API, good deliverability, React templates |
| Background Jobs | Database-backed + Railway workers | Less infrastructure for MVP |
| Payments | Invoice/ACH (no Stripe) | Enterprise PO workflow |
| API Layer | tRPC | End-to-end type safety |
| UI Components | shadcn/ui + Tailwind | Copy-paste components, customizable |

---

# Non-Functional Requirements

## Performance

- **NFR-001**: Page load time under 2 seconds for all dashboards
- **NFR-002**: CSV processing at minimum 10,000 records per minute
- **NFR-003**: AI-generated content (briefs, queries) responds within 10 seconds
- **NFR-004**: CRM sync completes within configured interval with <1% failure rate
- **NFR-005**: System supports 100 concurrent users per tenant without degradation

## Security & Compliance

- **NFR-006**: SOC 2 Type II certification within 12 months of launch
- **NFR-007**: HECVAT (Higher Education Community Vendor Assessment Toolkit) documentation complete at launch
- **NFR-008**: All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- **NFR-009**: SSO support via SAML 2.0 and OIDC (Phase 2)
- **NFR-010**: FERPA-compliant data handling (no student PII exposure)
- **NFR-011**: Audit logs retained for 7 years
- **NFR-012**: Annual penetration testing with remediation within 30 days

## Availability & Reliability

- **NFR-013**: 99.9% uptime SLA (8.76 hours downtime/year max)
- **NFR-014**: Automated daily backups with 30-day retention
- **NFR-015**: Recovery Point Objective (RPO): 1 hour
- **NFR-016**: Recovery Time Objective (RTO): 4 hours
- **NFR-017**: Zero-downtime deployments

## Scalability

- **NFR-018**: Architecture supports 500+ tenant organizations
- **NFR-019**: Supports datasets up to 1M constituents per tenant
- **NFR-020**: Horizontal scaling for API and worker tiers

---

# Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **AI hallucination in donor briefs** | Medium | High | Strict sourcing from uploaded data only; citation requirements; user feedback loop |
| **Prediction accuracy insufficient** | Medium | High | Clear confidence indicators; continuous model improvement; conservative thresholds |
| **CRM integration complexity** | High | Medium | Phase 1 proves value without integration; dedicated integration testing; fallback to CSV |
| **User adoption failure** | Medium | High | Frictionless delivery (email priorities); no dashboard required for core value; simplicity focus |
| **Competitor response (Blackbaud/Salesforce)** | High | Medium | Speed to market; governance differentiation; CRM-agnostic positioning |
| **Security/compliance delays** | Medium | Medium | Security-first architecture; HECVAT prep from day one; dedicated compliance resources |
| **Data quality blocks analysis** | Medium | Medium | Graceful degradation; clear communication of data requirements; data health as feature |

---

# Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Constituent** | Any individual in the advancement database (donor, prospect, alumni, etc.) |
| **MGO** | Major Gift Officer — frontline fundraiser managing a portfolio of prospects |
| **Portfolio** | The set of prospects assigned to a specific gift officer |
| **Lapse** | When a donor stops giving (typically defined as no gift in 18-24 months) |
| **Capacity** | Estimated giving potential based on wealth indicators |
| **Affinity** | Connection strength to the institution (alumni, parent, grateful patient, etc.) |
| **LYBUNT** | Last Year But Unfortunately Not This year — donors who gave last year but not yet this year |
| **SYBUNT** | Some Year But Unfortunately Not This year — donors who gave previously but not recently |

---

# Appendix B: User Role Permissions Matrix

| Capability | Admin | Manager | Gift Officer | Viewer |
|------------|-------|---------|--------------|--------|
| Upload data | ✓ | ✗ | ✗ | ✗ |
| Configure integrations | ✓ | ✗ | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ | ✗ |
| View all portfolios | ✓ | ✓ | ✗ | ✗ |
| View own portfolio | ✓ | ✓ | ✓ | ✗ |
| Generate briefs | ✓ | ✓ | ✓ | ✗ |
| Natural language query | ✓ | ✓ | ✓ | ✓ |
| View dashboards | ✓ | ✓ | ✓ | ✓ |
| Generate executive reports | ✓ | ✓ | ✗ | ✗ |
| Configure delivery preferences | ✓ | ✓ | ✓ | ✗ |
| Approve portfolio changes | ✓ | ✓ | ✗ | ✗ |

---

# Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-25 | John (PM Agent) | Initial PRD based on project brief v1.0 |
| 1.1 | 2026-01-25 | Winston (Architect) | Aligned with architecture v2.0: RLS multi-tenancy, SSO moved to Phase 2, simplified infrastructure |
| 1.2 | 2026-01-25 | Winston (Architect) | Enhanced auth: email verification, password reset, Resend, NextAuth v5 |

---

*This PRD synthesizes the GiveMetry Project Brief and establishes detailed requirements across all three product phases. It serves as the foundation for technical planning, design, and development.*
