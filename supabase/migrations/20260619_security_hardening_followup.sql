-- Security hardening follow-up for the Supabase advisor findings.
-- Locks PlayManager RPCs to service_role, removes public storage listing,
-- and tightens a few exposed helpers/policies.

do $$
declare
  r record;
begin
  for r in
    select
      n.nspname as schema_name,
      p.proname as name,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and left(p.proname, 3) = 'pm_'
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, pg_temp;',
      r.schema_name,
      r.name,
      r.args
    );
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon, authenticated;',
      r.schema_name,
      r.name,
      r.args
    );
    execute format(
      'grant execute on function %I.%I(%s) to service_role;',
      r.schema_name,
      r.name,
      r.args
    );
  end loop;
end $$;

alter function public.can_manage_shop_products() set search_path = public, pg_temp;
revoke execute on function public.can_manage_shop_products() from public, anon, authenticated;
grant execute on function public.can_manage_shop_products() to service_role;

do $$
begin
  if to_regprocedure('public.is_admin()') is not null then
    execute 'alter function public.is_admin() set search_path = public, pg_temp;';
    execute 'revoke execute on function public.is_admin() from public, anon;';
    execute 'grant execute on function public.is_admin() to authenticated, service_role;';
  end if;
end $$;

revoke insert on table public.notifications from anon, authenticated;
grant insert on table public.notifications to service_role;
drop policy if exists "notif_insert_service" on public.notifications;
create policy "notif_insert_service"
on public.notifications
for insert
to service_role
with check (true);

drop policy if exists "avatars_select_own" on storage.objects;
drop policy if exists "avatars_read_public" on storage.objects;
drop policy if exists "avatars_select_all" on storage.objects;
drop policy if exists "avatars_select_public" on storage.objects;
drop policy if exists "banners_select_own" on storage.objects;
drop policy if exists "banners_read_public" on storage.objects;
drop policy if exists "banners_select_all" on storage.objects;
drop policy if exists "banners_select_public" on storage.objects;
drop policy if exists "post_media_select_own" on storage.objects;
drop policy if exists "post_media_read_public" on storage.objects;
drop policy if exists "post_media_select_all" on storage.objects;
drop policy if exists "post_media_select_public" on storage.objects;

do $$
begin
  if to_regclass('public.mafia_districts') is not null then
    execute 'drop policy if exists "mafia_districts_write" on public.mafia_districts;';
  end if;

  if to_regclass('public.mafia_plots') is not null then
    execute 'drop policy if exists "mafia_plots_write" on public.mafia_plots;';
  end if;
end $$;
