-- Resilience pass: move public/own read pages off the admin (service-role)
-- client and onto the anon/RLS server client, so a missing/invalid
-- SUPABASE_SERVICE_ROLE_KEY no longer blanks these pages.
--
-- Two reads previously relied on the admin client to bypass RLS and are the
-- only ones that couldn't simply move to the server client as-is:
--
--  1. Leaderboard "Top Earners (Coins)". `wallets` SELECT is owner-only
--     (wallets_select_own: auth.uid() = user_id), so the anon/server client
--     can't aggregate the top balances. get_top_wallets() is a public-safe
--     SECURITY DEFINER aggregate (mirrors get_top_referrers): it returns only
--     the public-safe profile columns already shown on the public leaderboard
--     plus nc_balance, never exposing per-row wallet ownership beyond the
--     ranking the page already renders. Client-executable by design (the public
--     leaderboard reads it directly, incl. logged-out viewers) and allowlisted
--     in scripts/audit-security-definer.mjs.
--
--  2. Settings referral-redeem gate reads the caller's *referred-side* referral
--     row. referrals had only referrals_select_own (referrer_id = auth.uid()),
--     so a user couldn't read the row where they are the referred party. That's
--     legitimately their own data (it tells them who invited them), so instead
--     of a DEFINER shim we add an RLS SELECT policy for the referred side — the
--     server client then reads it directly under RLS.

-- ── get_top_wallets ──────────────────────────────────────────────────────────
create or replace function public.get_top_wallets(p_limit integer default 20)
returns table(
  username text,
  display_name text,
  avatar_url text,
  is_verified boolean,
  nc_balance integer
)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select p.username, p.display_name, p.avatar_url, p.is_verified, w.nc_balance
  from public.wallets w
  join public.profiles p on p.id = w.user_id
  where coalesce(p.banned, false) = false
  order by w.nc_balance desc nulls last, p.username asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.get_top_wallets(integer) from public, anon, authenticated;
grant execute on function public.get_top_wallets(integer) to anon, authenticated;

-- ── clan_announcement_teaser ─────────────────────────────────────────────────
-- Non-member clan pages show a social-proof teaser (how many announcements a
-- clan has + how fresh) — metadata only, never body text. clan_announcements
-- SELECT is member-only under RLS, so the anon/server client can't read even
-- the count. This DEFINER aggregate exposes ONLY (count, latest_at) — the exact
-- non-sensitive metadata the page already surfaced via the admin client — and
-- nothing about announcement content. Client-executable by design (anon/member
-- both view clan pages) and allowlisted in scripts/audit-security-definer.mjs.
-- plpgsql (not sql) so the body isn't catalog-checked at CREATE time:
-- clan_announcements is a live-only table not reconstructed in the migration
-- tree, so a fresh replay would otherwise fail resolving it. plpgsql defers
-- name resolution to first execution, where the table exists on live.
create or replace function public.clan_announcement_teaser(p_clan_id uuid)
returns table(cnt integer, latest_at timestamptz)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  return query
    select count(*)::integer, max(created_at)::timestamptz
    from public.clan_announcements
    where clan_id = p_clan_id;
end;
$$;

revoke all on function public.clan_announcement_teaser(uuid) from public, anon, authenticated;
grant execute on function public.clan_announcement_teaser(uuid) to anon, authenticated;

-- ── referrals: referred-side read ────────────────────────────────────────────
drop policy if exists referrals_select_referred on public.referrals;
create policy referrals_select_referred on public.referrals
  for select to authenticated
  using ((select auth.uid()) = referred_id);
