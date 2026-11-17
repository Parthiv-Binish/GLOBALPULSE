# GLOBALPULSE — Enterprise Project Handbook

**Document ID:** GP-PMO-HB-001 | **Version:** 1.0 | **Owner:** Product & Engineering | **Status:** Baseline

## 1. Executive summary
GlobalPulse is an incident intelligence product consolidating public provider status signals into a searchable, source-attributed operational view. It is an aggregation layer, not an independent internet measurement network.

## 2. Product scope
**R1 MVP:** provider registry; Statuspage-compatible ingestion; incident normalization and deduplication; provider directory; incident dashboard; search; API health; metrics derived from persisted records; Supabase schema and RLS; CI and operational documentation.

**R2:** RSS/Atom and official vendor APIs; sign-in and account lifecycle; subscriptions; email/webhook notifications; provider admin console; stronger audit trail and rate limiting.

**R3:** verified regional impact, map visualization, cross-source correlation with confidence scoring, analytics and enterprise workspaces.

**Out of scope:** synthetic production incidents, fake provider inventory, fabricated availability/SLA numbers, outage prediction, unsupported root-cause claims, private vendor portal scraping, direct network probing in this product.

## 3. Requirements and acceptance
- Every incident must include provider ID, provider event ID, source URL and provider timestamps.
- Unique(provider_id, source_event_id) prevents duplicate source events.
- Disabled providers must not be exposed or polled.
- Empty database must produce empty states and zero counts, never sample rows.
- API dependency failures must return safe errors without leaking secrets.
- Frontend bundles must never include service-role credentials.

## 4. Architecture
React + Vite frontend on Vercel; FastAPI read API on Render; Python background ingestion worker on Render; Supabase PostgreSQL/Auth; provider-owned HTTPS Statuspage endpoints. Provider JSON is validated and normalized by the worker, persisted idempotently, then served through read-only API routes.

## 5. Delivery phases and gates
| Phase | Work package | Exit gate |
|---|---|---|
| P0 Initiation | Charter, stakeholder needs, scope, source/legal review | G0: scope and architecture approved |
| P1 Foundation | Repo, frontend, API, worker, DB, RLS, CI, secrets register | G1: clean build and migration review |
| P2 Core | Provider registry, Statuspage connector, incident feed and metrics | G2: real source ingestion verified |
| P3 Identity | Auth, profile, subscription UX, accessibility and RLS QA | G3: auth/security tests pass |
| P4 Integrations | RSS/vendor APIs, correlation, notifications | G4: connector contracts pass |
| P5 Hardening | Rate limits, monitoring, backup/restore, security/load testing | G5: production readiness review |
| P6 Launch | Controlled rollout, smoke tests, handover, release notes | G6: owner accepts launch |

## 6. Governance and change control
Every change requires an issue, business reason, impact assessment, acceptance criteria, owner, test evidence, review, deployment record and rollback plan. Database migrations require explicit review and staging rehearsal. Production secret changes require a rotation record. Release tags and release notes are mandatory for production releases.

## 7. RACI
Product Owner: accountable for scope and release outcomes. Engineering Lead: accountable for architecture and delivery. Frontend/Backend Engineers: responsible for implementation. Security Owner: responsible for threat review and secret controls. QA Lead: responsible for verification. Operations Lead: responsible for deployment, monitoring and rollback. A single-person project can combine roles, but evidence and approval gates remain documented.

## 8. Security and privacy
Public: provider status and incident information. Internal: ingestion and deployment logs. Confidential: service keys and tokens. Supabase service-role key belongs only in Render server secrets. Vercel receives only the publishable/anon key. Enable RLS for all application tables. Keep public registration disabled until admin bootstrap, abuse controls, privacy notice, retention policy, grievance contact and account deletion workflow are complete. Provider URL onboarding needs SSRF protection, hostname allowlisting and DNS/IP validation before production scale.

## 9. Quality strategy
Unit tests cover parser, normalization and dedupe. Integration tests cover Postgres, RLS and worker writes. Contract tests cover provider schemas. E2E tests cover empty state, real staging source, search, filtering and source attribution. Non-functional tests cover responsive layout, accessibility, load, dependency audit, backup and restore. Test fixtures are isolated to CI and must never be loaded into production.

## 10. Operational SOP
Daily review: API health, worker logs, last successful ingestion, provider failures and freshness. On provider onboarding: verify official endpoint and terms, validate HTTPS/schema, register disabled, test, review provenance, then enable. On incident: preserve source text and link; do not infer cause or customer impact. On credential exposure: contain, rotate, inspect logs, assess exposure and document corrective actions.

## 11. Risk register
| Risk | Impact | Treatment |
|---|---|---|
| Provider feed unavailable | Medium | Per-provider isolation, freshness and retry |
| Schema drift | High | Contract tests and parser failure alert |
| Service key leakage | Critical | Server secret store, scan and rotate |
| SSRF / malicious source URL | Critical | Admin approval, allowlist and egress controls |
| False event correlation | High | Provenance, confidence and human review |
| Rate limiting | Medium | Configurable cadence, jitter and backoff |
| Unsafe migration | Critical | Backup, review and staging rehearsal |
| Premature public launch | High | Privacy, support, deletion and abuse gates |

## 12. Release readiness checklist
- Dedicated Supabase project and migrations are ready.
- RLS policies and Auth settings are reviewed.
- Vercel and Render environment variables are configured.
- API health and database read paths are verified.
- Worker polls a real approved source successfully.
- At least one real provider incident is ingested and source-linked, or an empty result is verified where no incident exists.
- No sample data exists in production.
- Backup, rollback, support contact and privacy pages are ready.
- QA, Security and Operations sign-off is recorded.

## 13. Current baseline and known gaps
The initial code baseline provides the dashboard, read API, Statuspage ingestion worker and database schema. Admin provider onboarding, full auth screens, notification delivery, RSS/vendor-specific connectors, advanced rate limiting and comprehensive audit logging remain planned. The first live provider must be registered by an authorized operator; no provider inventory is seeded.
