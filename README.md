# GLOBALPULSE

GLOBALPULSE is an infrastructure incident intelligence application that consolidates provider-published status information into a searchable, source-attributed view.

> **Data integrity:** no synthetic incidents, mock provider inventory, seeded demo events, or fabricated uptime figures are used. The initial provider registry contains only official public status endpoints verified against provider documentation.

## Production services

- **Frontend:** [Vercel production site](https://globalpulse-parthivs-projects-0af44f70.vercel.app)
- **API:** [Render API](https://globalpulse-api.onrender.com)
- **API health:** [Health endpoint](https://globalpulse-api.onrender.com/health)
- **Database/Auth:** Supabase project `trilekpqafbaznadjbsm`
- **Source:** https://github.com/Parthiv-Binish/GLOBALPULSE

## Features

- Account signup, email confirmation, password login, password reset, and sign-out.
- Infrastructure overview with incident counts, monitored source counts, and ingestion freshness.
- Searchable provider-reported incident feed with source links.
- Official provider directory and per-user provider subscriptions.
- Admin-only provider registry with enable/disable controls and audit records.
- Scheduled ingestion every six hours using GitHub Actions OIDC and a Supabase Edge Function.
- Row Level Security and least-privilege browser credentials.
- CI checks for frontend build and Python API/worker compilation.

## Verified official source inventory

The initial registry uses the public Statuspage-compatible APIs for Cloudflare, GitHub, Atlassian, DigitalOcean, and Twilio. The ingestion function allowlists these exact hosts. See `docs/PROVIDER-SOURCES.md`.

## Repository layout

- `apps/web` — React, Vite, TypeScript, Supabase Auth client.
- `apps/api` — FastAPI read API.
- `apps/worker` — legacy one-shot Python worker for controlled/manual use.
- `supabase/migrations` — numbered PostgreSQL schema, RLS, admin, and source registration migrations.
- `supabase/functions/globalpulse-ingest` — OIDC-authenticated scheduled ingestion.
- `.github/workflows` — CI and scheduled ingestion.
- `docs` — handbook, runbooks, security, free-tier design, and owner bootstrap.

## Local development

Requirements: Node.js 20+, Python 3.11+, and access to a Supabase project.

1. Copy `apps/web/.env.example` to `apps/web/.env.local`.
2. Copy `apps/api/.env.example` to `apps/api/.env`.
3. Install frontend packages: `cd apps/web && npm install`.
4. Build frontend: `npm run build`.
5. Install API packages: `cd apps/api && python -m pip install -r requirements.txt`.
6. Start API: `uvicorn app.main:app --reload --app-dir apps/api`.
7. Start frontend in another terminal: `npm run dev` from `apps/web`.

## Environment variables

### Web (Vercel and local)

- `VITE_API_BASE_URL` — Render API base URL.
- `VITE_SUPABASE_URL` — Supabase project URL.
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable/anon key. This is safe for browser use only with RLS enabled.

### API (Render)

- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_ANON_KEY` — public anon key used for RLS-protected reads.
- `CORS_ORIGINS` — comma-separated allowed web origins.

The Supabase service-role key is not needed by the read API and must never be exposed to the browser.

## Database and administrator bootstrap

Migrations are applied in numeric order and tracked in the repository. The initial admin must be promoted manually after creating and confirming an account. Follow `docs/ADMIN-BOOTSTRAP.md`; never promote users through browser code.

## Operations

- Ingestion workflow: `.github/workflows/ingestion.yml`, every six hours UTC and manually runnable.
- CI workflow: `.github/workflows/ci.yml`.
- Check the latest ingestion row in `public.ingestion_runs`.
- Monitor provider freshness, failed runs, Supabase project health, Render cold starts, and Vercel deployment status.
- GitHub scheduled workflows are best-effort and may be delayed.
- Free-tier hosting has no production SLA. Render free services can sleep; Supabase Free projects may pause after prolonged inactivity.

## Scope limitations

- Subscriptions currently store an in-app watchlist; outbound email, SMS, and push notifications are not enabled.
- Only the five explicitly allowlisted Statuspage-compatible official sources are supported in this release.
- A self-service account deletion screen, privacy/grievance contact details, independent uptime probes, RSS connectors, and multi-tenant enterprise administration are not yet available.
- The privacy notice is a draft and must be reviewed before public launch.

See `docs/ENTERPRISE-HANDBOOK.md` for the delivery lifecycle and release gates.
