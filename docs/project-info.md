# GiveMetry - Project Info

## Overview

GiveMetry is an AI-powered analytics platform for university advancement offices (fundraising/development). It serves as an intelligence layer that works with existing CRMs (Blackbaud, Salesforce) rather than replacing them.

**Core Value Proposition:** Transform donor data into actionable intelligence for advancement teams — answering "Where do we stand, and what should we do next?"

## Product Phases

| Phase | Name | Description |
|-------|------|-------------|
| 1 | Advancement Health Assessment | One-time diagnostic: CSV upload → AI analysis → peer benchmarking → actionable report |
| 2 | MGO Copilot | Daily workflow tool for gift officers with prioritized tasks, donor briefs, outreach drafts |
| 3 | Advancement Intelligence Platform | Full platform: campaign forecasting, portfolio optimization, predictive modeling |

## Target Market

- **Primary:** University advancement offices (higher education)
- **Secondary:** Hospital foundations, large nonprofits
- **Beachhead:** R2 + Master's universities with $100M-$1B endowments (400-600 institutions)

## File Map

```
/opt/apps/givemetry/
├── docs/
│   ├── project-info.md              # This file - architecture/structure reference
│   ├── project-log.md               # Session activity log
│   ├── project-brief.md             # Comprehensive strategic brief (PRD-ready)
│   ├── initial docs/                # Original vision documents
│   │   ├── GiveMetry_Vision.md
│   │   ├── competitive-research-2026-01-15 (1).md
│   │   └── product-brief-advancement-health-assessment-2026-01-15.md
│   └── research/
│       ├── research-prompts/        # Deep research prompt templates
│       │   ├── README.md
│       │   ├── 01-competitive-landscape.md
│       │   ├── 02-market-sizing.md
│       │   └── 03-buyer-personas.md
│       └── research-outputs/        # Research results (12 documents)
│           ├── 01-competitive-landscape-output-2026-01-25.md
│           ├── 02-market-sizing-output-2026-01-25.md
│           ├── 03-buyer-personas-output-2026-01-25.md
│           ├── claude/              # Claude Cloud research (3 docs)
│           ├── gemini/              # Gemini research (3 docs)
│           └── gpt/                 # ChatGPT research (3 docs)
```

## Key Domain Concepts

- **Advancement Office:** University fundraising/development department
- **Gift Officer / MGO:** Major Gift Officer - manages donor relationships
- **Portfolio:** A gift officer's assigned set of donor prospects (typically 75-150)
- **Moves Management:** Structured approach to cultivating donors toward gifts
- **CASE:** Council for Advancement and Support of Education (industry association)

## Competitive Positioning

- **Not a CRM replacement** — Intelligence layer on top of existing systems
- **Diagnostic-first approach** — Build trust before asking for deeper access
- **CRM-agnostic** — Works with Blackbaud, Salesforce, or any system via CSV export

## Key Metrics (from research)

- 46% of gift officers plan to leave within 2 years
- 49% use AI but only 9% have policies (governance gap)
- 80% experimented with AI, <5% use predictive portfolio management
- 75% of CRM implementation projects fail
- Blackbaud RE NXT starts at $3,375/month
- Market size: $4.5-5.5B nonprofit software; $800M-$1.2B intelligence layer SAM

## External References

- CASE: https://www.case.org/
- Blackbaud: https://www.blackbaud.com/
- Salesforce Nonprofit: https://www.salesforce.com/nonprofit/
