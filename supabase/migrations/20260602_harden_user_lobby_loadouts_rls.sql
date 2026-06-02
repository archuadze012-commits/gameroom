alter table public.user_lobby_loadouts enable row level security;

drop policy if exists "ull_select_all" on public.user_lobby_loadouts;
drop policy if exists "ull_insert_own" on public.user_lobby_loadouts;
drop policy if exists "ull_update_own" on public.user_lobby_loadouts;
drop policy if exists "ull_delete_own" on public.user_lobby_loadouts;

drop policy if exists "user_lobby_loadouts_select_own" on public.user_lobby_loadouts;
create policy "user_lobby_loadouts_select_own"
on public.user_lobby_loadouts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "user_lobby_loadouts_insert_own" on public.user_lobby_loadouts;
create policy "user_lobby_loadouts_insert_own"
on public.user_lobby_loadouts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "user_lobby_loadouts_update_own" on public.user_lobby_loadouts;
create policy "user_lobby_loadouts_update_own"
on public.user_lobby_loadouts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "user_lobby_loadouts_delete_own" on public.user_lobby_loadouts;
create policy "user_lobby_loadouts_delete_own"
on public.user_lobby_loadouts
for delete
to authenticated
using ((select auth.uid()) = user_id);
