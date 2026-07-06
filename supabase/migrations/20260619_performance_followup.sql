drop policy if exists "pm_match_history_owner_select" on public.pm_match_history;
create policy "pm_match_history_owner_select"
on public.pm_match_history
for select
to authenticated
using (
  team_id in (
    select id
    from public.pm_teams
    where user_id = (select auth.uid())
  )
);

drop policy if exists "pm_academy_prospects_owner_select" on public.pm_academy_prospects;
create policy "pm_academy_prospects_owner_select"
on public.pm_academy_prospects
for select
to authenticated
using (
  team_id in (
    select id
    from public.pm_teams
    where user_id = (select auth.uid())
  )
);

drop policy if exists "pm_facilities_owner_select" on public.pm_facilities;
create policy "pm_facilities_owner_select"
on public.pm_facilities
for select
to authenticated
using (
  team_id in (
    select id
    from public.pm_teams
    where user_id = (select auth.uid())
  )
);

drop policy if exists "Allow read access for all" on public.daily_challenges;

drop policy if exists "featured_admin_write" on public.featured_content;
create policy "featured_admin_insert"
on public.featured_content
for insert
to authenticated
with check (private.is_admin());

create policy "featured_admin_update"
on public.featured_content
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "featured_admin_delete"
on public.featured_content
for delete
to authenticated
using (private.is_admin());

drop policy if exists "forum_cat_admin_write" on public.forum_categories;
create policy "forum_cat_admin_insert"
on public.forum_categories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

create policy "forum_cat_admin_update"
on public.forum_categories
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

create policy "forum_cat_admin_delete"
on public.forum_categories
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "games_admin_write" on public.games;

drop policy if exists "lfg_posts_insert_own" on public.lfg_posts;

drop policy if exists "la_select_own" on public.linked_accounts;

drop index if exists public.mafia_plots_district_tile_unique;

-- mafia_* was dropped 2026-07-27 (orphaned schema, no application code ever
-- read/wrote it). Guarded on existence so this migration still replays cleanly
-- both before and after that drop, regardless of pass ordering.
do $$ begin
  if to_regclass('public.mafia_action_logs') is not null then
    create index if not exists mafia_action_logs_target_user_id_idx
    on public.mafia_action_logs (target_user_id);
  end if;
  if to_regclass('public.mafia_battle_logs') is not null then
    create index if not exists mafia_battle_logs_winner_id_idx
    on public.mafia_battle_logs (winner_id);
  end if;
  if to_regclass('public.mafia_feed_events') is not null then
    create index if not exists mafia_feed_events_target_user_id_idx
    on public.mafia_feed_events (target_user_id);
  end if;
end $$;

create index if not exists pm_cup_instances_template_id_idx
on public.pm_cup_instances (template_id);

create index if not exists pm_cup_matches_team1_id_idx
on public.pm_cup_matches (team1_id);

create index if not exists pm_cup_matches_team2_id_idx
on public.pm_cup_matches (team2_id);

create index if not exists pm_cup_matches_winner_id_idx
on public.pm_cup_matches (winner_id);

create index if not exists pm_cup_participants_team_id_idx
on public.pm_cup_participants (team_id);

create index if not exists pm_pack_openings_pack_id_idx
on public.pm_pack_openings (pack_id);

create index if not exists pm_pack_openings_team_id_idx
on public.pm_pack_openings (team_id);

create index if not exists pm_player_position_unlocks_player_id_idx
on public.pm_player_position_unlocks (player_id);

create index if not exists pm_teams_division_id_idx
on public.pm_teams (division_id);

create index if not exists shop_products_created_by_idx
on public.shop_products (created_by);

create index if not exists user_challenge_progress_challenge_id_idx
on public.user_challenge_progress (challenge_id);
