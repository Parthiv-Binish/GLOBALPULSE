alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user','admin'));

-- Users may update their display name, never their own authorization role.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy providers_admin_insert on public.providers
  for insert to authenticated
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));
create policy providers_admin_update on public.providers
  for update to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));
create policy providers_admin_delete on public.providers
  for delete to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));
create policy audit_logs_admin_insert on public.audit_logs
  for insert to authenticated
  with check (actor_id = (select auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));
grant select, insert on public.audit_logs to authenticated;
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
