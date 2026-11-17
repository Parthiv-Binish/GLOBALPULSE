# GLOBALPULSE

GlobalPulse is an incident intelligence platform for tracking verified service disruptions across cloud, SaaS, telecom, DNS, CDN, and internet infrastructure providers.

This repository is the system of record for product code, architecture, delivery controls, operational procedures, and release documentation.

> Data integrity rule: production incident views must contain only provider-originated, source-attributed events. No demo fixtures, generated incidents, seeded providers, or synthetic metrics are permitted.

## Workspace

- `apps/web` — React + Vite + TypeScript frontend.
- `apps/api` — FastAPI application and integration services.
- `apps/worker` — scheduled provider ingestion and reconciliation jobs.
- `supabase/migrations` — PostgreSQL schema, policies, indexes, and functions.
- `docs` — enterprise delivery, architecture, security, testing, operations, and release documentation.
- `.github/workflows` — CI quality gates.

## Local development

Requirements: Node.js 20+, Python 3.11+, and a Supabase project.

1. Copy `apps/web/.env.example` to `apps/web/.env.local`.
2. Copy `apps/api/.env.example` to `apps/api/.env`.
3. Install web dependencies with `cd apps/web && npm install`.
4. Install API dependencies with `cd apps/api && python -m pip install -r requirements.txt`.
5. Apply SQL migrations in lexical order to a dedicated Supabase project.
6. Start the API with `uvicorn app.main:app --reload --app-dir apps/api`.
7. Start the web app with `npm run dev` from `apps/web`.

No sample data is inserted by migrations. Empty states are expected until real provider integrations are configured and provider events are ingested.

## Deployment

- Vercel: import this repository and set Root Directory to `apps/web`.
- Render API: Python web service, Root Directory `apps/api`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Render worker: Python background worker, Root Directory `apps/worker`, build `pip install -r requirements.txt`, start `python worker.py`.
- Supabase: apply migrations and configure Auth redirect URLs for the deployed frontend.

See `docs/` for the controlled deployment and environment-variable register. Secrets must be created in the destination platform and never committed to Git.
