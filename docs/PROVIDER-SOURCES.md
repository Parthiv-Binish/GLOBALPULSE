# Official provider sources

GLOBALPULSE polls public, provider-owned Statuspage-compatible JSON summary endpoints. These are vendor-reported health signals, not independent uptime probes.

## Enabled official sources

| Provider | Category | Official status page | Summary API |
|---|---|---|---|
| Cloudflare | CDN / DNS / Edge | https://www.cloudflarestatus.com | https://www.cloudflarestatus.com/api/v2/summary.json |
| GitHub | Developer platform | https://www.githubstatus.com | https://www.githubstatus.com/api/v2/summary.json |
| Atlassian | SaaS / Developer tools | https://status.atlassian.com | https://status.atlassian.com/api/v2/summary.json |
| DigitalOcean | Cloud infrastructure | https://status.digitalocean.com | https://status.digitalocean.com/api/v2/summary.json |
| Twilio | Communications API | https://status.twilio.com | https://status.twilio.com/api/v2/summary.json |
| OpenAI | AI platform / API | https://status.openai.com | https://status.openai.com/api/v2/summary.json |
| Discord | Communications | https://discordstatus.com | https://discordstatus.com/api/v2/summary.json |
| Zoom | Video communications | https://www.zoomstatus.com | https://www.zoomstatus.com/api/v2/summary.json |
| MongoDB Atlas | Database / Data platform | https://status.mongodb.com | https://status.mongodb.com/api/v2/summary.json |
| Supabase | Database / Developer platform | https://status.supabase.com | https://status.supabase.com/api/v2/summary.json |
| Netlify | Hosting / Edge | https://www.netlifystatus.com | https://www.netlifystatus.com/api/v2/summary.json |
| Akamai | CDN / Edge / Security | https://www.akamaistatus.com | https://www.akamaistatus.com/api/v2/summary.json |
| npm | Package registry | https://status.npmjs.org | https://status.npmjs.org/api/v2/summary.json |
| New Relic | Observability | https://status.newrelic.com | https://status.newrelic.com/api/v2/summary.json |

## Integration contract

- Poll only the exact official summary endpoint built from a verified root status URL.
- Send a descriptive User-Agent and use a bounded request timeout.
- Reject unknown hosts, URL credentials, custom ports, paths, query strings, fragments, and redirects.
- Do not call provider management APIs or submit updates to provider systems.
- Treat status, components, and incidents as provider-reported information.
- Preserve provider source incident identifiers and original source URLs.
- An inaccessible source is reported as a failed poll; it is never silently treated as operational.
- A provider's public status page may omit service-specific or regional issues. GLOBALPULSE does not infer independent reachability, customer impact, root cause, or SLA compliance.

## API references and verification

The following official API endpoints returned JSON during source verification on 17 November 2026: OpenAI, Discord, Zoom, MongoDB Atlas, Supabase, Netlify, Akamai, npm, and New Relic. Existing Cloudflare and Twilio API documentation explicitly describes the Statuspage JSON endpoints.

- Cloudflare API documentation: https://www.cloudflarestatus.com/api
- Twilio API documentation: https://status.twilio.com/api
- GitHub API: https://www.githubstatus.com/api/v2
- Atlassian API documentation: https://status.atlassian.com/api
- DigitalOcean API documentation: https://status.digitalocean.com/api

A source being reachable during verification does not guarantee future availability. The latest successful ingestion run is the operational source of truth.

## Additional cloud-provider feeds

These providers publish official RSS/Atom incident feeds rather than the same JSON summary contract. GLOBALPULSE stores their feed items as source-attributed incident updates. Their aggregate status is deliberately shown as **unknown** because a history feed alone cannot prove that every service is operational.

| Provider | Official feed | Format |
|---|---|---|
| Amazon Web Services | https://status.aws.amazon.com/rss/all.rss | RSS |
| Google Cloud | https://status.cloud.google.com/en/feed.atom | Atom |
| Microsoft Azure | https://azure.status.microsoft/status/feed/ | RSS |
| IBM Cloud | https://cloud.ibm.com/status/api/notifications/feed.rss | RSS |
| Oracle Cloud Infrastructure | https://ocistatus.oraclecloud.com/api/v2/incident-summary.rss | RSS |

Coverage caveats: AWS recommends EventBridge for account-specific AWS Health events; the public RSS feed is only a broad public signal. Azure's public status feed is not a substitute for personalized Azure Service Health. IBM notes that some maintenance and account-scoped incidents are not included in its public feed. Google Cloud's public feed covers incidents posted to its public Service Health dashboard.
