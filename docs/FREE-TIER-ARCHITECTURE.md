# GLOBALPULSE — Free-tier deployment architecture

## Cost policy

GLOBALPULSE is configured to use free plans and open-source tooling only. No paid service, paid upgrade, custom domain purchase, or usage-based billing should be enabled without explicit approval.

## Current service allocation

| Layer | Service | Plan / purpose |
|---|---|---|
| Source control | GitHub | Repository, CI, scheduled ingestion |
| Frontend | Vercel | Hobby static frontend hosting |
| API | Render | Existing free web service; may sleep when idle |
| Database and identity | Supabase | Free Postgres, Auth and REST API |
| Scheduled ingestion | GitHub Actions | Runs the one-shot worker every 15 minutes and on manual dispatch |

## GitHub Actions ingestion setup

Workflow: `.github/workflows/ingestion.yml`

Required repository Actions secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The worker is deliberately run as a bounded one-shot job. The schedule is every 15 minutes (UTC), but GitHub-hosted schedules are best-effort and can be delayed. Use the workflow's **Run workflow** action for manual execution.

Never put the service-role key in frontend environment variables or commit it to the repository.

## Free-tier limitations and operational controls

- Supabase Free currently includes a 500 MB database and may pause projects after a week of low activity. Monitor the Supabase dashboard and owner email.
- Render free web services can spin down while idle. Expect cold-start latency.
- Vercel Hobby has platform usage and deployment-retention limits.
- GitHub Actions has included minutes for private repositories and is free for standard runners on public repositories. Keep the worker bounded and inspect usage.
- Scheduled GitHub Actions can be delayed under load. They are not a guaranteed real-time scheduler.
- No production uptime SLA, automatic database backups, or guaranteed ingestion cadence is claimed on this stack.

## Activation checklist

1. Create the Supabase project on the Free plan in the approved organization.
2. Apply migrations in numeric order from `supabase/migrations/`.
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions repository secrets.
4. Add server-side Supabase credentials to the Render API service environment.
5. Add the Supabase project URL and public anon/publishable key to Vercel only if the browser client requires them.
6. Run the ingestion workflow manually and inspect its logs.
7. Verify provider and incident records came from configured real status sources; do not seed demo records.

## Free alternatives considered

- Render Cron: not selected because Render documents a minimum $1 monthly charge per cron service.
- GitHub Actions: selected because it avoids a separate cron host and supports scheduled and manual runs.
- Self-hosted Supabase: possible but not selected because it would require always-on compute and maintenance, defeating the zero-cost objective for this project.
