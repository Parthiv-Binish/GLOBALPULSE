-- Add public RSS/Atom status feeds for cloud providers whose official health data is not exposed via Statuspage JSON.
alter table public.providers drop constraint if exists providers_integration_type_check;
alter table public.providers add constraint providers_integration_type_check
  check (integration_type in ('statuspage','rss'));

insert into public.providers(name,slug,category,integration_type,status_url,enabled)
values
  ('Amazon Web Services','aws','Cloud infrastructure','rss','https://status.aws.amazon.com/rss/all.rss',true),
  ('Google Cloud','google-cloud','Cloud infrastructure','rss','https://status.cloud.google.com/en/feed.atom',true),
  ('Microsoft Azure','azure','Cloud infrastructure','rss','https://azure.status.microsoft/status/feed/',true),
  ('IBM Cloud','ibm-cloud','Cloud infrastructure','rss','https://cloud.ibm.com/status/api/notifications/feed.rss',true),
  ('Oracle Cloud Infrastructure','oracle-cloud','Cloud infrastructure','rss','https://ocistatus.oraclecloud.com/api/v2/incident-summary.rss',true)
on conflict (slug) do update set
  name=excluded.name,
  category=excluded.category,
  integration_type=excluded.integration_type,
  status_url=excluded.status_url,
  enabled=true;
