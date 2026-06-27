-- PlayManager match engine — automatic substitutions.
--
-- Until now the sim always fielded the nominal XI (pm_squads.shirt_number <= 11).
-- An injured starter stayed on the pitch carrying a flat −18 effective-rating
-- penalty, and the bench (shirt 12+) was never used. A real manager would sub the
-- crocked player off.
--
-- pm_team_match_profile now assembles the best AVAILABLE XI before kickoff:
--   • healthy nominal starters play as normal;
--   • each injured/unavailable starter is auto-replaced by the best healthy depth
--     player (shirt 12+), who inherits the starter's SLOT — so position-fit (the
--     20260630 mechanic) applies to the substitute in that slot;
--   • if no healthy cover exists for a slot, the injured starter still plays,
--     penalised as before (you fielded a crock because the bench was empty).
--
-- The list of pre-match auto-subs is emitted as `autoSubs` in the profile JSON, so
-- it rides along inside matchEngine.profile and the post-match modal can show it.
-- Substitutes are picked by raw OVR (best cover first); a future pass can weight by
-- position-fit per open slot.

create or replace function public.pm_team_match_profile(
  p_team_id uuid
) returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with settings as (
    select
      coalesce(ms.tactical_style, 'balanced') as tactical_style,
      coalesce(ms.defensive_line, 'mid') as defensive_line,
      coalesce(ms.tempo, 'balanced') as tempo,
      coalesce(ms.focus_side, 'center') as focus_side
    from (select p_team_id as team_id) seed
    left join public.pm_match_settings ms on ms.team_id = seed.team_id
  ),
  squad as (
    select
      coalesce(s.shirt_number, 99) as shirt,
      upper(coalesce(s.position, p.primary_position, 'CM')) as slot,
      coalesce(p.primary_position, s.position, 'CM') as natural_pos,
      p.id,
      p.display_name,
      coalesce(p.ovr_current, 60)::numeric as ovr,
      coalesce(p.tac, 60)::numeric as tac,
      coalesce(p.fatigue, 0)::numeric as fatigue,
      coalesce(p.morale, 70)::numeric as morale,
      coalesce(p.injury_matches, 0) as injury_matches,
      coalesce(p.status, 'active') as status,
      (coalesce(p.injury_matches, 0) > 0 or coalesce(p.status, 'active') = 'injured') as unavailable,
      coalesce(p.card_stats, public.pm_player_seed_card_stats(upper(coalesce(s.position, p.primary_position, 'CM')), coalesce(p.ovr_current, 60)::smallint)) as stats
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id
  ),
  nominal_xi as (
    select * from squad where shirt <= 11
  ),
  injured_starters as (
    select *, row_number() over (order by ovr asc, id) as rn
    from nominal_xi
    where unavailable
  ),
  bench_pool as (
    select *, row_number() over (order by ovr desc, id) as rn
    from squad
    where shirt > 11 and not unavailable
  ),
  -- Pair each injured starter (weakest first) with the best free cover.
  subs as (
    select
      i.slot as slot,
      i.display_name as out_name,
      b.display_name as in_name,
      b.natural_pos as in_natural,
      b.ovr as in_ovr,
      b.tac as in_tac,
      b.fatigue as in_fatigue,
      b.morale as in_morale,
      b.stats as in_stats
    from injured_starters i
    join bench_pool b on b.rn = i.rn
  ),
  -- Effective XI = healthy starters + substitutes (in the vacated slot) +
  -- injured starters for whom no cover was available.
  effective as (
    select slot, natural_pos, ovr, tac, fatigue, morale, injury_matches, status, stats
    from nominal_xi
    where not unavailable
    union all
    select slot, in_natural, in_ovr, in_tac, in_fatigue, in_morale, 0, 'active', in_stats
    from subs
    union all
    select i.slot, i.natural_pos, i.ovr, i.tac, i.fatigue, i.morale, i.injury_matches, i.status, i.stats
    from injured_starters i
    where not exists (select 1 from bench_pool b where b.rn = i.rn)
  ),
  starters as (
    select
      slot as pos,
      public.pm_position_fit(natural_pos, slot) as pos_fit,
      ovr,
      tac,
      fatigue,
      morale,
      injury_matches,
      status,
      stats
    from effective
  ),
  rated as (
    select
      pos,
      tac,
      pos_fit,
      greatest(20, least(105, ovr - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as eff_ovr,
      greatest(20, least(105, coalesce((stats->>'PAC')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as pac,
      greatest(20, least(105, coalesce((stats->>'SHO')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as sho,
      greatest(20, least(105, coalesce((stats->>'PAS')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as pas,
      greatest(20, least(105, coalesce((stats->>'DRI')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as dri,
      greatest(20, least(105, coalesce((stats->>'DEF')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as def,
      greatest(20, least(105, coalesce((stats->>'PHY')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as phy,
      greatest(20, least(105, (
        coalesce((stats->>'DIV')::numeric, ovr)
        + coalesce((stats->>'HAN')::numeric, ovr)
        + coalesce((stats->>'REF')::numeric, ovr)
        + coalesce((stats->>'POS')::numeric, ovr)
      ) / 4 - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as gk
    from starters
  ),
  lanes as (
    select
      pos,
      eff_ovr,
      case
        when pos in ('ST','CF') then sho * 0.42 + pac * 0.18 + dri * 0.24 + phy * 0.16
        else sho * 0.22 + pac * 0.22 + dri * 0.28 + pas * 0.28
      end as attack,
      case
        when pos in ('LW','RW','LM','RM','LB','RB') then pac * 0.36 + dri * 0.3 + pas * 0.18 + def * 0.16
        else pac * 0.2 + dri * 0.25 + pas * 0.25 + sho * 0.3
      end as wing,
      case
        when pos in ('ST','CF','CAM','CM','CDM') then sho * 0.26 + pas * 0.25 + dri * 0.25 + phy * 0.24
        else sho * 0.18 + pas * 0.24 + dri * 0.22 + phy * 0.18 + def * 0.18
      end as central,
      case
        when pos in ('CDM','CM','CAM','LM','RM') then pas * 0.34 + dri * 0.24 + def * 0.2 + phy * 0.14 + pac * 0.08
        else pas * 0.25 + dri * 0.2 + def * 0.25 + phy * 0.2 + pac * 0.1
      end as midfield,
      case
        when pos in ('CB','LB','RB','CDM') then def * 0.42 + phy * 0.24 + pac * 0.18 + pas * 0.08 + dri * 0.08
        else def * 0.34 + phy * 0.24 + pac * 0.18 + pas * 0.12 + dri * 0.12
      end as defense,
      case when pos = 'GK' then gk else null end as keeper
    from rated
  ),
  raw_profile as (
    select
      coalesce(avg(attack) filter (where pos in ('ST','CF','LW','RW','CAM','LM','RM')), avg(attack), 60) as attack,
      coalesce(avg(wing), 60) as wing,
      coalesce(avg(central), 60) as central,
      coalesce(avg(midfield) filter (where pos in ('CDM','CM','CAM','LM','RM')), avg(midfield), 60) as midfield,
      coalesce(avg(defense) filter (where pos in ('CB','LB','RB','CDM')), avg(defense), 60) as defense,
      coalesce(avg(keeper), avg(eff_ovr), 60) as keeper,
      greatest(35, least(100, coalesce(avg(eff_ovr), 60))) as readiness
    from lanes
  ),
  stat_avg as (
    select
      coalesce(avg(tac) filter (where pos <> 'GK'), avg(tac), 60) as tac,
      coalesce(avg(pac) filter (where pos <> 'GK'), avg(pac), 60) as pac,
      coalesce(avg(sho) filter (where pos <> 'GK'), avg(sho), 60) as sho,
      coalesce(avg(pas) filter (where pos <> 'GK'), avg(pas), 60) as pas,
      coalesce(avg(dri) filter (where pos <> 'GK'), avg(dri), 60) as dri,
      coalesce(avg(def) filter (where pos <> 'GK'), avg(def), 60) as def,
      coalesce(avg(phy) filter (where pos <> 'GK'), avg(phy), 60) as phy,
      coalesce(avg(pac) filter (where pos in ('CB','LB','RB','LWB','RWB','CDM')), avg(pac) filter (where pos <> 'GK'), 60) as def_pac,
      coalesce(avg(pos_fit), 1.0) as position_fit
    from rated
  ),
  adjusted as (
    select
      attack
        + case when settings.tactical_style = 'pressing' then 3 when settings.tactical_style = 'counter' then 2 else 0 end
        + case when settings.defensive_line = 'high' then 2 when settings.defensive_line = 'low' then -2 else 0 end
        + case when settings.tempo = 'direct' then 3 when settings.tempo = 'controlled' then -1 else 0 end as attack,
      wing
        + case when settings.tactical_style = 'counter' then 5 else 0 end
        + case when settings.tempo = 'direct' then 2 else 0 end
        + case when settings.focus_side in ('left','right') then 3 else 0 end as wing,
      central
        + case when settings.tactical_style = 'possession' then 2 else 0 end
        + case when settings.focus_side = 'center' then 3 else 0 end as central,
      midfield
        + case when settings.tactical_style = 'pressing' then 4 when settings.tactical_style = 'possession' then 5 when settings.tactical_style = 'counter' then -2 else 0 end
        + case when settings.defensive_line = 'high' then 2 else 0 end
        + case when settings.tempo = 'controlled' then 3 when settings.tempo = 'direct' then -2 else 0 end as midfield,
      defense
        + case when settings.tactical_style = 'pressing' then -2 when settings.tactical_style = 'possession' then 1 else 0 end
        + case when settings.defensive_line = 'high' then -4 when settings.defensive_line = 'low' then 5 else 0 end
        + case when settings.tempo = 'controlled' then 2 else 0 end as defense,
      keeper,
      readiness,
      case
        when settings.tactical_style = 'pressing' then 3
        when settings.tactical_style in ('possession','counter') then 2
        else 0
      end as tactical_fit
    from raw_profile, settings
  )
  select jsonb_build_object(
    'attack', round(attack, 2),
    'wing', round(wing, 2),
    'central', round(central, 2),
    'midfield', round(midfield, 2),
    'defense', round(defense, 2),
    'keeper', round(keeper, 2),
    'readiness', round(readiness, 2),
    'tacticalFit', tactical_fit,
    'positionFit', round(stat_avg.position_fit, 3),
    'autoSubs', (
      select coalesce(
        jsonb_agg(jsonb_build_object('out', out_name, 'in', in_name, 'slot', slot)),
        '[]'::jsonb
      )
      from subs
    ),
    'stats', jsonb_build_object(
      'tac', round(stat_avg.tac, 1),
      'pac', round(stat_avg.pac, 2),
      'sho', round(stat_avg.sho, 2),
      'pas', round(stat_avg.pas, 2),
      'dri', round(stat_avg.dri, 2),
      'def', round(stat_avg.def, 2),
      'phy', round(stat_avg.phy, 2),
      'defPac', round(stat_avg.def_pac, 2)
    )
  )
  from adjusted, stat_avg;
$$;

grant execute on function public.pm_team_match_profile(uuid) to authenticated, service_role;
