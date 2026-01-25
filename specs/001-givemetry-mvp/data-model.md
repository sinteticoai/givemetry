# Data Model: GiveMetry MVP (Phase 1)

**Branch**: `001-givemetry-mvp` | **Date**: 2026-01-25

This document defines the complete data model for GiveMetry Phase 1, derived from the feature specification and architecture.

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐                                 │
│  │ Organization │◄────────│     User     │                                 │
│  │              │ 1    N  │              │                                 │
│  │  - id        │         │  - id        │                                 │
│  │  - name      │         │  - email     │                                 │
│  │  - slug      │         │  - role      │                                 │
│  │  - settings  │         │  - orgId     │                                 │
│  └──────┬───────┘         └──────────────┘                                 │
│         │                                                                   │
│         │ 1                                                                 │
│         │                                                                   │
│         ▼ N                                                                 │
│  ┌──────────────┐                                                          │
│  │  Constituent │◄─────────────────────────────────────────┐               │
│  │              │                                          │               │
│  │  - id        │                                          │               │
│  │  - externalId│         ┌──────────────┐                │               │
│  │  - orgId     │◄────────│    Gift      │                │               │
│  │  - name      │  1    N │              │                │               │
│  │  - scores    │         │  - id        │                │               │
│  └──────┬───────┘         │  - amount    │                │               │
│         │                 │  - date      │                │               │
│         │                 └──────────────┘                │               │
│         │                                                  │               │
│         │                 ┌──────────────┐                │               │
│         │◄────────────────│   Contact    │                │               │
│         │           1   N │              │                │               │
│         │                 │  - id        │                │               │
│         │                 │  - type      │                │               │
│         │                 │  - date      │                │               │
│         │                 └──────────────┘                │               │
│         │                                                  │               │
│         │                 ┌──────────────┐                │               │
│         │◄────────────────│  Prediction  │                │               │
│         │           1   N │              │                │               │
│         │                 │  - id        │                │               │
│         │                 │  - type      │                │               │
│         │                 │  - score     │                │               │
│         │                 └──────────────┘                │               │
│         │                                                  │               │
│         │                 ┌──────────────┐                │               │
│         │◄────────────────│    Alert     │                │               │
│         │           1   N │              │                │               │
│         │                 │  - id        │                │               │
│         │                 │  - type      │                │               │
│         │                 │  - severity  │                │               │
│         │                 └──────────────┘                │               │
│         │                                                  │               │
│         │                 ┌──────────────┐                │               │
│         └─────────────────│    Brief     │────────────────┘               │
│                     1   N │              │  N   1                          │
│                           │  - id        │─────► User                      │
│                           │  - content   │                                 │
│                           └──────────────┘                                 │
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│  │    Upload    │         │    Query     │         │   AuditLog   │       │
│  │              │         │              │         │              │       │
│  │  - id        │         │  - id        │         │  - id        │       │
│  │  - orgId     │         │  - orgId     │         │  - orgId     │       │
│  │  - status    │         │  - queryText │         │  - action    │       │
│  │  - progress  │         │  - savedName │         │  - details   │       │
│  └──────────────┘         └──────────────┘         └──────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Entity Definitions

### Organization

Root entity for multi-tenancy. All tenant data is isolated by organization.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | String | Required, max 255 | Institution name |
| slug | String | Unique, lowercase | URL-safe identifier |
| settings | JSON | Default {} | Organization preferences |
| features | JSON | Default {} | Enabled feature flags |
| plan | String | Default "trial" | Subscription tier |
| planExpiresAt | DateTime | Nullable | Subscription expiry |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Validation Rules**:
- slug must be lowercase alphanumeric with hyphens
- name cannot be empty

---

### User

Individual user account within an organization.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organizationId | UUID | FK, Required | Parent organization |
| email | String | Unique, Required | Login email |
| passwordHash | String | Nullable | bcrypt hash (null if SSO) |
| emailVerified | DateTime | Nullable | Verification timestamp |
| name | String | Nullable | Display name |
| role | Enum | Required | admin, manager, gift_officer, viewer |
| preferences | JSON | Default {} | User preferences |
| lastLoginAt | DateTime | Nullable | Last login timestamp |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Roles**:
| Role | Permissions |
|------|-------------|
| admin | Full access: users, settings, data, all features |
| manager | View all portfolios, generate reports, limited config |
| gift_officer | Own portfolio only, generate briefs |
| viewer | Read-only dashboards |

**Validation Rules**:
- email must be valid email format
- password minimum 8 characters, requires complexity (enforced at application layer)

---

### Upload

CSV file upload and processing record.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organizationId | UUID | FK, Required | Parent organization |
| userId | UUID | FK, Required | Uploading user |
| filename | String | Required | Original filename |
| fileSize | Int | Nullable | Size in bytes |
| fileHash | String | Nullable | SHA-256 for deduplication |
| storagePath | String | Nullable | S3/R2 path |
| status | Enum | Required | queued, processing, completed, failed, completed_with_errors |
| rowCount | Int | Nullable | Total rows detected |
| processedCount | Int | Nullable | Rows processed |
| errorCount | Int | Nullable | Rows with errors |
| errors | JSON | Nullable | Array of error details |
| progress | Int | Default 0 | 0-100 percentage |
| fieldMapping | JSON | Nullable | Column to field mapping |
| startedAt | DateTime | Nullable | Processing start |
| completedAt | DateTime | Nullable | Processing end |
| createdAt | DateTime | Auto | Creation timestamp |

**Status Transitions**:
```
queued → processing → completed
                   → failed
                   → completed_with_errors
```

---

### Constituent

Donor/prospect record. Central entity for advancement data.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Internal unique identifier |
| organizationId | UUID | FK, Required | Parent organization |
| externalId | String | Required | CRM system ID (uniqueness key) |
| externalSource | String | Nullable | blackbaud, salesforce, csv |
| prefix | String | Nullable | Mr., Mrs., Dr., etc. |
| firstName | String | Nullable | First name |
| middleName | String | Nullable | Middle name |
| lastName | String | Required | Last name |
| suffix | String | Nullable | Jr., III, etc. |
| email | String | Nullable | Primary email |
| phone | String | Nullable | Primary phone |
| addressLine1 | String | Nullable | Street address |
| addressLine2 | String | Nullable | Unit/Suite |
| city | String | Nullable | City |
| state | String | Nullable | State/Province |
| postalCode | String | Nullable | ZIP/Postal code |
| country | String | Nullable | Country |
| constituentType | String | Nullable | alumni, parent, friend, etc. |
| classYear | Int | Nullable | Graduation year |
| schoolCollege | String | Nullable | School/College affiliation |
| estimatedCapacity | Decimal | Nullable | Wealth indicator |
| capacitySource | String | Nullable | Source of capacity data |
| capacityUpdatedAt | DateTime | Nullable | When capacity was updated |
| assignedOfficerId | String | Nullable | Gift officer user ID |
| portfolioTier | String | Nullable | major, principal, leadership |
| lapseRiskScore | Decimal | Nullable | 0.0000-1.0000 |
| lapseRiskFactors | JSON | Nullable | Explanation factors |
| priorityScore | Decimal | Nullable | 0.0000-1.0000 |
| priorityFactors | JSON | Nullable | Explanation factors |
| engagementScore | Decimal | Nullable | 0.0000-1.0000 |
| dataQualityScore | Decimal | Nullable | 0.0000-1.0000 |
| isActive | Boolean | Default true | Soft delete flag |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Unique Constraint**: (organizationId, externalId, externalSource)

**Indexes**:
- organizationId (tenant queries)
- (organizationId, priorityScore DESC) (priority lists)
- (organizationId, lapseRiskScore DESC) (lapse risk lists)
- assignedOfficerId (portfolio queries)

---

### Gift

Financial transaction record.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organizationId | UUID | FK, Required | Parent organization |
| constituentId | UUID | FK, Required | Donor reference |
| externalId | String | Nullable | CRM gift ID |
| amount | Decimal(15,2) | Required | Gift amount |
| giftDate | Date | Required | Gift date |
| giftType | String | Nullable | cash, pledge, planned, in-kind |
| fundName | String | Nullable | Designated fund |
| fundCode | String | Nullable | Fund code |
| campaign | String | Nullable | Campaign name |
| appeal | String | Nullable | Appeal code |
| recognitionAmount | Decimal | Nullable | Recognition credit |
| isAnonymous | Boolean | Default false | Anonymous gift flag |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Indexes**:
- organizationId
- constituentId
- giftDate DESC

---

### Contact

Interaction/activity record.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organizationId | UUID | FK, Required | Parent organization |
| constituentId | UUID | FK, Required | Constituent reference |
| userId | UUID | FK, Nullable | Staff member who made contact |
| contactType | String | Required | meeting, call, email, event, letter |
| contactDate | Date | Required | Contact date |
| subject | String | Nullable | Contact subject |
| notes | Text | Nullable | Contact notes |
| outcome | String | Nullable | positive, neutral, negative, no_response |
| nextAction | String | Nullable | Recommended follow-up |
| nextActionDate | Date | Nullable | Follow-up deadline |
| createdAt | DateTime | Auto | Creation timestamp |
| updatedAt | DateTime | Auto | Last update timestamp |

**Indexes**:
- organizationId
- constituentId
- contactDate DESC

---

### Prediction

AI-generated score and explanation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organizationId | UUID | FK, Required | Parent organization |
| constituentId | UUID | FK, Required | Constituent reference |
| predictionType | String | Required | lapse_risk, priority, upgrade_likelihood |
| score | Decimal(5,4) | Required | 0.0000-1.0000 |
| confidence | Decimal(5,4) | Required | 0.0000-1.0000 |
| factors | JSON | Required | Explanation factors array |
| modelVersion | String | Nullable | Model version identifier |
| isCurrent | Boolean | Default true | Latest prediction flag |
| createdAt | DateTime | Auto | Creation timestamp |

**Factors JSON Schema**:
```json
{
  "factors": [
    {
      "name": "recency",
      "value": "18 months since last gift",
      "impact": "high",
      "weight": 0.30
    }
  ]
}
```

**Indexes**:
- organizationId
- constituentId
- (organizationId, predictionType, isCurrent)

---

### Alert

System-generated notification for anomalies.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organizationId | UUID | FK, Required | Parent organization |
| constituentId | UUID | FK, Required | Constituent reference |
| alertType | String | Required | lapse_risk, upgrade_opportunity, anomaly |
| severity | String | Required | high, medium, low |
| title | String | Required | Alert headline |
| description | Text | Nullable | Detailed description |
| factors | JSON | Nullable | Contributing factors |
| status | String | Default "active" | active, dismissed, acted_on |
| actedOnAt | DateTime | Nullable | When action was taken |
| actedOnBy | String | Nullable | User who acted |
| createdAt | DateTime | Auto | Creation timestamp |

**Indexes**:
- organizationId
- (organizationId, status)

---

### Brief

AI-generated donor document.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organizationId | UUID | FK, Required | Parent organization |
| constituentId | UUID | FK, Required | Constituent reference |
| userId | UUID | FK, Required | Requesting user |
| content | JSON | Required | Structured brief content |
| citations | JSON | Required | Source citations |
| promptTokens | Int | Nullable | AI tokens used (prompt) |
| completionTokens | Int | Nullable | AI tokens used (completion) |
| modelUsed | String | Nullable | AI model identifier |
| createdAt | DateTime | Auto | Creation timestamp |

**Content JSON Schema**:
```json
{
  "summary": {
    "text": "Dr. Smith is a loyal Engineering alumnus...",
    "citations": [...]
  },
  "givingHistory": {
    "text": "...",
    "totalLifetime": 125000,
    "citations": [...]
  },
  "relationshipHighlights": {...},
  "conversationStarters": {...},
  "recommendedAsk": {...}
}
```

---

### NaturalLanguageQuery

Saved natural language queries.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organizationId | UUID | FK, Required | Parent organization |
| userId | UUID | FK, Required | Query creator |
| queryText | Text | Required | Original query text |
| interpretedQuery | JSON | Nullable | Parsed query structure |
| resultCount | Int | Nullable | Number of results |
| resultIds | String[] | Nullable | Result constituent IDs |
| savedName | String | Nullable | User-defined name |
| wasHelpful | Boolean | Nullable | User feedback |
| feedback | String | Nullable | Feedback text |
| createdAt | DateTime | Auto | Creation timestamp |

---

### AuditLog

Compliance and security audit trail.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigInt | PK, Auto | Sequential identifier |
| organizationId | UUID | Nullable | Organization context |
| userId | UUID | Nullable | Acting user |
| action | String | Required | Action identifier |
| resourceType | String | Nullable | Entity type |
| resourceId | String | Nullable | Entity ID |
| details | JSON | Nullable | Additional context |
| ipAddress | String | Nullable | Client IP |
| userAgent | String | Nullable | Client user agent |
| createdAt | DateTime | Auto | Timestamp |

**Audited Actions**:
- user.login, user.logout, user.password_reset
- upload.create, upload.complete, upload.failed
- brief.generate
- report.generate
- constituent.view, constituent.update
- settings.change
- user.invite, user.role_change
- data.delete (admin deletion)

**Indexes**:
- (organizationId, createdAt)

---

### VerificationToken

Email verification tokens (NextAuth).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| identifier | String | Required | User email |
| token | String | Unique | Verification token |
| expires | DateTime | Required | Expiry (24 hours) |

**Unique Constraint**: (identifier, token)

---

### PasswordResetToken

Password reset tokens.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| email | String | Required | User email |
| token | String | Unique | Reset token |
| expires | DateTime | Required | Expiry (1 hour) |
| createdAt | DateTime | Auto | Creation timestamp |

**Indexes**:
- email

---

## Row-Level Security (RLS)

All tenant tables enforce isolation via PostgreSQL RLS policies:

```sql
-- Enable RLS
ALTER TABLE constituents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
-- ... all tenant tables

-- Create policy
CREATE POLICY tenant_isolation ON constituents
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID)
  WITH CHECK (organization_id = current_setting('app.current_org_id')::UUID);
```

**Prisma Middleware** sets the organization context on every query via `getTenantPrisma(organizationId)`.

---

## Vector Storage (Semantic Search)

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column
ALTER TABLE constituents ADD COLUMN embedding vector(1536);

-- Create HNSW index for fast similarity search
CREATE INDEX idx_constituents_embedding ON constituents
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
```

Used for:
- Semantic natural language queries
- Similar donor matching
- Affinity pattern detection

---

## State Transitions

### Upload Status
```
┌─────────┐     ┌────────────┐     ┌───────────┐
│ queued  │────►│ processing │────►│ completed │
└─────────┘     └────────────┘     └───────────┘
                      │                   ▲
                      │                   │
                      ▼                   │
                ┌──────────┐    ┌─────────────────────┐
                │  failed  │    │ completed_with_errors│
                └──────────┘    └─────────────────────┘
```

### Alert Status
```
┌────────┐     ┌───────────┐
│ active │────►│ dismissed │
└────────┘     └───────────┘
     │
     │         ┌───────────┐
     └────────►│ acted_on  │
               └───────────┘
```

### Prediction Currency
```
When new upload processed:
1. Mark all existing predictions: isCurrent = false
2. Generate new predictions: isCurrent = true
3. Old predictions retained for historical comparison
```

---

## Data Retention

Per clarification session (2026-01-25):
- Organization data retained **indefinitely**
- Admin can request **permanent deletion**
- Audit logs retained per compliance requirements (default: 7 years)

Deletion cascade:
```
Organization DELETE →
  Users DELETE →
  Constituents DELETE →
    Gifts DELETE
    Contacts DELETE
    Predictions DELETE
    Alerts DELETE
    Briefs DELETE
  Uploads DELETE
  Queries DELETE
  AuditLogs RETAIN (anonymized)
```

---

## Migration Strategy

1. Initial migration creates all tables with RLS policies
2. Seed script creates demo organization + test data
3. Each schema change requires migration + RLS policy review
4. Production: Railway applies migrations on deploy

---

*This data model implements the GiveMetry MVP specification entities with multi-tenant isolation and audit compliance.*
