# Feature Specification: GiveMetry MVP (Phase 1)

**Feature Branch**: `001-givemetry-mvp`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "Build the GiveMetry MVP - AI-powered advancement intelligence platform for university fundraising offices (Phase 1)"

---

## Overview

GiveMetry is an AI-powered intelligence platform for university advancement offices that transforms existing CRM data into actionable insights, predictive analytics, and automated workflows. Phase 1 delivers an "Advancement Health Assessment + Predictive Insights" product via CSV upload, enabling advancement teams to see where they stand, who's at risk, and who to prioritize — without complex CRM integrations.

**Core Value Proposition**: "See where you stand, who's at risk, and who to prioritize — in days, not months."

**Target Users**:
- VP of Advancement (economic buyer)
- Director of Advancement Services (primary buyer, champion)
- Director of Prospect Research (evaluator, influencer)
- Major Gift Officer (end user, adoption gate)
- Institution Administrator (setup and access control)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload and Analyze CRM Data (Priority: P1)

As a **Director of Advancement Services**, I want to upload our CRM data export so that I can get an AI-powered assessment of our advancement health without a complex integration project.

**Why this priority**: This is the entry point for all value. Without data ingestion, nothing else works. Must be frictionless to reduce adoption barriers.

**Independent Test**: Can be fully tested by uploading a sample CSV and receiving confirmation of successful parsing. Delivers immediate value by showing data completeness metrics.

**Acceptance Scenarios**:

1. **Given** I have a CSV export from Blackbaud RE NXT or Salesforce, **When** I upload the file through the web interface, **Then** the system parses constituent, gift, and contact history data within 5 minutes and displays a processing confirmation with record counts.

2. **Given** I upload a CSV with missing required columns, **When** processing begins, **Then** the system identifies missing fields, suggests mapping alternatives from available columns, and allows me to proceed with available data or re-upload.

3. **Given** I upload a large file (100K+ records), **When** processing completes, **Then** the system handles the volume without timeout and provides progress indication during processing.

4. **Given** I have previously uploaded data, **When** I upload an updated export, **Then** the system identifies new/changed records and updates analysis incrementally without requiring full reprocessing.

5. **Given** the CSV has unexpected date formats, **When** the system parses dates, **Then** it attempts auto-detection of common formats and allows manual format specification if detection fails.

---

### User Story 2 - View Data Health Dashboard (Priority: P1)

As a **Director of Advancement Services**, I want to see a comprehensive data health assessment so that I can understand the quality and completeness of our CRM data and prioritize data cleanup efforts.

**Why this priority**: Data health visibility is foundational. It builds trust in subsequent AI recommendations and identifies quick wins for data improvement.

**Independent Test**: Can be fully tested by viewing the dashboard after upload. Delivers value by quantifying data quality issues that were previously unknown.

**Acceptance Scenarios**:

1. **Given** data has been uploaded, **When** I view the Data Health Dashboard, **Then** I see an overall health score (0-100) with breakdown by category: completeness, freshness, consistency, and coverage.

2. **Given** the dashboard is displayed, **When** I click on any health category, **Then** I see specific issues identified with counts and examples (e.g., "2,847 constituents missing email addresses").

3. **Given** data quality issues are identified, **When** I view the recommendations panel, **Then** I see prioritized actions ranked by impact (e.g., "Updating contact info for top 500 donors would improve engagement tracking by 34%").

---

### User Story 3 - View Donor Lapse Risk Predictions (Priority: P1)

As a **Director of Prospect Research**, I want to see which donors are at risk of lapsing so that we can proactively intervene before we lose them.

**Why this priority**: Churn prediction is core AI value. Retaining existing donors is 5-10x more cost-effective than acquiring new ones. This directly impacts revenue.

**Independent Test**: Can be fully tested by viewing the lapse risk list and validating predictions against known patterns. Delivers value by surfacing at-risk donors that would otherwise be missed.

**Acceptance Scenarios**:

1. **Given** historical giving data is available, **When** I view the Lapse Risk panel, **Then** I see donors ranked by lapse probability (high/medium/low) with predicted timeframe.

2. **Given** a donor is flagged as high risk, **When** I click to view details, **Then** I see explainable factors: "Last gift: 18 months ago, Giving frequency declined from annual to none, Similar donors lapsed at 73% rate, No contact in 14 months."

3. **Given** the lapse risk list is displayed, **When** I filter by gift officer assignment, **Then** I see only donors in that portfolio, enabling targeted intervention planning.

4. **Given** a donor is flagged, **When** I mark them as "addressed" or "retained", **Then** the system tracks intervention outcomes for model improvement.

---

### User Story 4 - View Prospect Prioritization Scores (Priority: P1)

As a **Major Gift Officer**, I want to see which prospects I should focus on this week so that I can maximize my limited time on the highest-potential opportunities.

**Why this priority**: This is the "who to call today" core promise. Without prioritization, GiveMetry is just another dashboard. This is the primary differentiator.

**Independent Test**: Can be fully tested by viewing prioritized prospect list and validating reasoning. Delivers value by providing actionable daily/weekly focus.

**Acceptance Scenarios**:

1. **Given** I am a gift officer with an assigned portfolio, **When** I view my Priority Dashboard, **Then** I see my top 10 prospects ranked by composite score (capacity × likelihood × timing × recency).

2. **Given** a prospect is highly ranked, **When** I view their priority details, **Then** I see explainable reasoning: "High capacity ($250K+), Recent engagement (event attendance last month), Optimal timing (fiscal year-end), Affinity match (Engineering college donor, new building campaign active)."

3. **Given** the prioritization list, **When** I click "Refresh for this week", **Then** the system generates updated priorities based on latest data and excludes recently contacted prospects.

4. **Given** I disagree with a prioritization, **When** I provide feedback ("Not now" or "Already in conversation"), **Then** the system adjusts and learns from my input for future recommendations.

---

### User Story 5 - Generate AI Donor Brief (Priority: P1)

As a **Major Gift Officer**, I want to generate a one-page donor brief instantly so that I can prepare for meetings without spending 30 minutes digging through multiple systems.

**Why this priority**: This is a "wow factor" feature that demonstrates immediate tangible value. Addresses the "5-7 disconnected systems" pain point directly.

**Independent Test**: Can be fully tested by generating a brief for any donor. Delivers value by saving 20-30 minutes of meeting prep time per donor.

**Acceptance Scenarios**:

1. **Given** I select a donor from any list, **When** I click "Generate Brief", **Then** I receive a formatted one-page document within 10 seconds containing: giving history summary, relationship highlights, conversation starters, and recommended ask amount/purpose.

2. **Given** the brief is generated, **When** I review the content, **Then** all facts are sourced from uploaded data with no hallucinated information, and each section cites the data source.

3. **Given** I need to customize the brief, **When** I click "Edit", **Then** I can modify content and save a personalized version.

4. **Given** I need to share the brief, **When** I click "Export", **Then** I can download as PDF or copy to clipboard for pasting into other systems.

5. **Given** AI generates incorrect content, **When** I identify an error, **Then** I can flag it for correction and the system records the feedback.

---

### User Story 6 - Natural Language Data Query (Priority: P1)

As a **Director of Advancement Services**, I want to ask questions about our data in plain English so that I can get answers without building complex reports or knowing query syntax.

**Why this priority**: This is a key differentiator and "magic" moment in demos. Dramatically lowers barrier to insights and makes the tool accessible to non-technical users.

**Independent Test**: Can be fully tested by asking various natural language questions. Delivers value by providing instant answers that previously required IT/report requests.

**Acceptance Scenarios**:

1. **Given** I am on any dashboard, **When** I type "Show me donors who gave $10K+ last year but haven't been contacted in 6 months", **Then** the system returns a filtered list matching those criteria within 5 seconds.

2. **Given** I ask a question, **When** results are displayed, **Then** I see the interpreted query (e.g., "Showing: Donors with total giving >= $10,000 in FY2025 AND last contact date < July 2025") so I can verify understanding.

3. **Given** the system misinterprets my question, **When** I click "Refine", **Then** I can adjust parameters or rephrase, and the system learns from corrections.

4. **Given** I ask a question that cannot be answered with available data, **When** processing completes, **Then** the system explains what's missing: "Cannot determine contact history — no contact date field was found in uploaded data."

5. **Given** I frequently ask similar questions, **When** I click "Save Query", **Then** I can name and save it for one-click access later.

---

### User Story 7 - Multi-Tenant Organization Access (Priority: P1)

As an **institution administrator**, I want to set up our organization with appropriate user roles so that staff can access only the data and features relevant to their role.

**Why this priority**: Required for SaaS multi-tenancy and security. Security and access control are table stakes for enterprise sales.

**Independent Test**: Can be fully tested by creating organization, inviting users, and verifying access restrictions.

**Acceptance Scenarios**:

1. **Given** I am the first user from my institution, **When** I complete registration, **Then** I can create an organization, set organization details, and become the admin.

2. **Given** I am an admin, **When** I invite team members, **Then** I can assign roles: Admin (full access), Manager (view all, limited config), Gift Officer (own portfolio only), Viewer (read-only dashboards).

3. **Given** a gift officer logs in, **When** they view data, **Then** they see only their assigned portfolio and cannot access other officers' prospects or organization-wide admin settings.

4. **Given** I use email/password authentication, **When** I register, **Then** I receive an email verification link and cannot access the system until verified.

5. **Given** I forget my password, **When** I request a reset, **Then** I receive a secure reset link (1-hour expiry) and can set a new password.

6. **Given** I am verified and log in, **When** credentials are validated, **Then** a secure session is established with appropriate role permissions.

---

### User Story 8 - View Next Best Action Recommendations (Priority: P2)

As a **Major Gift Officer**, I want to see recommended actions for each prioritized prospect so that I know not just WHO to contact but WHAT to do.

**Why this priority**: Transforms prioritization from a list into a playbook. Increases likelihood of action and improves outcomes.

**Independent Test**: Can be fully tested by viewing action recommendations for any donor. Delivers value by providing specific, contextual guidance.

**Acceptance Scenarios**:

1. **Given** I view a prioritized prospect, **When** I look at their profile, **Then** I see a recommended next action: "Schedule discovery meeting" / "Send personalized thank you" / "Invite to upcoming Engineering event" / "Request updated wealth screening."

2. **Given** an action is recommended, **When** I view the reasoning, **Then** I understand why: "Invite to event recommended because: donor has Engineering affinity, hasn't attended event in 2 years, Building Excellence campaign launch event is in 3 weeks."

3. **Given** I complete a recommended action, **When** I mark it complete, **Then** the system generates the next recommended action and tracks completion for outcome measurement.

---

### User Story 9 - Generate One-Click Executive Report (Priority: P2)

As a **VP of Advancement**, I want to generate a board-ready executive summary instantly so that I can prepare for leadership meetings without burdening my team with manual report creation.

**Why this priority**: Directly addresses the "40% time on manual reporting" pain point. Creates value for the economic buyer (VP), not just end users.

**Independent Test**: Can be fully tested by generating a report. Delivers value by eliminating hours of manual report compilation.

**Acceptance Scenarios**:

1. **Given** analysis has been completed, **When** I click "Generate Executive Report", **Then** I receive a formatted PDF within 30 seconds containing: portfolio health overview, top opportunities, risk alerts, key metrics vs. benchmarks, and recommended actions.

2. **Given** the report is generated, **When** I review it, **Then** all charts and metrics are presentation-ready with professional formatting suitable for board distribution.

3. **Given** I want to customize the report, **When** I access report settings, **Then** I can select which sections to include, add custom commentary, and brand with institution logo.

4. **Given** I need regular reports, **When** I set up a schedule, **Then** the system emails me updated reports weekly/monthly automatically.

---

### User Story 10 - View Anomaly and Opportunity Alerts (Priority: P2)

As a **Director of Prospect Research**, I want to be alerted to unusual patterns and emerging opportunities so that we can act on signals that would otherwise be missed.

**Why this priority**: Demonstrates proactive AI value — the system is watching even when users aren't. Surfaces opportunities and risks that manual review would miss.

**Independent Test**: Can be fully tested by reviewing alert feed. Delivers value by highlighting actionable anomalies automatically.

**Acceptance Scenarios**:

1. **Given** the system has analyzed data, **When** I view the Alerts panel, **Then** I see flagged anomalies: upgrade opportunities (increased engagement, capacity signals), risk alerts (sudden disengagement), and unusual patterns.

2. **Given** an alert is displayed, **When** I click for details, **Then** I see the specific pattern detected and why it's significant: "Dr. Williams visited giving page 4 times this week (previous: 0 visits/month). Similar behavior preceded gifts 67% of the time."

3. **Given** I review an alert, **When** I mark it as "Acted on" or "Dismissed", **Then** the system learns from my feedback to improve future alert relevance.

---

### User Story 11 - Portfolio Balance Assessment (Priority: P2)

As a **Director of Advancement Services**, I want to see how portfolios are balanced across gift officers so that I can identify overloaded staff and underserved prospects.

**Why this priority**: Addresses burnout crisis (46% turnover) by making workload imbalances visible. Sets up Phase 3 optimization features.

**Independent Test**: Can be fully tested by viewing portfolio distribution visualizations. Delivers value by quantifying workload imbalances.

**Acceptance Scenarios**:

1. **Given** portfolio assignments exist in the data, **When** I view Portfolio Balance, **Then** I see each gift officer's portfolio size, total capacity managed, and engagement status distribution.

2. **Given** imbalances exist, **When** the system analyzes portfolios, **Then** it flags issues: "Sarah manages 187 prospects (team avg: 142). 34% of her portfolio has no contact in 12+ months."

3. **Given** I identify an overloaded portfolio, **When** I click "Suggest Rebalancing", **Then** the system recommends specific prospects to reassign based on capacity and affinity matching (preview only in Phase 1).

---

### Edge Cases

- **What happens when CSV has unexpected date formats?** System attempts auto-detection of common formats (ISO, US, European) and allows manual format specification if detection fails.
- **How does the system handle duplicate records?** Fuzzy matching identifies potential duplicates based on name + email + address; user confirms merge or marks as distinct.
- **What if a user uploads competitor/different institution data?** Organization isolation via row-level security ensures data is never visible across tenants; anomaly detection flags unusual patterns for admin review.
- **How does prediction work with limited history?** System adjusts confidence levels and clearly indicates when predictions have low confidence due to insufficient data (e.g., <12 months of history).
- **What if the AI generates incorrect donor brief content?** All facts are sourced from uploaded data only (no external hallucination); citations shown for verification; user can flag errors for correction.
- **What happens when required columns are missing?** System provides clear mapping interface showing required vs. available fields, suggests alternatives, and allows proceeding with partial data while noting limitations.
- **How are large file uploads handled?** Background processing with progress indication; email notification on completion; session can be safely closed during processing.
- **What happens when AI service is unavailable?** System displays cached/stale AI-generated content (briefs, predictions, recommendations) with a visible warning indicating data may not be current; core navigation and data viewing remain functional.

---

## Requirements *(mandatory)*

### Functional Requirements

**Data Ingestion**
- **FR-001**: System MUST accept CSV uploads up to 500MB containing constituent, gift, and contact data
- **FR-002**: System MUST parse common CRM export formats (Blackbaud RE NXT, Salesforce NPSP) with field auto-mapping
- **FR-003**: System MUST validate data integrity and report parsing errors with line-level detail
- **FR-004**: System MUST support incremental updates without requiring full re-upload
- **FR-005**: System MUST handle date format auto-detection for common formats (ISO, US MM/DD/YYYY, European DD/MM/YYYY)
- **FR-031**: System MUST require a CRM ID column as the unique identifier for constituents to enable accurate record matching across uploads

**Analysis & Scoring**
- **FR-006**: System MUST calculate data health scores across completeness, freshness, consistency, and coverage dimensions
- **FR-007**: System MUST generate donor lapse risk predictions with probability scores (high/medium/low) and explainable factors
- **FR-008**: System MUST generate prospect prioritization scores using capacity, likelihood, timing, and recency signals
- **FR-009**: System MUST provide confidence levels for all predictions indicating data sufficiency
- **FR-032**: System MUST automatically recalculate all predictions (lapse risk, prioritization scores) when new data is uploaded

**AI Features**
- **FR-010**: System MUST generate donor briefs from uploaded data within 10 seconds
- **FR-011**: System MUST process natural language queries and return relevant results within 5 seconds
- **FR-012**: System MUST generate next-best-action recommendations based on donor state and context
- **FR-013**: System MUST detect anomalies and surface alerts for unusual patterns
- **FR-014**: System MUST generate executive reports in PDF format on demand within 30 seconds
- **FR-034**: System MUST display cached/stale AI-generated content with a visible warning when AI service is unavailable

**Explainability & Governance**
- **FR-015**: System MUST provide human-readable explanations for all AI predictions and recommendations
- **FR-016**: System MUST cite data sources for all generated content (no hallucination from external sources)
- **FR-017**: System MUST log all AI-generated outputs for audit purposes
- **FR-018**: System MUST allow users to provide feedback on predictions for model improvement

**Multi-Tenancy & Access Control**
- **FR-019**: System MUST isolate all data by organization with no cross-tenant visibility (via row-level security)
- **FR-020**: System MUST support role-based access control: Admin (full), Manager (view all), Gift Officer (own portfolio), Viewer (read-only)
- **FR-021**: System MUST support email/password authentication with secure password hashing
- **FR-022**: System MUST require email verification before account activation (24-hour token expiry)
- **FR-023**: System MUST support password reset via secure email link (1-hour token expiry)
- **FR-024**: System MUST send transactional emails for verification and password reset
- **FR-025**: System MUST maintain audit logs of user actions and data access
- **FR-029**: System MUST retain organization data indefinitely until admin requests deletion
- **FR-030**: System MUST allow admins to permanently delete all organization data on request
- **FR-033**: System MUST enforce 24-hour maximum session duration with 30-minute idle timeout

**Portfolio Management**
- **FR-026**: System MUST display portfolio balance metrics across gift officers
- **FR-027**: System MUST identify and flag portfolio imbalances with specific recommendations
- **FR-028**: System MUST support filtering views by gift officer assignment

---

### Key Entities

- **Organization**: Institution account with settings (name, logo, branding) and user management. Root entity for multi-tenancy isolation.

- **User**: Individual with role (Admin/Manager/Gift Officer/Viewer), authentication credentials, email verification status, and preferences within an organization.

- **DataUpload**: CSV file upload record with parsing status, field mappings, row counts, error details, and processing history.

- **Constituent**: Donor/prospect record identified by CRM ID (unique identifier from source system), with demographics (name, email, address, phone), relationships, affinity indicators, and computed scores (lapse risk, priority).

- **Gift**: Transaction record with amount, date, designation (fund/campaign), gift type, and attribution to constituent.

- **Contact**: Interaction record (meeting, call, email, event attendance) with date, type, notes, outcome, and gift officer attribution.

- **Prediction**: AI-generated score (lapse risk, prioritization) with confidence level, explainable factors, and timestamp.

- **Alert**: System-generated notification for anomaly or opportunity detection with pattern description, significance, and action status.

- **Brief**: AI-generated donor document with sections (giving history, relationship highlights, conversation starters, recommended ask), citations, and export status.

- **Query**: Natural language question with interpreted parameters, results, and optional saved name for reuse.

- **AuditLog**: Record of user actions and data access for compliance and security review.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload CRM data and view health dashboard within 15 minutes of first login
- **SC-002**: Donor briefs generate in under 10 seconds with 95%+ factual accuracy (no hallucination from external sources)
- **SC-003**: Natural language queries return relevant results for 80%+ of common advancement questions
- **SC-004**: Lapse risk predictions achieve 70%+ accuracy when validated against historical outcomes
- **SC-005**: Executive reports generate in under 30 seconds and are rated "board-ready" by 80%+ of VP users
- **SC-006**: Gift officers report 50%+ reduction in meeting prep time when using donor briefs
- **SC-007**: 90%+ of AI recommendations include clear, understandable explanations
- **SC-008**: System supports 100 concurrent users per organization without degradation
- **SC-009**: Page load time under 2 seconds for all dashboards
- **SC-010**: CSV processing handles minimum 10,000 records per minute

### Business Metrics

- **SC-011**: 50%+ of diagnostic customers convert to Phase 2 subscription
- **SC-012**: Net Promoter Score of 50+ from Phase 1 users
- **SC-013**: Average time from signup to first insight delivery under 1 day

---

## Assumptions

1. **CSV Format Standardization**: Major CRM platforms (Blackbaud RE NXT, Salesforce NPSP) have relatively stable export formats that can be reliably parsed with a field mapping approach.

2. **Data Availability**: Institutions have at least 12 months of giving and contact history available for meaningful predictions. Lower data availability will result in lower confidence scores.

3. **User Technical Capability**: Users can export CSV files from their existing CRM systems. The system does not need to provide CRM export guidance.

4. **Email Deliverability**: Transactional emails (verification, password reset) will be delivered reliably. Users with email delivery issues can contact support.

5. **Portfolio Assignments**: Gift officer to prospect assignments are included in the CRM export data. If not available, portfolio-based features will be limited.

6. **Browser Compatibility**: Users access the system via modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions).

7. **Enterprise Sales Model**: Phase 1 is sold as a one-time diagnostic ($2,500-$10,000), not as a self-service product. Initial organizations will be onboarded with support.

---

## Clarifications

### Session 2026-01-25

- Q: What is the data retention policy for organization data? → A: Indefinite retention with admin-controlled deletion
- Q: How should the system identify constituent uniqueness across uploads? → A: CRM ID column required as unique identifier
- Q: When should predictions (lapse risk, prioritization) be recalculated? → A: On each new data upload only
- Q: What is the session timeout policy? → A: 24-hour session with 30-minute idle timeout
- Q: How should the system behave when AI service is unavailable? → A: Show cached/stale data with warning

---

## Out of Scope (Phase 1)

- **CRM Integration**: Real-time bi-directional sync with Blackbaud/Salesforce (Phase 2)
- **SSO/SAML Authentication**: Enterprise SSO via SAML 2.0/OIDC (Phase 2)
- **Automated Delivery**: Email/Slack/Teams priority delivery (Phase 2)
- **Outcome Tracking**: Recommendation → meeting → gift attribution (Phase 2)
- **Campaign Forecasting**: Predictive revenue projections (Phase 3)
- **Portfolio Optimization**: AI-powered reassignment recommendations with execution (Phase 3)
- **Cross-Institution Benchmarking**: Anonymized peer comparisons (Phase 3)
- **Multi-Unit Management**: Sub-organization hierarchies (Phase 3)
