# GiveMetry Constitution

## Core Principles

### I. CRM-Agnostic by Design
GiveMetry complements existing CRM systems — never competes or requires replacement. Phase 1 requires zero integration (CSV upload only); Core features work even when CRM sync fails; Users can always export data in standard formats; No vendor lock-in created through deep coupling.

### II. Explainable AI (NON-NEGOTIABLE)
Every AI-generated prediction, recommendation, or score must be human-readable and auditable. No black boxes — every output includes reasoning; Source citations required — never fabricate data; Confidence indicators on all predictions; Audit trail logged for every AI output (timestamp, inputs, model version).

### III. Test-First Development (NON-NEGOTIABLE)
TDD mandatory: Tests written → Approved → Tests fail → Then implement. Red-Green-Refactor cycle strictly enforced. API endpoints require integration tests; AI/ML predictions require golden dataset validation; Data parsing requires unit tests per format; Critical user flows require end-to-end tests.

### IV. Multi-Tenancy First
Every feature designed for multi-tenant SaaS from day one. Complete data isolation — no tenant can access another's data; Tenant context validated on all operations; Cross-tenant benchmarking uses anonymized aggregates only.

### V. Security & Compliance Built-In
Security is a constraint, not a feature. Encryption mandatory at rest and in transit; HECVAT documentation maintained alongside code; SOC 2 Type II trajectory within 12 months; FERPA compliance — no student PII; SSO required before first paying customer; Audit logs retained per compliance requirements.

### VI. Simplicity Over Cleverness
Start simple, add complexity only when proven necessary. YAGNI — no speculative features; Boring technology preferred over bleeding edge; One way to do things — avoid multiple paths; Each phase must demonstrate ROI before expanding scope.

### VII. Documentation Separation
Strict separation between WHAT/WHY (spec.md) and HOW (plan.md). Spec: technology-agnostic, user stories, requirements, success criteria; Plan: all technical details, frameworks, architecture, API contracts. When spec bleeds into implementation, product discussions become tech debates.

## Domain Constraints

Advancement office terminology must be used correctly throughout all AI outputs, documentation, and UI. Constituent (not Contact/Lead); Major Gift Officer/MGO (not Fundraiser); Portfolio (not Pipeline); Lapse (not Churn); Ask (not Solicitation); Capacity (not Wealth Score); Affinity (not Engagement Score); LYBUNT/SYBUNT (standard acronyms). Data quality reality: assume incomplete records, varying date formats, duplicate records, sparse history, differing schemas across CRMs — design for graceful handling.

## Decision Framework

When principles conflict, apply this priority: (1) Security & Compliance — never compromise; (2) Explainability — users must understand AI outputs; (3) Simplicity — prefer simpler solution; (4) CRM-Agnostic — don't create coupling; (5) Performance — meet budgets in plan.md. For ambiguous decisions: choose easier to change later; choose better observability; choose fails loudly over fails silently; document decision and rationale.

## Governance

Constitution supersedes all other practices. All code reviews must verify constitutional compliance; Complexity violating simplicity must be justified in writing; Security violations are blocking — no exceptions; Deviations require explicit documentation and approval. Amendments require: written rationale, maintainer approval, backwards compatibility assessment, propagation to dependent templates. Review triggers: phase transitions, first 10 customers, security incidents, compliance changes, strategic pivots.

**Version**: 1.0 | **Ratified**: 2026-01-25 | **Last Amended**: 2026-01-25