-- User-to-user blocking + a "who can message me" DM-privacy preference. Powers
-- the PlayManager "block / report this manager" and DM-permission controls (and
-- is general-purpose — not PlayManager-specific).

-- ── user_blocks ──────────────────────────────────────────────────────────────
-- Modelled on the existing `follows` graph: a one-directional edge, composite PK,
-- cascade to profiles. blocker_id has blocked blocked_id.
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);
-- Reverse lookup ("who has blocked me") for the DM/message gates.
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

-- A user manages only their OWN blocks. The cross-direction check ("has X blocked
-- me") runs server-side with the service-role client, so it isn't gated by these
-- policies.
drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own" on public.user_blocks
  for select using ((select auth.uid()) = blocker_id);

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own" on public.user_blocks
  for insert with check ((select auth.uid()) = blocker_id);

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own" on public.user_blocks
  for delete using ((select auth.uid()) = blocker_id);

-- ── profiles.dm_privacy ──────────────────────────────────────────────────────
-- "Who can start a DM with me": everyone (default) | followers (only accounts that
-- follow me) | nobody. Existing conversations are unaffected — this only gates
-- creating a new one.
alter table public.profiles
  add column if not exists dm_privacy text not null default 'everyone';

do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_schema = 'public' and table_name = 'profiles'
      and constraint_name = 'profiles_dm_privacy_check'
  ) then
    alter table public.profiles
      add constraint profiles_dm_privacy_check
      check (dm_privacy in ('everyone', 'followers', 'nobody'));
  end if;
end $$;
