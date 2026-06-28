-- Phase 3: XP development pipeline — match minutes → XP → pending mini-stats.
-- XP is earned only by the starting XI (game-time gate), scaled by an age curve
-- (toward the coach-set deadline age), the position coach's level, and headroom
-- to the talent ceiling. XP is spent into pending_card_stats (round-robin over
-- the position's training focus). pending stats become active only when an OVR
-- upgrade is later confirmed with Pro fodder (Phase 4).

-- Deadline age for a position's development, by the matching coach's level.
create or replace function public.pm_player_dev_completion_age(p_team_id uuid, p_position text)
returns smallint
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_role text;
  v_level smallint;
  v_pos text := upper(coalesce(p_position, 'CM'));
begin
  v_role := case
    when v_pos = 'GK' then 'gk_coach'
    when v_pos in ('CB','LB','RB') then 'defence_coach'
    when v_pos in ('CDM','CM','CAM','AM','LM','RM') then 'midfield_coach'
    else 'attack_coach'
  end;
  select coalesce(max(level), 0) into v_level
  from public.pm_staff where team_id = p_team_id and role_key = v_role;
  return case v_level
    when 5 then 25 when 4 then 27 when 3 then 28 when 2 then 29 when 1 then 30 else 31
  end;
end;
$$;

-- Grant one match's development to a team's starting XI.
create or replace function public.pm_grant_match_development(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  r record;
  v_pos text;
  v_deadline smallint;
  v_coach_level smallint;
  v_age_mult numeric;
  v_cap smallint;
  v_headroom numeric;
  v_budget integer;
  v_focus text[];
  v_pending jsonb;
  v_label text;
  v_val integer;
  v_cost integer;
  v_raised boolean;
begin
  for r in
    select p.id, coalesce(p.age,18) as age, p.ovr_base, p.ovr_current, p.talent,
           upper(coalesce(s.position, p.primary_position, 'CM')) as pos,
           coalesce(p.pending_card_stats, p.card_stats,
                    public.pm_player_seed_card_stats(upper(coalesce(s.position,p.primary_position,'CM')), p.ovr_base)) as stats,
           coalesce(p.xp, 0) as xp
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id and coalesce(s.shirt_number, 99) <= 11
  loop
    v_pos := r.pos;
    select coalesce(max(level),0) into v_coach_level
    from public.pm_staff
    where team_id = p_team_id and role_key = (case
      when v_pos = 'GK' then 'gk_coach'
      when v_pos in ('CB','LB','RB') then 'defence_coach'
      when v_pos in ('CDM','CM','CAM','AM','LM','RM') then 'midfield_coach'
      else 'attack_coach' end);

    v_deadline := case v_coach_level when 5 then 25 when 4 then 27 when 3 then 28 when 2 then 29 when 1 then 30 else 31 end;
    v_age_mult := greatest(0, least(1, (v_deadline - r.age)::numeric / nullif(v_deadline - 18, 0)));
    v_cap := r.ovr_base + public.pm_player_ovr_growth_cap(r.talent);
    v_headroom := greatest(0.1, least(1, (v_cap - r.ovr_current + 4)::numeric / 12));

    v_budget := r.xp + round(120 * v_age_mult * (1 + v_coach_level * 0.08) * v_headroom);
    if v_budget <= 0 then continue; end if;

    v_focus := public.pm_player_training_focus(v_pos);
    v_pending := r.stats;
    -- Guard against legacy non-object card_stats (would break jsonb_set).
    if jsonb_typeof(v_pending) is distinct from 'object' then
      v_pending := public.pm_player_seed_card_stats(v_pos, coalesce(r.ovr_base, r.ovr_current, 60)::smallint);
    end if;
    if jsonb_typeof(v_pending) is distinct from 'object' then
      continue;
    end if;
    loop
      v_raised := false;
      foreach v_label in array v_focus loop
        v_val := coalesce((v_pending->>v_label)::int, 40);
        if v_val < 99 then
          v_cost := 50 + v_val * 3;
          if v_budget >= v_cost then
            v_budget := v_budget - v_cost;
            v_pending := jsonb_set(v_pending, array[v_label], to_jsonb(v_val + 1), true);
            v_raised := true;
          end if;
        end if;
      end loop;
      exit when not v_raised;
    end loop;

    update public.pm_players
    set xp = v_budget, pending_card_stats = v_pending
    where id = r.id;
  end loop;
end;
$$;
