-- PlayManager: behavioural attribute layer (player identity, NOT on the card).
-- Six 1–99 attributes describing HOW a player behaves, derived from the rating
-- layer (card stats + TAC) + age/talent. Stored as jsonb. Every player gets values
-- (ovr fallback when card_stats is null). Shown on the player page; consistency
-- damps each player's match-rating variance (pm_match_player_events).
--
--   composure / vision / stamina / positioning / aggression / consistency

alter table public.pm_players
  add column if not exists behavioral jsonb not null default '{}'::jsonb;

update public.pm_players p
set behavioral = jsonb_build_object(
  'composure',   greatest(1, least(99, round(p.ovr_current + (coalesce(p.tac,60) - 60) * 0.30 + (coalesce((p.card_stats->>'SHO')::numeric, p.ovr_current) - p.ovr_current) * 0.40)))::int,
  'vision',      greatest(1, least(99, round(p.ovr_current + (coalesce((p.card_stats->>'PAS')::numeric, p.ovr_current) - p.ovr_current) * 0.55 + (coalesce((p.card_stats->>'DRI')::numeric, p.ovr_current) - p.ovr_current) * 0.25)))::int,
  'stamina',     greatest(1, least(99, round(p.ovr_current + (coalesce((p.card_stats->>'PHY')::numeric, p.ovr_current) - p.ovr_current) * 0.45 + (coalesce((p.card_stats->>'PAC')::numeric, p.ovr_current) - p.ovr_current) * 0.15 - greatest(0, p.age - 30) * 1.5)))::int,
  'positioning', greatest(1, least(99, round(p.ovr_current + (coalesce(p.tac,60) - 60) * 0.40
                   + case when upper(coalesce(p.primary_position,'CM')) in ('CB','LB','RB','LWB','RWB','CDM','GK')
                          then (coalesce((p.card_stats->>'DEF')::numeric, p.ovr_current) - p.ovr_current) * 0.30
                          else (coalesce((p.card_stats->>'SHO')::numeric, p.ovr_current) - p.ovr_current) * 0.25 end)))::int,
  'aggression',  greatest(1, least(99, round(p.ovr_current + (coalesce((p.card_stats->>'PHY')::numeric, p.ovr_current) - p.ovr_current) * 0.40 + (coalesce((p.card_stats->>'DEF')::numeric, p.ovr_current) - p.ovr_current) * 0.30)))::int,
  'consistency', greatest(1, least(99, round(45 + coalesce(p.talent,5) * 3.5 + (coalesce(p.tac,60) - 60) * 0.30)))::int
)
where p.ovr_current is not null;

-- Match ratings now read consistency: steadier players swing less match-to-match.
create or replace function public.pm_match_player_events(
  p_team_id uuid,
  p_home_goals integer,
  p_result text
) returns jsonb
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  with xi as (
    select
      p.id,
      p.display_name as name,
      upper(coalesce(s.position, p.primary_position, 'CM')) as pos,
      coalesce(p.ovr_current, 60)::numeric as ovr,
      coalesce((p.behavioral->>'consistency')::numeric, 60) as consistency,
      (case upper(coalesce(s.position, p.primary_position, 'CM'))
        when 'ST' then 1.00 when 'CF' then 1.00
        when 'LW' then 0.70 when 'RW' then 0.70
        when 'CAM' then 0.65
        when 'LM' then 0.50 when 'RM' then 0.50
        when 'CM' then 0.45
        when 'CDM' then 0.25
        when 'LB' then 0.20 when 'RB' then 0.20 when 'LWB' then 0.20 when 'RWB' then 0.20
        when 'CB' then 0.15
        when 'GK' then 0.02
        else 0.40
      end + 0.05) as weight
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id
      and coalesce(s.shirt_number, 99) <= 11
      and coalesce(p.status, 'active') = 'active'
      and coalesce(p.injury_matches, 0) = 0
  ),
  avg_ovr as (select coalesce(avg(ovr), 70) as a from xi),
  goals as materialized (
    select picked.id, picked.name
    from generate_series(1, greatest(0, coalesce(p_home_goals, 0))) gs(n)
    cross join lateral (
      select id, name from xi order by -ln(random()) / weight limit 1
    ) picked
  ),
  goal_counts as (
    select id, name, count(*)::int as c from goals group by id, name
  ),
  rated as (
    select
      x.id, x.name, x.pos,
      round(greatest(5.0, least(10.0,
        6.4
        + coalesce(gc.c, 0) * 0.9
        + case p_result when 'W' then 0.5 when 'L' then -0.3 else 0 end
        + (x.ovr - (select a from avg_ovr)) * 0.04
        + (random() - 0.5) * 0.6 * (1 - x.consistency / 100.0 * 0.6)
      ))::numeric, 1) as rating
    from xi x
    left join goal_counts gc on gc.id = x.id
  )
  select jsonb_build_object(
    'goalscorers', (
      select coalesce(jsonb_agg(jsonb_build_object('playerId', id, 'name', name, 'goals', c) order by c desc, name), '[]'::jsonb)
      from goal_counts
    ),
    'ratings', (
      select coalesce(jsonb_agg(jsonb_build_object('playerId', id, 'name', name, 'position', pos, 'rating', rating) order by rating desc, name), '[]'::jsonb)
      from rated
    )
  );
$$;

grant execute on function public.pm_match_player_events(uuid, integer, text) to service_role;
