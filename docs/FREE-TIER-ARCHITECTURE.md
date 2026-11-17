# GLOBALPULSE — Free-tier deployment architecture

## Cost policy

GLOBALPULSE uses free plans and open-source tooling only. No paid service, paid upgrade, custom domain purchase, or usage-based billing should be enabled without explicit approval.

## Current service allocation

| Layer | Service | Plan / purpose |
|---|---|---|
| Source control and CI | GitHub | Repository, build checks, scheduled workflow |
| Frontend | Vercel | Hobby static frontend hosting |
| API | Render | Existing free web service; may sleep when idle |
| Database and identity | Supabase | Free Postgres, Auth and REST API |
| Scheduled ingestion | GitHub Actions + Supabase Edge Function | GitHub schedule obtains an OIDC token; the function verifies the exact repository/workflow before using its server-side key |

## Scheduled ingestion

Workflow: `.github/workflows/ingestion.yml`

Function: `supabase/functions/globalpulse-ingest/index.ts`

- Runs every six hours (UTC), and can be started manually from GitHub Actions.
- Uses GitHub's short-lived OIDC identity token; no long-lived Supabase service key is stored in GitHub.
- The Edge Function verifies issuer, audience, repository, branch, and exact workflow identity before starting ingestion.
- The Edge Function uses Supabase's server-side environment key; it is never exposed to the browser or committed to the repository.
- The ingestion function reads only enabled provider records. The initial five source records are real official provider endpoints documented in `docs/PROVIDER-SOURCES.md`; no sample incidents or synthetic events are seeded. The function enforces an exact hostname allowlist and rejects redirects.

## Free-tier limitations and operational controls

- Supabase Free currently includes a 500 MB database and may pause projects after a week of low activity. Monitor the Supabase dashboard and owner email.
- Render free web services can spin down while idle. Expect cold-start latency.
- Vercel Hobby has platform usage and deployment-retention limits.
- GitHub Actions schedules are best-effort and may be delayed. Six-hour cadence is intentionally conservative for private-repository free-minute allowances.
- No production uptime SLA, automatic database backups, or guaranteed ingestion cadence is claimed on this stack.

## Activation and verification

1. Supabase project is provisioned on the Free plan.
2. Migrations are stored in `supabase/migrations/` and applied in numeric order.
3. The Edge Function is deployed with JWT verification disabled at the gateway but performs its own strict GitHub OIDC verification.
4. Run the GitHub workflow manually and inspect its job logs.
5. Verify provider and incident records originate from enabled, configured real status sources; do not seed demo records.

## Free alternatives considered

- Render Cron: not selected because Render documents a minimum $1 monthly charge per cron service.
- GitHub Actions: selected for scheduled invocation with no separate cron host.
- Supabase Edge Function: selected for privileged ingestion so no service-role credential needs to be copied into GitHub secrets.
- Self-hosted Supabase: not selected because it requires always-on compute and maintenance, defeating the zero-cost objective.
