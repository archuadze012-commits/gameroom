-- Migration-drift reconciliation, part 3: RLS policies on tables that ALREADY
-- had RLS enabled (a deeper drift layer than part 1, which handled tables whose
-- RLS was off entirely). A live-vs-replay policy diff found:
--   • 21 policies that exist in production but that a from-scratch rebuild lacks
--     — a rebuild would be BROKEN (missing INSERT/UPDATE/DELETE policies means
--     RLS default-deny blocks those ops: users couldn't comment, equip items,
--     get a wallet row, file a report, etc.), and
--   • 7 policies a rebuild creates that production no longer has (renamed or
--     replaced directly on live — e.g. owner-only reads that were widened to
--     public reads, or a single ALL policy later split into per-command ones).
-- Reconcile both directions so a rebuilt DB's policy set is identical to prod.
-- All definitions below are copied verbatim from live introspection.

-- ── Drop the 3 stale-named policies whose LAST re-creator applies no later
--    than this file in the replay (safe to drop here). The other 4 stale
--    policies (pm_squads/pm_teams owner_select, the two profiles ones) are
--    re-created by 20260619_performance_rls_cleanup on a LATER replay pass, so
--    their drop is deferred to 20260724_drift_final_policy_drops.sql, which is
--    gated to run after that migration. ─────────────────────────────────────
drop policy if exists "post_comments_insert_own"      on public.post_comments;    -- live: pc_insert_own
drop policy if exists "post_comments_select_auth"     on public.post_comments;    -- live: pc_select_all
drop policy if exists "tournament_admin_write"        on public.tournaments;      -- live: split into admin_insert/update/delete

-- ── Create the 21 policies that exist live but no migration declares ────────
drop policy if exists "articles_public_read" on public.articles;
create policy "articles_public_read" on public.articles for select using (published = true);

drop policy if exists "blocked_words_select_all" on public.blocked_words;
create policy "blocked_words_select_all" on public.blocked_words for select using (true);

drop policy if exists "cracked_games_select_all" on public.cracked_games;
create policy "cracked_games_select_all" on public.cracked_games for select using (true);

drop policy if exists "featured_select_all" on public.featured_content;
create policy "featured_select_all" on public.featured_content for select using (true);

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows for delete using (( select auth.uid() ) = follower_id);
drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all" on public.follows for select using (true);

drop policy if exists "mq_insert_auth" on public.moderation_queue;
create policy "mq_insert_auth" on public.moderation_queue for insert with check (( select auth.uid() ) is not null);

drop policy if exists "pinned_select_all" on public.pinned_content;
create policy "pinned_select_all" on public.pinned_content for select using (true);

drop policy if exists "pc_delete_own" on public.post_comments;
create policy "pc_delete_own" on public.post_comments for delete using (( select auth.uid() ) = author_id);
drop policy if exists "pc_insert_own" on public.post_comments;
create policy "pc_insert_own" on public.post_comments for insert with check (( select auth.uid() ) = author_id);
drop policy if exists "pc_select_all" on public.post_comments;
create policy "pc_select_all" on public.post_comments for select using (true);
drop policy if exists "pc_update_own" on public.post_comments;
create policy "pc_update_own" on public.post_comments for update using (( select auth.uid() ) = author_id);

drop policy if exists "posts_select_all" on public.posts;
create policy "posts_select_all" on public.posts for select using (true);

drop policy if exists "rep_insert_auth" on public.reports;
create policy "rep_insert_auth" on public.reports for insert with check (( select auth.uid() ) = reporter_id);

drop policy if exists "ue_delete_own" on public.user_equipped;
create policy "ue_delete_own" on public.user_equipped for delete using (( select auth.uid() ) = user_id);
drop policy if exists "ue_insert_own" on public.user_equipped;
create policy "ue_insert_own" on public.user_equipped for insert with check (( select auth.uid() ) = user_id);
drop policy if exists "ue_update_own" on public.user_equipped;
create policy "ue_update_own" on public.user_equipped for update using (( select auth.uid() ) = user_id);

drop policy if exists "up_insert_own" on public.user_purchases;
create policy "up_insert_own" on public.user_purchases for insert with check (( select auth.uid() ) = user_id);

drop policy if exists "wt_insert_own" on public.wallet_transactions;
create policy "wt_insert_own" on public.wallet_transactions for insert with check (( select auth.uid() ) = user_id);

drop policy if exists "wallets_insert_own" on public.wallets;
create policy "wallets_insert_own" on public.wallets for insert with check (( select auth.uid() ) = user_id);
drop policy if exists "wallets_update_own" on public.wallets;
create policy "wallets_update_own" on public.wallets for update using (( select auth.uid() ) = user_id);
