-- Top-3 auth boundary hardening from the Supabase audit.
-- 1) wallets writes must stay behind service-role/admin flows
-- 2) profiles self-service updates must not reach auth/gamification columns
-- 3) notifications inserts must come from trusted server paths only

-- wallets: authenticated users may still read via existing app paths, but they
-- must not mutate balances directly from a user session.
revoke insert, update, delete on table public.wallets from anon, authenticated;

-- profiles: remove the broad "own-or-admin" client-session update path.
-- Authenticated users may only update a narrow set of display/settings columns.
-- Admin mutations already run through service_role-backed route handlers.
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke update on table public.profiles from anon, authenticated;
grant update (
  username,
  display_name,
  avatar_url,
  bio,
  region,
  voice_chat,
  available_hours,
  banner_url,
  favorite_game_slugs,
  main_game_slug,
  youtube_handle,
  tiktok_handle,
  tiktok_followers,
  in_game_name,
  emoji,
  updated_at,
  game_id
) on table public.profiles to authenticated;

-- notifications: keep own inbox read/update in authenticated sessions, but
-- only trusted server paths may create system notices.
revoke insert on table public.notifications from anon, authenticated;
grant insert on table public.notifications to service_role;

drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own"
on public.notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "notif_insert_service" on public.notifications;
create policy "notif_insert_service"
on public.notifications
for insert
to service_role
with check (true);
