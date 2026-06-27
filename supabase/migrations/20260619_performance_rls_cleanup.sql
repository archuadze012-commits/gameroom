-- Performance cleanup for RLS initplan and overlapping permissive policies.

-- articles
drop policy if exists "articles_author_all" on public.articles;
create policy "articles_author_insert"
on public.articles
for insert
to authenticated
with check ((select auth.uid()) = author_id);
create policy "articles_author_update"
on public.articles
for update
to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);
create policy "articles_author_delete"
on public.articles
for delete
to authenticated
using ((select auth.uid()) = author_id);

-- tournaments
drop policy if exists "tournament_admin_insert" on public.tournaments;
create policy "tournament_admin_insert"
on public.tournaments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['admin'::public.user_role, 'organizer'::public.user_role])
  )
);

drop policy if exists "tournament_admin_update" on public.tournaments;
create policy "tournament_admin_update"
on public.tournaments
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['admin'::public.user_role, 'organizer'::public.user_role])
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['admin'::public.user_role, 'organizer'::public.user_role])
  )
);

drop policy if exists "tournament_admin_delete" on public.tournaments;
create policy "tournament_admin_delete"
on public.tournaments
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['admin'::public.user_role, 'organizer'::public.user_role])
  )
);

-- user_challenge_progress
drop policy if exists "Users can insert their own progress" on public.user_challenge_progress;
create policy "Users can insert their own progress"
on public.user_challenge_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own progress" on public.user_challenge_progress;
create policy "Users can update their own progress"
on public.user_challenge_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own progress" on public.user_challenge_progress;
create policy "Users can view their own progress"
on public.user_challenge_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

-- playmanager owner selects
drop policy if exists "pm_wallets_owner_select" on public.pm_wallets;
create policy "pm_wallets_owner_select" on public.pm_wallets
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_transactions_owner_select" on public.pm_transactions;
create policy "pm_transactions_owner_select" on public.pm_transactions
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_squads_owner_select" on public.pm_squads;
create policy "pm_squads_owner_select" on public.pm_squads
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_pack_openings_owner_select" on public.pm_pack_openings;
create policy "pm_pack_openings_owner_select" on public.pm_pack_openings
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_calendar_owner_select" on public.pm_calendar;
create policy "pm_calendar_owner_select" on public.pm_calendar
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_event_feed_owner_select" on public.pm_event_feed;
create policy "pm_event_feed_owner_select" on public.pm_event_feed
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_finance_state_owner_select" on public.pm_finance_state;
create policy "pm_finance_state_owner_select" on public.pm_finance_state
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_market_shortlist_owner_select" on public.pm_market_shortlist;
create policy "pm_market_shortlist_owner_select" on public.pm_market_shortlist
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_match_settings_owner_select" on public.pm_match_settings;
create policy "pm_match_settings_owner_select" on public.pm_match_settings
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_season_rows_owner_select" on public.pm_season_rows;
create policy "pm_season_rows_owner_select" on public.pm_season_rows
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_season_state_owner_select" on public.pm_season_state;
create policy "pm_season_state_owner_select" on public.pm_season_state
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_team_assets_owner_select" on public.pm_team_assets;
create policy "pm_team_assets_owner_select" on public.pm_team_assets
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_player_position_unlocks_owner_select" on public.pm_player_position_unlocks;
create policy "pm_player_position_unlocks_owner_select" on public.pm_player_position_unlocks
for select to authenticated
using (team_id in (select id from public.pm_teams where user_id = (select auth.uid())));

drop policy if exists "pm_teams_owner_insert" on public.pm_teams;
create policy "pm_teams_owner_insert" on public.pm_teams
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "pm_teams_owner_select" on public.pm_teams;
create policy "pm_teams_owner_select" on public.pm_teams
for select to authenticated
using ((user_id = (select auth.uid())) or (is_bot = true));

-- reduce overlapping permissive policies
drop policy if exists "news_admin_all" on public.news_articles;
create policy "news_admin_insert" on public.news_articles
for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.user_role
  )
);
create policy "news_admin_update" on public.news_articles
for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.user_role
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.user_role
  )
);
create policy "news_admin_delete" on public.news_articles
for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.user_role
  )
);

drop policy if exists "pinned_admin_write" on public.pinned_content;
create policy "pinned_admin_insert" on public.pinned_content
for insert to authenticated
with check (private.is_admin());
create policy "pinned_admin_update" on public.pinned_content
for update to authenticated
using (private.is_admin())
with check (private.is_admin());
create policy "pinned_admin_delete" on public.pinned_content
for delete to authenticated
using (private.is_admin());

drop policy if exists "site_content_admin_write" on public.site_content;
create policy "site_content_admin_insert" on public.site_content
for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.user_role
  )
);
create policy "site_content_admin_update" on public.site_content
for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.user_role
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.user_role
  )
);
create policy "site_content_admin_delete" on public.site_content
for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.user_role
  )
);

drop policy if exists "tm_admin_write" on public.tournament_matches;
create policy "tm_admin_insert" on public.tournament_matches
for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['admin'::public.user_role, 'organizer'::public.user_role])
  )
);
create policy "tm_admin_update" on public.tournament_matches
for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['admin'::public.user_role, 'organizer'::public.user_role])
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['admin'::public.user_role, 'organizer'::public.user_role])
  )
);
create policy "tm_admin_delete" on public.tournament_matches
for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['admin'::public.user_role, 'organizer'::public.user_role])
  )
);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_update" on public.profiles
for update to authenticated
using (private.is_admin())
with check (private.is_admin());
create policy "profiles_admin_delete" on public.profiles
for delete to authenticated
using (private.is_admin());

drop policy if exists "ue_select_all" on public.user_equipped;
drop policy if exists "up_select_own" on public.user_purchases;
drop policy if exists "wt_select_own" on public.wallet_transactions;

drop policy if exists "mq_admin_all" on public.moderation_queue;
create policy "mq_admin_select" on public.moderation_queue
for select to authenticated
using (private.is_admin());
create policy "mq_admin_update" on public.moderation_queue
for update to authenticated
using (private.is_admin())
with check (private.is_admin());
create policy "mq_admin_delete" on public.moderation_queue
for delete to authenticated
using (private.is_admin());

