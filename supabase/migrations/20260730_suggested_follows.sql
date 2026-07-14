-- Discovery: "people you may know" follow suggestions.
--
-- The empty-feed seed (lib/home/feed-seed.ts) only surfaced the highest-level
-- players — a naive heuristic that ignores the social graph and never grew it
-- for established users. This RPC powers a persistent sidebar widget shown to
-- ALL signed-in users, ranking candidates by:
--   * friends-of-friends — how many people you already follow also follow them
--     (the strongest "you probably know them" signal), and
--   * shared favorite games — overlap on profiles.favorite_game_slugs.
-- score = mutual_count*3 + shared_games*2, tie-broken by level then recency.
--
-- SECURITY INVOKER (the default): follows + profiles are public-select, so no
-- elevated privilege is needed and there is no grant-leak surface to revoke.
-- Block exclusion is single-direction on purpose: user_blocks RLS only exposes
-- blocks the caller made (blocker_id = auth.uid()), so we can reliably hide
-- people the caller blocked. The reverse direction (people who blocked the
-- caller) is invisible under INVOKER and is intentionally not attempted rather
-- than written as a silent no-op — it would only matter for a rare edge case
-- over already-public profile data, not worth a SECURITY DEFINER escalation.
create or replace function public.get_suggested_follows(
  p_user uuid,
  p_limit int default 6
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  level int,
  last_seen_at timestamptz,
  mutual_count int,
  shared_games int
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with me as (
    select coalesce(favorite_game_slugs, '{}') as games
    from public.profiles
    where id = p_user
  ),
  my_following as (
    select following_id from public.follows where follower_id = p_user
  ),
  fof as (
    select f.following_id as cand, count(*)::int as mutual_count
    from public.follows f
    where f.follower_id in (select following_id from my_following)
    group by f.following_id
  ),
  scored as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.level,
      p.last_seen_at,
      coalesce(fof.mutual_count, 0) as mutual_count,
      coalesce((
        select count(*)::int
        from (
          select unnest(coalesce(p.favorite_game_slugs, '{}'::text[]))
          intersect
          select unnest((select games from me))
        ) s
      ), 0) as shared_games
    from public.profiles p
    left join fof on fof.cand = p.id
    where p.id <> p_user
      and p.banned = false
      and p.username is not null
      and p.id not in (select following_id from my_following)
      and not exists (
        select 1 from public.user_blocks b
        where b.blocker_id = p_user and b.blocked_id = p.id
      )
      and (
        fof.cand is not null
        or p.favorite_game_slugs && (select games from me)
      )
  )
  select id, username, display_name, avatar_url, level, last_seen_at, mutual_count, shared_games
  from scored
  order by (mutual_count * 3 + shared_games * 2) desc,
           level desc nulls last,
           last_seen_at desc nulls last
  limit greatest(p_limit, 0);
$$;
