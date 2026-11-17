-- Seed only verified, provider-owned public Statuspage API sources.
-- These are real source registrations, not simulated provider or incident data.
insert into public.providers(name,slug,category,integration_type,status_url,enabled)
values
  ('Cloudflare','cloudflare','CDN / DNS / Edge','statuspage','https://www.cloudflarestatus.com',true),
  ('GitHub','github','Developer platform','statuspage','https://www.githubstatus.com',true),
  ('Atlassian','atlassian','SaaS / Developer tools','statuspage','https://status.atlassian.com',true),
  ('DigitalOcean','digitalocean','Cloud infrastructure','statuspage','https://status.digitalocean.com',true),
  ('Twilio','twilio','Communications API','statuspage','https://status.twilio.com',true)
on conflict (slug) do update set
  name=excluded.name,
  category=excluded.category,
  integration_type=excluded.integration_type,
  status_url=excluded.status_url,
  enabled=true;
