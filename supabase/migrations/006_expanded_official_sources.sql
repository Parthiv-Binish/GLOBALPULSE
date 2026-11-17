-- Expand GLOBALPULSE with additional provider-owned, public Statuspage-compatible APIs.
-- Only sources verified as public JSON summary endpoints are enabled.
insert into public.providers(name,slug,category,integration_type,status_url,enabled)
values
  ('OpenAI','openai','AI platform / API','statuspage','https://status.openai.com',true),
  ('Discord','discord','Communications','statuspage','https://discordstatus.com',true),
  ('Zoom','zoom','Video communications','statuspage','https://www.zoomstatus.com',true),
  ('MongoDB Atlas','mongodb-atlas','Database / Data platform','statuspage','https://status.mongodb.com',true),
  ('Supabase','supabase','Database / Developer platform','statuspage','https://status.supabase.com',true),
  ('Netlify','netlify','Hosting / Edge','statuspage','https://www.netlifystatus.com',true),
  ('Akamai','akamai','CDN / Edge / Security','statuspage','https://www.akamaistatus.com',true),
  ('npm','npm','Package registry','statuspage','https://status.npmjs.org',true),
  ('New Relic','new-relic','Observability','statuspage','https://status.newrelic.com',true)
on conflict (slug) do update set
  name=excluded.name,
  category=excluded.category,
  integration_type=excluded.integration_type,
  status_url=excluded.status_url,
  enabled=true;
