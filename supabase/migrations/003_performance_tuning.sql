-- Performance tuning for GLOBALPULSE RLS policies and subscriptions.
drop policy if exists profiles_own_select on public.profiles;
drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_own_update on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists subscriptions_own_read on public.subscriptions;
drop policy if exists subscriptions_own_insert on public.subscriptions;
drop policy if exists subscriptions_own_delete on public.subscriptions;
create policy subscriptions_own_read on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy subscriptions_own_insert on public.subscriptions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy subscriptions_own_delete on public.subscriptions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists subscriptions_provider_idx
  on public.subscriptions(provider_id);
