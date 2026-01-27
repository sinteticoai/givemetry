# Phase 1.5: AI-Powered Action Engine

**Version:** 1.0
**Created:** 2026-01-27
**Status:** Draft
**Builds On:** Phase 1 (Advancement Health Assessment)

---

## Executive Summary

Phase 1.5 elevates the Advancement Health Assessment from a **diagnostic report** to an **AI-powered action engine**. Instead of just identifying problems, it generates specific, personalized recommendations that gift officers can act on immediately.

**The shift:**
- Phase 1: "You have 50 at-risk donors"
- Phase 1.5: "Here are your 50 at-risk donors, ranked by save potential, with a personalized outreach script for each"

---

## Value Proposition

**"Not just what's wrong — exactly what to do about it, personalized for each donor."**

| Metric | Phase 1 | Phase 1.5 |
|--------|---------|-----------|
| Time to action | Days (read report, decide what to do) | Minutes (scripts ready to use) |
| Actionability | "Here's what's broken" | "Here's how to fix it" |
| Personalization | None (lists and scores) | AI-generated per donor |
| Projected impact | None | Dollar estimates for action |

---

## Phase 1.5 Features

### 1. Personalized Intervention Scripts

For every at-risk donor, generate a specific outreach recommendation based on their history.

### 2. Portfolio Rebalancing Recommendations

Not just "portfolios are imbalanced" — specific reassignment moves with rationale.

### 3. Projected Impact Modeling

Show estimated dollar impact if recommendations are followed.

### 4. Prioritized Action Queue

Ranked list of highest-impact actions across all categories.

---

## User Scenarios & Testing

### User Story 1.5.1 - Personalized Lapse Prevention Scripts (Priority: P1)

As a **Major Gift Officer**, I want personalized outreach recommendations for at-risk donors so that I know exactly what to say and why, not just who to call.

**Why this priority:** This is the "magic moment" that differentiates GiveMetry. Transforms a report into a tool.

**Independent Test:** Can be fully tested by generating scripts and having gift officers rate usefulness.

**Acceptance Scenarios:**

1. **Given** a donor is flagged as high lapse risk, **When** I view their profile, **Then** I see an AI-generated outreach script that includes:
   - Recommended channel (call, email, handwritten note, in-person)
   - Specific talking points based on their giving history
   - Personal connection hooks (past events attended, interests, relationships)
   - Suggested ask or engagement (not always money)

2. **Given** a donor gave to the engineering school in 2019, **When** the script is generated, **Then** it references relevant recent news: "The new robotics lab you helped fund just won a national competition — perfect reason to reconnect."

3. **Given** a donor has a relationship with a specific faculty member, **When** the script is generated, **Then** it suggests involving that person: "Consider having Dean Williams send a personal note — they were Dr. Chen's thesis advisor."

4. **Given** I want to customize the script, **When** I edit it, **Then** my changes are saved and the system learns my preferences for future scripts.

**Example Output:**

```
DONOR: Dr. Margaret Chen
RISK LEVEL: High (no gift in 18 months, previously gave annually)
RECOMMENDED ACTION: Personal phone call from gift officer

WHY NOW:
- Last gift: $5,000 to Engineering Annual Fund (March 2024)
- Last contact: Thank you letter (April 2024) — no personal touch since
- Recent trigger: Her mentee Dr. Sarah Kim just received tenure (announced last week)

SUGGESTED SCRIPT:
"Dr. Chen, I wanted to personally share some wonderful news — Dr. Sarah Kim,
who you supported through the graduate fellowship program, just received
tenure in the ME department. Your investment in emerging scholars is paying
off. I'd love to tell you more about what she's working on — do you have
15 minutes for coffee next week?"

NEXT STEP: Schedule call for Tuesday AM (her calendar typically open)
```

---

### User Story 1.5.2 - Portfolio Rebalancing Recommendations (Priority: P1)

As a **Director of Advancement Services**, I want specific portfolio reassignment recommendations so that I can act on imbalances immediately rather than figuring out moves myself.

**Why this priority:** Portfolio assessment without action recommendations is just more work. This makes the insight actionable.

**Independent Test:** Can be fully tested by generating recommendations and reviewing rationale.

**Acceptance Scenarios:**

1. **Given** portfolios are analyzed, **When** imbalances are detected, **Then** the system generates specific reassignment recommendations with rationale for each.

2. **Given** Sarah has 180 prospects and Michael has 95, **When** I view recommendations, **Then** I see: "Move these 15 prospects from Sarah to Michael" with a list of specific names and why each is a good match for Michael.

3. **Given** a recommended move, **When** I view the rationale, **Then** I see: "James Morton → Michael: Michael has closed 4 similar Engineering donors; same graduating class; James hasn't responded to Sarah's last 3 outreach attempts."

4. **Given** I disagree with a recommendation, **When** I dismiss it, **Then** I can provide a reason and the system learns for future recommendations.

**Example Output:**

```
PORTFOLIO REBALANCING RECOMMENDATIONS

Current State:
- Sarah Martinez: 182 prospects (121% of target) — OVERLOADED
- Michael Torres: 94 prospects (63% of target) — CAPACITY AVAILABLE
- Jennifer Adams: 156 prospects (104% of target) — SLIGHTLY OVER

Recommended Moves (15 total):

1. James Morton (Sarah → Michael)
   Rationale: Engineering donor, Michael's specialty. No response to
   Sarah's last 3 contacts. Michael closed 4 similar profiles this year.
   Capacity impact: $125K

2. Dr. William Park (Sarah → Michael)
   Rationale: Same graduating class as 3 of Michael's top donors.
   Geographic proximity (Michael covers Northeast).
   Capacity impact: $75K

3. Elizabeth Foster (Sarah → Jennifer)
   Rationale: Arts & Sciences donor, Jennifer's portfolio focus.
   Elizabeth attended 2 events Jennifer hosted.
   Capacity impact: $50K

[... 12 more recommendations ...]

TOTAL CAPACITY IMPACTED: $890K
POST-REBALANCE STATE:
- Sarah: 167 prospects (111%) — Improved
- Michael: 109 prospects (73%) — Better utilized
- Jennifer: 162 prospects (108%) — Slightly increased
```

---

### User Story 1.5.3 - Projected Impact Modeling (Priority: P1)

As a **VP of Advancement**, I want to see the projected dollar impact of following recommendations so that I can prioritize actions and justify investment.

**Why this priority:** Connects recommendations to outcomes. Makes the business case tangible.

**Independent Test:** Can be fully tested by generating projections and explaining methodology.

**Acceptance Scenarios:**

1. **Given** lapse risk donors are identified, **When** I view the summary, **Then** I see projected impact: "50 donors at risk representing $425K in annual giving. If you retain 60% (industry benchmark for targeted outreach), protected revenue: $255K."

2. **Given** portfolio rebalancing is recommended, **When** I view projected impact, **Then** I see: "Recommended moves affect $890K in prospect capacity. Based on historical data, optimized assignments increase close rates by 15-25%."

3. **Given** multiple recommendation categories exist, **When** I view the action summary, **Then** I see a prioritized list by projected ROI: "Highest impact actions this quarter: 1) Retain top 10 at-risk donors ($180K), 2) Reactivate 5 lapsed major donors ($150K), 3) Rebalance portfolios ($89K lift)."

4. **Given** projections are shown, **When** I click for methodology, **Then** I see clear explanation: "Based on: your historical retention rates, industry benchmarks from CASE VSE, and similar institution outcomes."

**Example Output:**

```
PROJECTED IMPACT SUMMARY

If you act on all Phase 1.5 recommendations:

┌─────────────────────────────────────────────────────────┐
│  TOTAL PROJECTED IMPACT: $425K - $680K annually        │
└─────────────────────────────────────────────────────────┘

Breakdown:

1. LAPSE PREVENTION                           $180K - $255K
   50 at-risk donors representing $425K annual giving
   Expected retention with intervention: 60-80%
   Confidence: HIGH (based on your historical data)

2. LAPSED DONOR REACTIVATION                  $75K - $150K
   23 lapsed donors with reactivation potential
   Expected reactivation rate: 15-25%
   Confidence: MEDIUM (limited historical reactivation data)

3. PORTFOLIO OPTIMIZATION                     $89K - $135K
   Rebalancing affects $890K in prospect capacity
   Expected lift from optimized assignments: 10-15%
   Confidence: MEDIUM (based on industry benchmarks)

4. PRIORITY PROSPECT ACCELERATION             $81K - $140K
   18 ready-to-ask prospects identified
   Accelerated timeline impact
   Confidence: HIGH (based on engagement signals)

Methodology: [Click to expand]
```

---

### User Story 1.5.4 - Unified Action Queue (Priority: P2)

As a **Major Gift Officer**, I want a single prioritized list of my highest-impact actions so that I know exactly what to focus on this week.

**Why this priority:** Consolidates all recommendations into one actionable view. The "5 names this week" promise.

**Independent Test:** Can be fully tested by generating queue and tracking action rates.

**Acceptance Scenarios:**

1. **Given** I am a gift officer, **When** I view my action queue, **Then** I see my top 5-10 actions for the week, prioritized by impact.

2. **Given** actions come from different categories (lapse risk, ready-to-ask, reactivation), **When** they're combined, **Then** each shows its source and why it's prioritized.

3. **Given** I complete an action, **When** I mark it done, **Then** I can log the outcome and the next action surfaces.

4. **Given** I want to understand prioritization, **When** I view an action, **Then** I see: "This is #3 because: high capacity ($50K+), urgent timing (risk increasing), and strong relationship history."

**Example Output:**

```
YOUR PRIORITY ACTIONS THIS WEEK

1. ⚠️  CALL: Dr. Margaret Chen                    Impact: $50K
   Category: Lapse Prevention (High Risk)
   Why now: Mentee just got tenure — perfect reconnection moment
   Script: [View personalized script]

2. 🎯 MEETING: Robert Williams                    Impact: $100K
   Category: Ready to Ask
   Why now: Engagement score peaked, attended 3 events this quarter
   Suggested ask: Named scholarship ($100K over 5 years)

3. 📞 CALL: Jennifer Martinez                     Impact: $25K
   Category: Reactivation
   Why now: Lapsed 2 years, but opened last 3 emails
   Script: [View personalized script]

4. ✉️  NOTE: David Park                           Impact: $35K
   Category: Stewardship (Retention)
   Why now: Anniversary of first major gift next week
   Suggested: Handwritten note from President

5. ☕ COFFEE: Sarah Thompson                      Impact: $75K
   Category: Cultivation
   Why now: New board member at company she founded
   Talking points: [View briefing]

─────────────────────────────────────────────────
WEEKLY SUMMARY
Actions completed: 0/5
Projected impact if completed: $285K pipeline influenced
```

---

## Phase 1.5 Requirements

### Functional Requirements

**Personalized Scripts**
- **FR-151**: System MUST generate personalized outreach scripts for at-risk donors using LLM
- **FR-152**: Scripts MUST incorporate donor history (gifts, events, contacts, interests)
- **FR-153**: Scripts MUST reference relevant recent triggers (news, milestones, announcements)
- **FR-154**: Scripts MUST suggest appropriate channel and timing
- **FR-155**: System MUST allow users to edit and save customized scripts
- **FR-156**: System MUST learn from user edits to improve future scripts

**Portfolio Recommendations**
- **FR-157**: System MUST generate specific portfolio reassignment recommendations
- **FR-158**: Recommendations MUST include rationale based on affinity, capacity, and history
- **FR-159**: System MUST calculate capacity impact of recommended moves
- **FR-160**: System MUST allow users to accept, dismiss, or defer recommendations

**Impact Projections**
- **FR-161**: System MUST calculate projected dollar impact for all recommendations
- **FR-162**: Projections MUST include confidence levels and methodology explanation
- **FR-163**: System MUST aggregate impact across recommendation categories
- **FR-164**: System MUST use historical data + industry benchmarks for projections

**Action Queue**
- **FR-165**: System MUST generate prioritized action queue per gift officer
- **FR-166**: Queue MUST combine actions from all recommendation categories
- **FR-167**: System MUST explain prioritization rationale for each action
- **FR-168**: System MUST allow outcome logging when actions are completed

### Non-Functional Requirements

**AI Quality**
- **NFR-151**: Generated scripts must be rated "useful" by 70%+ of gift officers in testing
- **NFR-152**: Scripts must be generated in under 5 seconds per donor
- **NFR-153**: Scripts must not hallucinate facts not present in donor data

**Privacy**
- **NFR-154**: LLM prompts must not include PII sent to external APIs (use anonymization or local models)
- **NFR-155**: All AI-generated content must be auditable with prompt/response logging

---

## Phase 1.5 Success Criteria

### Measurable Outcomes

- **SC-151**: 70%+ of gift officers rate personalized scripts as "useful" or "very useful"
- **SC-152**: 50%+ of recommended actions are acted upon within 30 days
- **SC-153**: Portfolio rebalancing recommendations are implemented at 40%+ of client institutions
- **SC-154**: Clients report Phase 1.5 as "significantly more valuable" than Phase 1 in post-engagement survey

### Business Metrics

- **SC-155**: Phase 1.5 commands 50-100% price premium over Phase 1 ($5K-$15K vs $2.5K-$10K)
- **SC-156**: 60%+ of Phase 1.5 customers convert to Phase 2 subscription (vs 40% target for Phase 1)
- **SC-157**: NPS for Phase 1.5 is 50+ (vs 30+ target for Phase 1)

---

## Technical Considerations

### LLM Integration

| Consideration | Approach |
|---------------|----------|
| **Model selection** | Claude API for script generation (quality + safety) |
| **Privacy** | Anonymize donor names in prompts; use donor IDs |
| **Cost** | Estimate ~$0.10-0.50 per donor script; budget per engagement |
| **Latency** | Pre-generate scripts during analysis phase; cache results |
| **Hallucination** | Constrain outputs to facts in donor record; add disclaimer |

### Data Requirements

Scripts require rich donor data to be effective:

| Data Element | Required | Impact on Script Quality |
|--------------|----------|-------------------------|
| Giving history | Yes | Core context |
| Contact history | Yes | Relationship understanding |
| Event attendance | Recommended | Personal connection hooks |
| Employment/affiliation | Recommended | Talking points |
| Relationships | Recommended | "Involve Dean Williams" suggestions |
| Interests/notes | Nice to have | Personalization depth |

---

## Phasing Recommendation

### Option A: Full Phase 1.5 (Recommended)

Build all four features before launch:
- Personalized scripts
- Portfolio recommendations
- Impact projections
- Action queue

**Pros:** Complete "wow" experience; maximum differentiation
**Cons:** Longer development time; higher complexity

### Option B: Scripts First

Launch with personalized scripts only, add others later:
1. Ship: Personalized lapse prevention scripts
2. Add: Impact projections
3. Add: Portfolio recommendations
4. Add: Action queue

**Pros:** Faster to market; validate core AI value first
**Cons:** Incremental feeling; may not command full premium

### Recommendation

**Start with Option B (Scripts First)** but design architecture for full Phase 1.5. The personalized scripts are the highest-impact feature and prove AI value. Add others based on customer feedback.

---

## Open Questions

1. **Pricing:** Should Phase 1.5 replace Phase 1, or be an upsell tier?
2. **Privacy:** What's the right approach for LLM privacy? Anonymization vs. local models vs. BAA with Anthropic?
3. **Customization:** How much should users be able to customize script tone/style?
4. **Delivery:** Should scripts be delivered in the report, or in an interactive interface?

---

*This document extends the Phase 1 PRD with AI-powered action generation capabilities.*
