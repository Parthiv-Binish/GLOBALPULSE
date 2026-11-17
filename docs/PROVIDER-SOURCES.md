# Official provider sources

The following provider status pages publish public Statuspage-compatible JSON summary endpoints. The endpoints were checked on 17 November 2026 and are the only hosts currently allowed by the ingestion function.

| Provider | Official status page | Summary endpoint |
|---|---|---|
| Cloudflare | https://www.cloudflarestatus.com | https://www.cloudflarestatus.com/api/v2/summary.json |
| GitHub | https://www.githubstatus.com | https://www.githubstatus.com/api/v2/summary.json |
| Atlassian | https://status.atlassian.com | https://status.atlassian.com/api/v2/summary.json |
| DigitalOcean | https://status.digitalocean.com | https://status.digitalocean.com/api/v2/summary.json |
| Twilio | https://status.twilio.com | https://status.twilio.com/api/v2/summary.json |

## Integration contract

- Poll only the official summary endpoint.
- Send a descriptive user agent.
- Do not call provider management APIs or submit updates to provider systems.
- Treat source status and incident fields as provider-reported data.
- Do not infer independent reachability, customer impact, root cause, or SLA compliance.
- Keep the exact provider URL and source incident identifier with each record.
- Do not follow redirects from an allowlisted host; investigate and approve host changes before updating the allowlist.
- Respect each provider's terms and operational guidance.

## Verification references

- Cloudflare's official API documentation: https://www.cloudflarestatus.com/api
- GitHub's official API page: https://www.githubstatus.com/api/v2
- Atlassian's official API page: https://status.atlassian.com/api
- DigitalOcean's official API page: https://status.digitalocean.com/api
- Twilio's official API page: https://status.twilio.com/api

An HTTP response at one point in time does not guarantee future availability. The scheduled ingestion log is the source of truth for the latest successful poll.
