-- Phase 1: ნახევარდაცვის მწვრთნელი (midfield_coach) — fixes CM training gap.
-- Position taxonomy: gk→GK, def→CB/LB/RB, mid→CDM/CM/CAM/AM/LM/RM, att→LW/RW/ST/CF.

CREATE OR REPLACE FUNCTION public.pm_staff_hire_cost(p_role_key text)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case p_role_key
    when 'head_coach' then 140000
    when 'gk_coach' then 95000
    when 'defence_coach' then 100000
    when 'midfield_coach' then 104000
    when 'attack_coach' then 108000
    when 'scout' then 88000
    when 'youth_scout' then 92000
    when 'doctor' then 120000
    when 'physiotherapist' then 98000
    when 'psychologist' then 90000
    when 'finance_manager' then 110000
    when 'set_piece_coach' then 96000
    else 0
  end;
$function$;

CREATE OR REPLACE FUNCTION public.pm_hire_staff(p_team_id uuid, p_role_key text)
 RETURNS TABLE(role_key text, level smallint)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_cost integer;
begin
  if p_role_key not in (
    'head_coach', 'gk_coach', 'defence_coach', 'midfield_coach', 'attack_coach',
    'scout', 'youth_scout', 'doctor', 'physiotherapist', 'psychologist',
    'finance_manager', 'set_piece_coach'
  ) then
    raise exception 'invalid_staff_role';
  end if;

  if exists (
    select 1 from public.pm_staff s
    where s.team_id = p_team_id and s.role_key = p_role_key
  ) then
    raise exception 'staff_already_hired';
  end if;

  v_cost := public.pm_staff_hire_cost(p_role_key);
  if v_cost <= 0 then
    raise exception 'invalid_staff_role';
  end if;

  perform public.pm_debit(p_team_id, v_cost, 'staff_hire:' || p_role_key);

  insert into public.pm_staff (team_id, role_key, level)
  values (p_team_id, p_role_key, 1);

  return query
  select s.role_key, s.level
  from public.pm_staff s
  where s.team_id = p_team_id and s.role_key = p_role_key;
end;
$function$;

CREATE OR REPLACE FUNCTION public.pm_train_player(p_team_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_player public.pm_players%rowtype;
  v_squad_position text;
  v_position text;
  v_staff_training_pct integer := 0;
  v_extra_roll_applied boolean := false;
  v_rolls integer := 1;
  v_old_ovr smallint;
  v_new_ovr smallint;
  v_cap_ovr smallint;
  v_focus text[];
  v_label text;
  v_current_value integer;
  v_stat_gain integer := 0;
  v_candidate jsonb;
  v_card_stats jsonb;
  v_improved_stats text[] := '{}';
begin
  select p.*
  into v_player
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where p.id = p_player_id and s.team_id = p_team_id
  for update;

  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  select s.position
  into v_squad_position
  from public.pm_squads s
  where s.player_id = p_player_id and s.team_id = p_team_id
  order by s.id asc
  limit 1;

  if v_player.status != 'active' or coalesce(v_player.injury_matches, 0) > 0 then
    raise exception 'player_unavailable';
  end if;

  v_position := upper(coalesce(nullif(v_player.primary_position, ''), v_squad_position, 'CM'));

  select coalesce(sum(
    case
      when s.role_key = 'gk_coach' and v_position = 'GK' then s.level * 6
      when s.role_key = 'defence_coach' and v_position in ('CB', 'LB', 'RB') then s.level * 5
      when s.role_key = 'midfield_coach' and v_position in ('CDM', 'CM', 'CAM', 'AM', 'LM', 'RM') then s.level * 5
      when s.role_key = 'attack_coach' and v_position in ('LW', 'RW', 'ST', 'CF') then s.level * 5
      else 0
    end
  ), 0)::integer
  into v_staff_training_pct
  from public.pm_staff s
  where s.team_id = p_team_id;

  if v_staff_training_pct > 0 and random() < least(0.9, v_staff_training_pct::numeric / 100.0) then
    v_extra_roll_applied := true;
    v_rolls := 2;
  end if;

  v_old_ovr := v_player.ovr_current;
  v_cap_ovr := v_player.ovr_base + public.pm_player_ovr_growth_cap(v_player.talent);
  v_card_stats := coalesce(
    v_player.card_stats,
    v_player.base_card_stats,
    public.pm_player_seed_card_stats(v_position, v_player.ovr_base)
  );

  if v_old_ovr >= v_cap_ovr then
    raise exception 'player_maxed';
  end if;

  v_focus := public.pm_player_training_focus(v_position);

  foreach v_label in array v_focus loop
    exit when v_stat_gain >= v_rolls;

    v_current_value := coalesce((v_card_stats ->> v_label)::integer, 35);
    if v_current_value >= 99 then
      continue;
    end if;

    v_candidate := jsonb_set(v_card_stats, array[v_label], to_jsonb(v_current_value + 1), true);
    v_new_ovr := public.pm_player_overall_from_stats(v_position, v_candidate, v_old_ovr);

    if v_new_ovr > v_cap_ovr then
      continue;
    end if;

    v_card_stats := v_candidate;
    v_stat_gain := v_stat_gain + 1;
    v_improved_stats := array_append(v_improved_stats, v_label);
  end loop;

  if v_stat_gain = 0 then
    raise exception 'player_maxed';
  end if;

  v_new_ovr := public.pm_player_overall_from_stats(v_position, v_card_stats, v_old_ovr);

  update public.pm_players
  set
    card_stats = v_card_stats,
    ovr_current = v_new_ovr,
    current_transfer_value_gel = public.pm_player_current_transfer_value_gel(ovr_base, v_new_ovr),
    fatigue = least(100, fatigue + 8),
    morale = least(100, morale + 3)
  where id = p_player_id
  returning * into v_player;

  return jsonb_build_object(
    'playerId', v_player.id,
    'ovrCurrent', v_player.ovr_current,
    'currentTransferValueGel', v_player.current_transfer_value_gel,
    'fatigue', v_player.fatigue,
    'morale', v_player.morale,
    'ovrGain', greatest(0, v_player.ovr_current - v_old_ovr),
    'statGain', v_stat_gain,
    'improvedStats', v_improved_stats,
    'staffTrainingBonusPct', v_staff_training_pct,
    'positionCoachApplied', v_extra_roll_applied
  );
end;
$function$;
