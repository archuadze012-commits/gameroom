-- Migration-drift reconciliation, part 1: tables/RLS/columns.
--
-- A full live-vs-migration-replay diff (pg_catalog introspection on the live
-- project vs a from-scratch pglite replay of every migration) found that 25
-- tables have RLS enabled live but NOT in a from-scratch rebuild (the RLS was
-- turned on directly against the live DB, with no accompanying migration), 8
-- columns exist live but not in any migration, and 1 column (news_comments.
-- parent_id) is declared by a migration but was never actually applied to live
-- (the table already existed via an earlier out-of-band creation when that
-- migration ran, so `create table if not exists` was a no-op for it).
--
-- This migration is intentionally idempotent both ways: applied to live it is
-- a pure no-op (everything it declares already exists there); applied during a
-- from-scratch replay it brings the schema to parity with live.

-- ── Enable RLS (idempotent — no-op if already enabled) ──────────────────────
alter table if exists public.announcement_reads   enable row level security;
alter table if exists public.announcements        enable row level security;
alter table if exists public.badge_unlocks        enable row level security;
alter table if exists public.box_items             enable row level security;
alter table if exists public.chat_messages        enable row level security;
alter table if exists public.daily_challenges     enable row level security;
alter table if exists public.event_boxes          enable row level security;
alter table if exists public.game_rooms           enable row level security;
alter table if exists public.lfg_comments         enable row level security;
alter table if exists public.lfg_queue            enable row level security;
alter table if exists public.mafia_action_logs    enable row level security;
alter table if exists public.mafia_battle_logs    enable row level security;
alter table if exists public.mafia_businesses     enable row level security;
alter table if exists public.mafia_districts      enable row level security;
alter table if exists public.mafia_feed_events    enable row level security;
alter table if exists public.mafia_players        enable row level security;
alter table if exists public.mafia_plots          enable row level security;
alter table if exists public.post_likes           enable row level security;
alter table if exists public.post_reactions       enable row level security;
alter table if exists public.push_subscriptions   enable row level security;
alter table if exists public.room_chat_messages   enable row level security;
alter table if exists public.shop_items           enable row level security;
alter table if exists public.user_game_profiles   enable row level security;
alter table if exists public.user_inventory       enable row level security;
alter table if exists public.user_mutes           enable row level security;

-- ── Policies (drop-then-recreate is this repo's established idempotent
--    pattern for `create policy` against a live DB that already has it) ─────

drop policy if exists "announcement_reads_own" on public.announcement_reads;
create policy "announcement_reads_own" on public.announcement_reads for all to authenticated
  using (( select auth.uid() ) = user_id) with check (( select auth.uid() ) = user_id);

drop policy if exists "announcements_select_all" on public.announcements;
create policy "announcements_select_all" on public.announcements for select using (true);

drop policy if exists "bu_select_all" on public.badge_unlocks;
create policy "bu_select_all" on public.badge_unlocks for select using (true);

drop policy if exists "box_items_select_all" on public.box_items;
create policy "box_items_select_all" on public.box_items for select using (true);

drop policy if exists "cm_delete_own" on public.chat_messages;
create policy "cm_delete_own" on public.chat_messages for delete
  using (( select auth.uid() ) = author_id);
drop policy if exists "cm_insert_own" on public.chat_messages;
create policy "cm_insert_own" on public.chat_messages for insert
  with check (( select auth.uid() ) = author_id);
drop policy if exists "cm_select_all" on public.chat_messages;
create policy "cm_select_all" on public.chat_messages for select using (true);

drop policy if exists "daily_challenges read (authenticated)" on public.daily_challenges;
create policy "daily_challenges read (authenticated)" on public.daily_challenges for select to authenticated
  using (true);

drop policy if exists "event_boxes_select_all" on public.event_boxes;
create policy "event_boxes_select_all" on public.event_boxes for select using (true);

drop policy if exists "gr_delete_host" on public.game_rooms;
create policy "gr_delete_host" on public.game_rooms for delete
  using (( select auth.uid() ) = host_id);
drop policy if exists "gr_insert_host" on public.game_rooms;
create policy "gr_insert_host" on public.game_rooms for insert
  with check (( select auth.uid() ) = host_id);
drop policy if exists "gr_select_all" on public.game_rooms;
create policy "gr_select_all" on public.game_rooms for select using (true);
drop policy if exists "gr_update_host" on public.game_rooms;
create policy "gr_update_host" on public.game_rooms for update
  using (( select auth.uid() ) = host_id);

drop policy if exists "lfgc_delete_own" on public.lfg_comments;
create policy "lfgc_delete_own" on public.lfg_comments for delete
  using (( select auth.uid() ) = user_id);
drop policy if exists "lfgc_insert_own" on public.lfg_comments;
create policy "lfgc_insert_own" on public.lfg_comments for insert
  with check (( select auth.uid() ) = user_id);
drop policy if exists "lfgc_select_all" on public.lfg_comments;
create policy "lfgc_select_all" on public.lfg_comments for select using (true);
drop policy if exists "lfgc_update_own" on public.lfg_comments;
create policy "lfgc_update_own" on public.lfg_comments for update
  using (( select auth.uid() ) = user_id);

drop policy if exists "lfq_delete_own" on public.lfg_queue;
create policy "lfq_delete_own" on public.lfg_queue for delete
  using (( select auth.uid() ) = user_id);
drop policy if exists "lfq_insert_own" on public.lfg_queue;
create policy "lfq_insert_own" on public.lfg_queue for insert
  with check (( select auth.uid() ) = user_id);
drop policy if exists "lfq_select_all" on public.lfg_queue;
create policy "lfq_select_all" on public.lfg_queue for select using (true);
drop policy if exists "lfq_update_own" on public.lfg_queue;
create policy "lfq_update_own" on public.lfg_queue for update
  using (( select auth.uid() ) = user_id);

drop policy if exists "mafia action logs select own rows" on public.mafia_action_logs;
create policy "mafia action logs select own rows" on public.mafia_action_logs for select to authenticated
  using (( select auth.uid() ) = actor_id or ( select auth.uid() ) = target_user_id);

drop policy if exists "mafia battle logs select own rows" on public.mafia_battle_logs;
create policy "mafia battle logs select own rows" on public.mafia_battle_logs for select to authenticated
  using (( select auth.uid() ) = attacker_id or ( select auth.uid() ) = defender_id);

drop policy if exists "mafia businesses select owner rows" on public.mafia_businesses;
create policy "mafia businesses select owner rows" on public.mafia_businesses for select to authenticated
  using (( select auth.uid() ) = owner_id);

drop policy if exists "mafia_districts_read" on public.mafia_districts;
create policy "mafia_districts_read" on public.mafia_districts for select using (true);

drop policy if exists "mafia feed select authenticated" on public.mafia_feed_events;
create policy "mafia feed select authenticated" on public.mafia_feed_events for select to authenticated
  using (true);

drop policy if exists "mafia players select own row" on public.mafia_players;
create policy "mafia players select own row" on public.mafia_players for select to authenticated
  using (( select auth.uid() ) = user_id);

drop policy if exists "mafia_plots_read" on public.mafia_plots;
create policy "mafia_plots_read" on public.mafia_plots for select using (true);

drop policy if exists "pl_delete_own" on public.post_likes;
create policy "pl_delete_own" on public.post_likes for delete
  using (( select auth.uid() ) = user_id);
drop policy if exists "pl_insert_own" on public.post_likes;
create policy "pl_insert_own" on public.post_likes for insert
  with check (( select auth.uid() ) = user_id);
drop policy if exists "pl_select_all" on public.post_likes;
create policy "pl_select_all" on public.post_likes for select using (true);

drop policy if exists "pr_delete_own" on public.post_reactions;
create policy "pr_delete_own" on public.post_reactions for delete
  using (( select auth.uid() ) = user_id);
drop policy if exists "pr_insert_own" on public.post_reactions;
create policy "pr_insert_own" on public.post_reactions for insert
  with check (( select auth.uid() ) = user_id);
drop policy if exists "pr_select_all" on public.post_reactions;
create policy "pr_select_all" on public.post_reactions for select using (true);

drop policy if exists "ps_delete_own" on public.push_subscriptions;
create policy "ps_delete_own" on public.push_subscriptions for delete
  using (( select auth.uid() ) = user_id);
drop policy if exists "ps_insert_own" on public.push_subscriptions;
create policy "ps_insert_own" on public.push_subscriptions for insert
  with check (( select auth.uid() ) = user_id);
drop policy if exists "ps_select_own" on public.push_subscriptions;
create policy "ps_select_own" on public.push_subscriptions for select
  using (( select auth.uid() ) = user_id);
drop policy if exists "ps_update_own" on public.push_subscriptions;
create policy "ps_update_own" on public.push_subscriptions for update
  using (( select auth.uid() ) = user_id);

drop policy if exists "rcm_delete_own" on public.room_chat_messages;
create policy "rcm_delete_own" on public.room_chat_messages for delete
  using (( select auth.uid() ) = user_id);
drop policy if exists "rcm_insert_own" on public.room_chat_messages;
create policy "rcm_insert_own" on public.room_chat_messages for insert
  with check (( select auth.uid() ) = user_id);
drop policy if exists "rcm_select_all" on public.room_chat_messages;
create policy "rcm_select_all" on public.room_chat_messages for select using (true);

drop policy if exists "shop_items_select_all" on public.shop_items;
create policy "shop_items_select_all" on public.shop_items for select using (true);

drop policy if exists "ugp_delete_own" on public.user_game_profiles;
create policy "ugp_delete_own" on public.user_game_profiles for delete
  using (( select auth.uid() ) = user_id);
drop policy if exists "ugp_insert_own" on public.user_game_profiles;
create policy "ugp_insert_own" on public.user_game_profiles for insert
  with check (( select auth.uid() ) = user_id);
drop policy if exists "ugp_select_all" on public.user_game_profiles;
create policy "ugp_select_all" on public.user_game_profiles for select using (true);
drop policy if exists "ugp_update_own" on public.user_game_profiles;
create policy "ugp_update_own" on public.user_game_profiles for update
  using (( select auth.uid() ) = user_id);

drop policy if exists "ui_delete_own" on public.user_inventory;
create policy "ui_delete_own" on public.user_inventory for delete
  using (( select auth.uid() ) = user_id);
drop policy if exists "ui_insert_own" on public.user_inventory;
create policy "ui_insert_own" on public.user_inventory for insert
  with check (( select auth.uid() ) = user_id);
drop policy if exists "ui_select_own" on public.user_inventory;
create policy "ui_select_own" on public.user_inventory for select
  using (( select auth.uid() ) = user_id);
drop policy if exists "ui_update_own" on public.user_inventory;
create policy "ui_update_own" on public.user_inventory for update
  using (( select auth.uid() ) = user_id);

drop policy if exists "um_delete_own" on public.user_mutes;
create policy "um_delete_own" on public.user_mutes for delete
  using (( select auth.uid() ) = user_id);
drop policy if exists "um_insert_own" on public.user_mutes;
create policy "um_insert_own" on public.user_mutes for insert
  with check (( select auth.uid() ) = user_id);
drop policy if exists "um_select_own" on public.user_mutes;
create policy "um_select_own" on public.user_mutes for select
  using (( select auth.uid() ) = user_id);

-- ── Columns that exist live but were never added by a migration ────────────
-- NB: no `alter table IF EXISTS` here on purpose. The replay harness is
-- dependency-tolerant multi-pass: it relies on a statement ERRORING (so the
-- whole migration defers to a later pass) when a referenced table doesn't
-- exist yet. `if exists` would instead SILENTLY SKIP on the pass where e.g.
-- pm_facilities / pm_match_settings haven't been created yet, permanently
-- dropping the column from a from-scratch rebuild. Plain `alter table` makes
-- this migration defer until every referenced table exists, then apply cleanly.
alter table public.games            add column if not exists cover_url text;
alter table public.lfg_posts        add column if not exists game_id uuid references public.games(id) on delete cascade;
alter table public.lfg_posts        add column if not exists rank_min varchar(64);
alter table public.lfg_posts        add column if not exists rank_max varchar(64);
alter table public.pm_facilities    add column if not exists last_action_week smallint not null default 0;
alter table public.pm_facilities    add column if not exists last_action_day smallint not null default 0;
alter table public.pm_match_settings add column if not exists formation text not null default '4-3-3';
alter table public.pm_squads        add column if not exists squad_number smallint;
alter table public.profiles         add column if not exists ban_expires_at timestamptz;
alter table public.profiles         add column if not exists daily_streak_count integer not null default 0;
alter table public.profiles         add column if not exists email varchar(255);

-- ── Column a migration declares but that was never actually applied live
--    (the table pre-existed when that `create table if not exists` ran) ────
-- src/app/api/news/[slug]/comments/route.ts already documents this: threaded
-- replies are flat because parent_id does not exist. Drop it from a from-
-- scratch rebuild too, so replay matches live instead of silently diverging.
alter table if exists public.news_comments drop column if exists parent_id;
