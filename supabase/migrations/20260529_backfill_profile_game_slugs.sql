-- Keep profile game lists visible for existing users who chose a main game or
-- only have historical LFG activity from before favorite_game_slugs was used.

update public.profiles
set favorite_game_slugs = array[main_game_slug]
where coalesce(array_length(favorite_game_slugs, 1), 0) = 0
  and main_game_slug is not null
  and main_game_slug <> '';

with inferred_games as (
  select
    p.id,
    array_agg(distinct lp.game_slug order by lp.game_slug) as game_slugs
  from public.profiles p
  join public.lfg_posts lp on lp.author_id = p.id
  where coalesce(array_length(p.favorite_game_slugs, 1), 0) = 0
    and lp.game_slug is not null
    and lp.game_slug <> ''
  group by p.id
)
update public.profiles p
set favorite_game_slugs = inferred_games.game_slugs
from inferred_games
where p.id = inferred_games.id;
