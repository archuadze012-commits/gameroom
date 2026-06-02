-- Performance pass (applied to production rpmzlkjqyncusbptzics)
-- Driven by Supabase performance advisor. WARN findings 107 -> 37.

-- 1. Missing foreign-key indexes (41). FKs without a covering index force
--    sequential scans on joins/filters and slow cascade checks.
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON public.announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON public.announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_author_id ON public.chat_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_deleted_by ON public.chat_messages(deleted_by);
CREATE INDEX IF NOT EXISTS idx_clan_members_user_id ON public.clan_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clan_requests_user_id ON public.clan_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_clans_created_by ON public.clans(created_by);
CREATE INDEX IF NOT EXISTS idx_cracked_games_created_by ON public.cracked_games(created_by);
CREATE INDEX IF NOT EXISTS idx_featured_content_created_by ON public.featured_content(created_by);
CREATE INDEX IF NOT EXISTS idx_forum_categories_game_id ON public.forum_categories(game_id);
CREATE INDEX IF NOT EXISTS idx_forum_likes_user_id ON public.forum_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON public.forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author_id ON public.forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_lfg_comments_user_id ON public.lfg_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_lfg_queue_matched_conversation_id ON public.lfg_queue(matched_conversation_id);
CREATE INDEX IF NOT EXISTS idx_lfg_queue_matched_with ON public.lfg_queue(matched_with);
CREATE INDEX IF NOT EXISTS idx_lfg_responses_user_id ON public.lfg_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_author_id ON public.moderation_queue(author_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_resolved_by ON public.moderation_queue(resolved_by);
CREATE INDEX IF NOT EXISTS idx_news_articles_author_id ON public.news_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_game_id ON public.news_articles(game_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_article_id ON public.news_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_user_id ON public.news_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_content_pinned_by ON public.pinned_content(pinned_by);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON public.post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_deleted_by ON public.posts(deleted_by);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_resolved_by ON public.reports(resolved_by);
CREATE INDEX IF NOT EXISTS idx_site_content_updated_by ON public.site_content(updated_by);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player1_id ON public.tournament_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player2_id ON public.tournament_matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_winner_id ON public.tournament_matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON public.tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON public.tournaments(created_by);
CREATE INDEX IF NOT EXISTS idx_tournaments_winner_id ON public.tournaments(winner_id);
CREATE INDEX IF NOT EXISTS idx_user_equipped_item_id ON public.user_equipped(item_id);
CREATE INDEX IF NOT EXISTS idx_user_game_profiles_game_id ON public.user_game_profiles(game_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muted_by ON public.user_mutes(muted_by);
CREATE INDEX IF NOT EXISTS idx_user_purchases_item_id ON public.user_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_granted_by ON public.wallet_transactions(granted_by);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);

-- 2. Duplicate indexes (2). Each pair indexed the same columns identically.
DROP INDEX IF EXISTS public.conversation_messages_conv_idx;   -- dup of idx_conversation_messages_conversation_created
DROP INDEX IF EXISTS public.forum_thread_slug_unique;         -- dup of forum_thread_slug_cat_unique

-- 3. RLS initplan (68): wrap bare auth.uid()/auth.jwt()/auth.role() calls in a
--    scalar subselect so Postgres evaluates them ONCE per query instead of
--    once per row. Applied data-driven across every public policy. Idempotent:
--    the case-insensitive lookbehind skips calls already wrapped.
DO $$
DECLARE
  r record;
  new_qual text;
  new_wcheck text;
  stmt text;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, p.polname AS name,
           pg_get_expr(p.polqual, p.polrelid) AS qual,
           pg_get_expr(p.polwithcheck, p.polrelid) AS wcheck
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  LOOP
    new_qual := CASE WHEN r.qual IS NOT NULL
      THEN regexp_replace(r.qual, '(?<!select )auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'gi') END;
    new_wcheck := CASE WHEN r.wcheck IS NOT NULL
      THEN regexp_replace(r.wcheck, '(?<!select )auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'gi') END;
    IF (r.qual IS DISTINCT FROM new_qual) OR (r.wcheck IS DISTINCT FROM new_wcheck) THEN
      stmt := format('ALTER POLICY %I ON public.%I', r.name, r.tbl);
      IF new_qual IS NOT NULL THEN stmt := stmt || format(' USING (%s)', new_qual); END IF;
      IF new_wcheck IS NOT NULL THEN stmt := stmt || format(' WITH CHECK (%s)', new_wcheck); END IF;
      EXECUTE stmt;
    END IF;
  END LOOP;
END $$;

-- NOT done (intentional):
--  * multiple_permissive_policies (37, WARN) — consolidating overlapping
--    policies changes access logic; needs per-table review, deferred.
--  * unused_index (INFO) — the new FK indexes read as "unused" only because the
--    DB has no query history yet. Do NOT drop indexes on a young database.
