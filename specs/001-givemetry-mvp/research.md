# Research: GiveMetry MVP (Phase 1)

**Branch**: `001-givemetry-mvp` | **Date**: 2026-01-25

This document captures technical research and decisions made during planning.

---

## 1. CSV Parsing Strategy

### Decision: Papa Parse with streaming

**Rationale**:
- Handles files up to 500MB without memory issues via streaming
- Browser-compatible for client-side preview before upload
- Well-maintained, TypeScript support
- Supports worker threads for non-blocking parsing

**Alternatives Considered**:
| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| Papa Parse | Streaming, browser+Node, popular | Slightly slower than native | **Selected** |
| csv-parse | Faster, Node native | No browser support | Rejected (need preview) |
| fast-csv | Good performance | Less streaming control | Rejected |
| d3-dsv | Lightweight | No streaming | Rejected (file size) |

**Implementation Notes**:
```typescript
// Server-side streaming for large files
import { createReadStream } from 'fs';
import Papa from 'papaparse';

const parser = Papa.parse(createReadStream(filePath), {
  header: true,
  skipEmptyLines: true,
  chunk: (results, parser) => {
    // Process in 1000-row chunks
    processChunk(results.data);
  },
  complete: () => { /* finalize */ }
});
```

---

## 2. Date Format Detection

### Decision: chrono-node + explicit format patterns

**Rationale**:
- chrono-node handles natural language dates ("January 5, 2024")
- Explicit patterns for ISO, US, European formats
- Fallback UI for manual format specification

**Detection Order**:
1. ISO 8601 (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ss`)
2. US format (`MM/DD/YYYY`, `M/D/YY`)
3. European format (`DD/MM/YYYY`, `D/M/YY`)
4. Natural language (chrono-node)
5. Prompt user for format

**Implementation**:
```typescript
import * as chrono from 'chrono-node';
import { parse, isValid } from 'date-fns';

const DATE_FORMATS = [
  'yyyy-MM-dd',           // ISO
  'MM/dd/yyyy',           // US
  'M/d/yyyy',
  'dd/MM/yyyy',           // European
  'd/M/yyyy',
  'yyyy-MM-dd HH:mm:ss',  // ISO with time
];

function detectDateFormat(sample: string[]): string | null {
  for (const format of DATE_FORMATS) {
    const valid = sample.every(s => isValid(parse(s, format, new Date())));
    if (valid) return format;
  }
  // Try chrono for natural language
  const chronoParsed = sample.map(s => chrono.parseDate(s));
  if (chronoParsed.every(d => d !== null)) return 'chrono';
  return null; // Prompt user
}
```

---

## 3. Lapse Risk Prediction Model

### Decision: Rule-based scoring for MVP

**Rationale**:
- Faster to implement than ML model
- Fully explainable (constitution requirement)
- Can be validated against historical data
- Path to ML enhancement in Phase 2

**Scoring Factors**:
| Factor | Weight | Calculation |
|--------|--------|-------------|
| Recency | 30% | Months since last gift (normalized) |
| Frequency | 25% | Gift count trend (increasing/decreasing) |
| Monetary | 20% | Gift amount trend |
| Contact | 15% | Months since last contact |
| Pattern | 10% | Comparison to similar donors |

**Risk Thresholds**:
- High: Score > 0.7 (70%+ lapse probability)
- Medium: Score 0.4-0.7
- Low: Score < 0.4

**Explainability Output**:
```json
{
  "score": 0.78,
  "risk": "high",
  "confidence": 0.85,
  "factors": [
    { "name": "recency", "value": "18 months since last gift", "impact": "high" },
    { "name": "frequency", "value": "Declined from annual to none", "impact": "high" },
    { "name": "contact", "value": "14 months since last contact", "impact": "medium" },
    { "name": "pattern", "value": "73% of similar donors lapsed", "impact": "medium" }
  ]
}
```

---

## 4. Priority Scoring Model

### Decision: Weighted composite formula

**Rationale**:
- Transparent calculation users can understand
- Adjustable weights per organization
- Four-factor model (CLTR: Capacity, Likelihood, Timing, Recency)

**Formula**:
```
Priority = (C × wC) + (L × wL) + (T × wT) + (R × wR)

Where:
- C = Capacity score (0-1) from wealth indicators
- L = Likelihood score (0-1) inverse of lapse risk
- T = Timing score (0-1) fiscal year position, campaign alignment
- R = Recency score (0-1) recent engagement indicators

Default weights: wC=0.3, wL=0.25, wT=0.25, wR=0.2
```

**Capacity Scoring**:
| Estimated Capacity | Score |
|-------------------|-------|
| $1M+ | 1.0 |
| $500K-$1M | 0.9 |
| $250K-$500K | 0.8 |
| $100K-$250K | 0.7 |
| $50K-$100K | 0.6 |
| $25K-$50K | 0.5 |
| $10K-$25K | 0.4 |
| <$10K | 0.3 |
| Unknown | 0.5 |

---

## 5. Natural Language Query Parsing

### Decision: Claude function calling

**Rationale**:
- Structured output via function calling
- High accuracy on advancement domain queries
- Can explain interpretation back to user
- Handles ambiguity gracefully

**Function Schema**:
```typescript
const queryFunctionSchema = {
  name: "search_constituents",
  description: "Search constituent database based on criteria",
  parameters: {
    type: "object",
    properties: {
      filters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string", enum: ["total_giving", "last_gift_date", "last_contact_date", "lapse_risk", "priority_score", "capacity", "constituent_type", "assigned_officer"] },
            operator: { type: "string", enum: ["eq", "gt", "gte", "lt", "lte", "between", "in", "contains"] },
            value: { type: "any" }
          }
        }
      },
      sort: {
        type: "object",
        properties: {
          field: { type: "string" },
          direction: { type: "string", enum: ["asc", "desc"] }
        }
      },
      limit: { type: "number", default: 50 }
    }
  }
};
```

**Example Query Translation**:
```
Input: "Show me donors who gave $10K+ last year but haven't been contacted in 6 months"

Output:
{
  "filters": [
    { "field": "total_giving", "operator": "gte", "value": 10000, "period": "last_fiscal_year" },
    { "field": "last_contact_date", "operator": "lt", "value": "6_months_ago" }
  ],
  "sort": { "field": "total_giving", "direction": "desc" }
}

Human-readable: "Showing: Donors with total giving >= $10,000 in FY2025 AND last contact date < July 2025"
```

---

## 6. Donor Brief Generation

### Decision: Claude with structured prompting

**Rationale**:
- Best explanation quality for advancement domain
- Can enforce citation requirements
- Handles varied donor profiles well

**Brief Structure**:
```typescript
interface DonorBrief {
  summary: {
    text: string;
    citations: Citation[];
  };
  givingHistory: {
    text: string;
    totalLifetime: number;
    recentGifts: GiftSummary[];
    citations: Citation[];
  };
  relationshipHighlights: {
    text: string;
    keyContacts: ContactSummary[];
    citations: Citation[];
  };
  conversationStarters: {
    items: string[];
    citations: Citation[];
  };
  recommendedAsk: {
    amount: number;
    purpose: string;
    rationale: string;
    citations: Citation[];
  };
}

interface Citation {
  text: string;
  source: "gift" | "contact" | "profile" | "prediction";
  sourceId: string;
  date?: string;
}
```

**Prompt Template**:
```
You are generating a donor brief for a university advancement officer.

CRITICAL RULES:
1. ONLY use facts from the provided data. Never invent or assume information.
2. Every factual statement MUST include a citation to the source data.
3. If information is missing, say "No data available" - never guess.

DONOR DATA:
{constituentData}

GIVING HISTORY:
{giftsData}

CONTACT HISTORY:
{contactsData}

Generate a professional one-page donor brief with the following sections:
1. Executive Summary (2-3 sentences)
2. Giving History Summary
3. Relationship Highlights
4. Conversation Starters (3-4 items)
5. Recommended Ask (amount and purpose with rationale)

Respond in the specified JSON format with citations for each section.
```

---

## 7. PDF Report Generation

### Decision: @react-pdf/renderer

**Rationale**:
- React-based (consistent with stack)
- Server-side rendering capability
- Professional output quality
- Good chart integration via SVG

**Alternatives Considered**:
| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| @react-pdf/renderer | React, SSR, good quality | Learning curve | **Selected** |
| Puppeteer/Playwright | HTML to PDF | Heavy, slow | Rejected |
| pdfkit | Fast, low-level | Manual layout | Rejected |
| jsPDF | Browser-native | Poor styling | Rejected |

**Report Template Structure**:
```tsx
const ExecutiveReport = ({ data }: ReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Header logo={data.orgLogo} title="Advancement Health Report" />

      <Section title="Portfolio Health Overview">
        <HealthScoreCard scores={data.healthScores} />
        <TrendChart data={data.trends} />
      </Section>

      <Section title="Top Opportunities">
        <OpportunityTable prospects={data.topProspects} />
      </Section>

      <Section title="Risk Alerts">
        <AlertList alerts={data.lapseRisks} />
      </Section>

      <Section title="Key Metrics">
        <MetricsGrid metrics={data.metrics} benchmarks={data.benchmarks} />
      </Section>

      <Section title="Recommended Actions">
        <ActionList actions={data.recommendations} />
      </Section>

      <Footer generatedAt={data.generatedAt} />
    </Page>
  </Document>
);
```

---

## 8. File Storage Strategy

### Decision: S3-compatible (Cloudflare R2)

**Rationale**:
- Cost-effective (no egress fees with R2)
- Railway-compatible
- CDN integration for fast downloads
- S3 API compatibility for flexibility

**Upload Flow**:
1. Client requests presigned upload URL
2. Client uploads directly to R2 (no server bandwidth)
3. Server receives completion webhook
4. Worker processes file from R2

**Implementation**:
```typescript
// Generate presigned upload URL
const uploadUrl = await r2.createPresignedPost({
  Bucket: process.env.R2_BUCKET,
  Key: `uploads/${orgId}/${uploadId}/${filename}`,
  Expires: 3600, // 1 hour
  Conditions: [
    ['content-length-range', 0, 500 * 1024 * 1024], // Max 500MB
    ['eq', '$Content-Type', 'text/csv'],
  ],
});
```

---

## 9. Background Job Processing

### Decision: Database queue + Railway workers

**Rationale**:
- No Redis dependency for MVP
- Sufficient for expected scale (100s of uploads/day)
- Railway has native worker support
- Easy to add BullMQ later if needed

**Job States**:
```
queued → processing → completed
                   ↘ failed
                   ↘ completed_with_errors
```

**Worker Process**:
```typescript
// worker/csv-processor.ts
async function processNextJob() {
  // Claim job atomically
  const job = await prisma.upload.updateMany({
    where: { status: 'queued' },
    data: { status: 'processing', startedAt: new Date() },
    take: 1,
  });

  if (!job) {
    await sleep(5000); // Poll interval
    return;
  }

  try {
    await processUpload(job.id);
  } catch (error) {
    await prisma.upload.update({
      where: { id: job.id },
      data: { status: 'failed', errors: [{ error: error.message }] },
    });
  }
}

// Run worker loop
while (true) {
  await processNextJob();
}
```

---

## 10. Data Health Scoring

### Decision: Four-dimension scoring model

**Dimensions**:

| Dimension | Weight | Measures |
|-----------|--------|----------|
| **Completeness** | 30% | Required fields populated |
| **Freshness** | 25% | Age of data, last update |
| **Consistency** | 25% | Format consistency, duplicates |
| **Coverage** | 20% | Breadth of data types |

**Completeness Scoring**:
```typescript
const REQUIRED_FIELDS = {
  constituent: ['firstName', 'lastName', 'email'],
  gift: ['amount', 'giftDate', 'constituentId'],
  contact: ['contactDate', 'contactType', 'constituentId'],
};

function scoreCompleteness(data: ConstituentData): number {
  const constituentScore = REQUIRED_FIELDS.constituent
    .filter(f => data[f] != null).length / REQUIRED_FIELDS.constituent.length;
  // Similar for gifts, contacts...
  return weightedAverage([constituentScore, giftScore, contactScore]);
}
```

**Freshness Scoring**:
```typescript
function scoreFreshness(data: OrgData): number {
  const lastGiftDate = max(data.gifts.map(g => g.giftDate));
  const lastContactDate = max(data.contacts.map(c => c.contactDate));
  const lastUploadDate = data.lastUpload?.completedAt;

  const monthsSinceGift = differenceInMonths(new Date(), lastGiftDate);
  const monthsSinceContact = differenceInMonths(new Date(), lastContactDate);

  // Score decays with age
  const giftFreshness = Math.max(0, 1 - (monthsSinceGift / 24));
  const contactFreshness = Math.max(0, 1 - (monthsSinceContact / 12));

  return (giftFreshness * 0.6) + (contactFreshness * 0.4);
}
```

---

## 11. Anomaly Detection

### Decision: Statistical + rule-based hybrid

**Anomaly Types**:

| Type | Detection Method | Example |
|------|------------------|---------|
| **Engagement spike** | Z-score on activity frequency | 4x visits vs baseline |
| **Giving pattern change** | Trend deviation | Upgrade/downgrade signals |
| **Contact gap** | Threshold breach | No contact >12 months |
| **Capacity mismatch** | Score comparison | High capacity, low contact |

**Implementation**:
```typescript
interface AnomalyDetector {
  type: string;
  detect(constituent: Constituent, history: HistoricalData): Anomaly | null;
}

const detectors: AnomalyDetector[] = [
  {
    type: 'engagement_spike',
    detect: (c, h) => {
      const recentActivity = countRecentActivity(c, 7); // Last 7 days
      const baseline = h.avgWeeklyActivity;
      const zScore = (recentActivity - baseline) / h.stdDevActivity;
      if (zScore > 2) {
        return {
          type: 'engagement_spike',
          severity: zScore > 3 ? 'high' : 'medium',
          description: `${recentActivity} activities this week (baseline: ${baseline})`,
          confidence: 0.85,
        };
      }
      return null;
    },
  },
  // ... other detectors
];
```

---

## 12. Session Management

### Decision: JWT with idle timeout

**Configuration**:
- Session max age: 24 hours
- Idle timeout: 30 minutes
- Refresh: On each request within idle window
- Storage: httpOnly cookie

**Implementation**:
```typescript
// NextAuth session configuration
session: {
  strategy: 'jwt',
  maxAge: 24 * 60 * 60, // 24 hours
},

// Middleware for idle timeout
export async function middleware(request: NextRequest) {
  const session = await getToken({ req: request });

  if (session) {
    const lastActivity = session.lastActivity as number;
    const idleTimeout = 30 * 60 * 1000; // 30 minutes

    if (Date.now() - lastActivity > idleTimeout) {
      // Session expired due to inactivity
      return NextResponse.redirect('/login?reason=idle');
    }

    // Update last activity
    // Note: Requires custom JWT callback to include lastActivity
  }

  return NextResponse.next();
}
```

---

## Summary

All technical unknowns have been resolved. Key decisions prioritize:
1. **Explainability** - Rule-based models with clear factor explanations
2. **Simplicity** - Proven libraries, no unnecessary infrastructure
3. **Scalability path** - Architecture supports ML models, BullMQ, SSO in later phases
4. **Developer experience** - TypeScript, React patterns, familiar tools

Ready for Phase 1 design artifacts.
