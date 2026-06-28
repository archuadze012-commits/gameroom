-- Manager assistant auto-lineup repair (league engine).
-- pm_team_match_profile now reads head_coach level and covers injured starters
-- position-aware for the first <level> gaps (best pm_position_fit), blind OVR for
-- the rest; level 5 also rotates one heavily-fatigued starter for a fresher sub.
-- Mirrors the TS cup engine (repairLineup in match-engine.ts).

CREATE OR REPLACE FUNCTION public.pm_team_match_profile(p_team_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with recursive settings as (
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
      coalesce(p.traits, '{}'::text[]) as traits,
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
  -- Manager assistant ("მენეჯერის ასისტენტი") level drives auto-lineup repair.
  assistant as (
    select coalesce(max(level), 0)::int as lvl
    from public.pm_staff
    where team_id = p_team_id and role_key = 'head_coach'
  ),
  gaps as (
    select *, row_number() over (order by ovr asc, id) as gap_rn
    from nominal_xi
    where unavailable
  ),
  bench_pool as (
    select *, row_number() over (order by ovr desc, id) as rn
    from squad
    where shirt > 11 and not unavailable
  ),
  -- Greedy cover, weakest gap first: the first `lvl` gaps get the best positional
  -- fit (assistant smarts); the rest fall back to the best remaining OVR (blind
  -- safety net). `used` carries the bench ids already taken so none are reused.
  assign as (
    select
      g.gap_rn, g.slot, g.display_name as out_name,
      pick.id as in_id, pick.display_name as in_name, pick.natural_pos as in_natural,
      pick.traits as in_traits, pick.ovr as in_ovr, pick.tac as in_tac,
      pick.fatigue as in_fatigue, pick.morale as in_morale, pick.stats as in_stats,
      array[pick.id] as used
    from gaps g
    cross join lateral (
      select b.*
      from bench_pool b
      order by
        (case when g.gap_rn <= (select lvl from assistant)
              then public.pm_position_fit(b.natural_pos, g.slot) else 0 end) desc,
        b.ovr desc, b.id
      limit 1
    ) pick
    where g.gap_rn = 1
    union all
    select
      g.gap_rn, g.slot, g.display_name,
      pick.id, pick.display_name, pick.natural_pos, pick.traits, pick.ovr,
      pick.tac, pick.fatigue, pick.morale, pick.stats,
      a.used || pick.id
    from assign a
    join gaps g on g.gap_rn = a.gap_rn + 1
    cross join lateral (
      select b.*
      from bench_pool b
      where b.id <> all(a.used)
      order by
        (case when g.gap_rn <= (select lvl from assistant)
              then public.pm_position_fit(b.natural_pos, g.slot) else 0 end) desc,
        b.ovr desc, b.id
      limit 1
    ) pick
  ),
  used_ids as (
    select coalesce(array_agg(in_id), '{}'::uuid[]) as ids from assign
  ),
  -- Level 5: rotate one heavily-fatigued (>=80) starter for a meaningfully fresher sub.
  rotation as (
    select
      tired.slot, tired.id as out_id, tired.display_name as out_name,
      fresh.display_name as in_name, fresh.natural_pos as in_natural, fresh.traits as in_traits,
      fresh.ovr as in_ovr, fresh.tac as in_tac, fresh.fatigue as in_fatigue,
      fresh.morale as in_morale, fresh.stats as in_stats
    from (
      select n.* from nominal_xi n
      where not n.unavailable and n.fatigue >= 80 and (select lvl from assistant) >= 5
      order by n.fatigue desc, n.id
      limit 1
    ) tired
    cross join lateral (
      select b.* from bench_pool b, used_ids u
      where b.id <> all(u.ids)
      order by public.pm_position_fit(b.natural_pos, tired.slot) desc,
               (b.ovr - least(24, b.fatigue * 0.28)) desc, b.id
      limit 1
    ) fresh
    where (fresh.ovr - least(24, fresh.fatigue * 0.28)) > (tired.ovr - least(24, tired.fatigue * 0.28))
  ),
  subs as (
    select slot, out_name, in_name, in_natural, in_traits, in_ovr, in_tac, in_fatigue, in_morale, in_stats from assign
    union all
    select slot, out_name, in_name, in_natural, in_traits, in_ovr, in_tac, in_fatigue, in_morale, in_stats from rotation
  ),
  effective as (
    select n.slot, n.natural_pos, n.traits, n.ovr, n.tac, n.fatigue, n.morale, n.injury_matches, n.status, n.stats
    from nominal_xi n
    where not n.unavailable and n.id not in (select out_id from rotation)
    union all
    select slot, in_natural, in_traits, in_ovr, in_tac, in_fatigue, in_morale, 0, 'active', in_stats
    from subs
    union all
    select g.slot, g.natural_pos, g.traits, g.ovr, g.tac, g.fatigue, g.morale, g.injury_matches, g.status, g.stats
    from gaps g
    where g.gap_rn not in (select gap_rn from assign)
  ),
  starters as (
    select
      slot as pos,
      traits,
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
  trait_bonus as (
    select
      least(7, coalesce(sum(case when 'poacher' = any(traits) then 2.5 else 0 end), 0)
             + coalesce(sum(case when 'magician' = any(traits) then 1.0 else 0 end), 0)) as attack_b,
      least(6, coalesce(sum(case when 'speedster' = any(traits) then 2.0 else 0 end), 0)
             + coalesce(sum(case when 'magician' = any(traits) then 1.0 else 0 end), 0)) as wing_b,
      least(6, coalesce(sum(case when 'playmaker' = any(traits) then 2.0 else 0 end), 0)
             + coalesce(sum(case when 'magician' = any(traits) then 1.5 else 0 end), 0)) as central_b,
      least(6, coalesce(sum(case when 'playmaker' = any(traits) then 2.0 else 0 end), 0)
             + coalesce(sum(case when 'engine' = any(traits) then 1.5 else 0 end), 0)
             + coalesce(sum(case when 'rock' = any(traits) then 0.5 else 0 end), 0)) as midfield_b,
      least(7, coalesce(sum(case when 'wall' = any(traits) then 2.5 else 0 end), 0)
             + coalesce(sum(case when 'rock' = any(traits) then 1.5 else 0 end), 0)) as defense_b,
      least(5, coalesce(sum(case when 'leader' = any(traits) then 2.0 else 0 end), 0)
             + coalesce(sum(case when 'engine' = any(traits) then 0.5 else 0 end), 0)) as readiness_b
    from starters
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
      raw_profile.attack + trait_bonus.attack_b
        + case when settings.tactical_style = 'pressing' then 3 when settings.tactical_style = 'counter' then 2 else 0 end
        + case when settings.defensive_line = 'high' then 2 when settings.defensive_line = 'low' then -2 else 0 end
        + case when settings.tempo = 'direct' then 3 when settings.tempo = 'controlled' then -1 else 0 end as attack,
      raw_profile.wing + trait_bonus.wing_b
        + case when settings.tactical_style = 'counter' then 5 else 0 end
        + case when settings.tempo = 'direct' then 2 else 0 end
        + case when settings.focus_side in ('left','right') then 3 else 0 end as wing,
      raw_profile.central + trait_bonus.central_b
        + case when settings.tactical_style = 'possession' then 2 else 0 end
        + case when settings.focus_side = 'center' then 3 else 0 end as central,
      raw_profile.midfield + trait_bonus.midfield_b
        + case when settings.tactical_style = 'pressing' then 4 when settings.tactical_style = 'possession' then 5 when settings.tactical_style = 'counter' then -2 else 0 end
        + case when settings.defensive_line = 'high' then 2 else 0 end
        + case when settings.tempo = 'controlled' then 3 when settings.tempo = 'direct' then -2 else 0 end as midfield,
      raw_profile.defense + trait_bonus.defense_b
        + case when settings.tactical_style = 'pressing' then -2 when settings.tactical_style = 'possession' then 1 else 0 end
        + case when settings.defensive_line = 'high' then -4 when settings.defensive_line = 'low' then 5 else 0 end
        + case when settings.tempo = 'controlled' then 2 else 0 end as defense,
      raw_profile.keeper,
      least(100, raw_profile.readiness + trait_bonus.readiness_b) as readiness,
      case
        when settings.tactical_style = 'pressing' then 3
        when settings.tactical_style in ('possession','counter') then 2
        else 0
      end as tactical_fit
    from raw_profile, settings, trait_bonus
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
    'traits', (
      select coalesce(
        jsonb_agg(jsonb_build_object('key', tr, 'count', cnt) order by cnt desc, tr),
        '[]'::jsonb
      )
      from (
        select t.tr, count(*) as cnt
        from starters s, unnest(s.traits) t(tr)
        group by t.tr
      ) z
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
$function$

