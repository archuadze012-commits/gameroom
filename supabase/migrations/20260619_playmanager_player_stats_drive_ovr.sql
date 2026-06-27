alter table public.pm_players
  add column if not exists card_stats jsonb;

create or replace function public.pm_player_stat_labels(
  p_position text
) returns text[]
language plpgsql
immutable
as $$
begin
  if upper(coalesce(p_position, '')) = 'GK' then
    return array['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS'];
  end if;

  return array['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];
end;
$$;

create or replace function public.pm_player_training_focus(
  p_position text
) returns text[]
language plpgsql
immutable
as $$
begin
  case upper(coalesce(p_position, 'CM'))
    when 'GK' then return array['REF', 'HAN', 'POS', 'DIV', 'KIC', 'SPD'];
    when 'CB' then return array['DEF', 'PHY', 'PAS', 'PAC', 'DRI', 'SHO'];
    when 'RB' then return array['PAC', 'DEF', 'DRI', 'PAS', 'PHY', 'SHO'];
    when 'LB' then return array['PAC', 'DEF', 'DRI', 'PAS', 'PHY', 'SHO'];
    when 'CDM' then return array['DEF', 'PAS', 'PHY', 'PAC', 'DRI', 'SHO'];
    when 'CM' then return array['PAS', 'DRI', 'PAC', 'PHY', 'SHO', 'DEF'];
    when 'CAM' then return array['DRI', 'PAS', 'SHO', 'PAC', 'PHY', 'DEF'];
    when 'LW' then return array['DRI', 'PAC', 'SHO', 'PAS', 'PHY', 'DEF'];
    when 'RW' then return array['DRI', 'PAC', 'SHO', 'PAS', 'PHY', 'DEF'];
    when 'ST' then return array['SHO', 'PAC', 'DRI', 'PHY', 'PAS', 'DEF'];
    when 'CF' then return array['SHO', 'DRI', 'PAS', 'PAC', 'PHY', 'DEF'];
    when 'LM' then return array['PAC', 'DRI', 'PAS', 'SHO', 'PHY', 'DEF'];
    when 'RM' then return array['PAC', 'DRI', 'PAS', 'SHO', 'PHY', 'DEF'];
    when 'AM' then return array['DRI', 'PAS', 'SHO', 'PAC', 'PHY', 'DEF'];
    else return array['PAS', 'PAC', 'DRI', 'PHY', 'SHO', 'DEF'];
  end case;
end;
$$;

create or replace function public.pm_player_overall_from_stats(
  p_position text,
  p_card_stats jsonb,
  p_fallback smallint default 40
) returns smallint
language plpgsql
immutable
as $$
declare
  v_labels text[];
  v_total numeric := 0;
  v_value integer;
  v_label text;
  i integer;
  v_weights numeric[];
  v_weight numeric;
begin
  if p_card_stats is null or p_card_stats = '{}'::jsonb then
    return greatest(35, least(99, coalesce(p_fallback, 40)));
  end if;

  v_labels := public.pm_player_stat_labels(p_position);

  case upper(coalesce(p_position, 'CM'))
    when 'GK' then v_weights := array[0.16, 0.2, 0.14, 0.22, 0.08, 0.2];
    when 'CB' then v_weights := array[0.12, 0.04, 0.14, 0.08, 0.34, 0.28];
    when 'RB' then v_weights := array[0.22, 0.06, 0.18, 0.18, 0.2, 0.16];
    when 'LB' then v_weights := array[0.22, 0.06, 0.18, 0.18, 0.2, 0.16];
    when 'CDM' then v_weights := array[0.14, 0.06, 0.22, 0.14, 0.24, 0.2];
    when 'CM' then v_weights := array[0.16, 0.1, 0.24, 0.18, 0.14, 0.18];
    when 'CAM' then v_weights := array[0.12, 0.2, 0.24, 0.24, 0.06, 0.14];
    when 'AM' then v_weights := array[0.12, 0.2, 0.24, 0.24, 0.06, 0.14];
    when 'LW' then v_weights := array[0.25, 0.22, 0.13, 0.24, 0.02, 0.14];
    when 'RW' then v_weights := array[0.25, 0.22, 0.13, 0.24, 0.02, 0.14];
    when 'ST' then v_weights := array[0.22, 0.32, 0.06, 0.22, 0.01, 0.17];
    when 'CF' then v_weights := array[0.2, 0.28, 0.12, 0.24, 0.02, 0.14];
    when 'LM' then v_weights := array[0.22, 0.14, 0.2, 0.22, 0.06, 0.16];
    when 'RM' then v_weights := array[0.22, 0.14, 0.2, 0.22, 0.06, 0.16];
    else v_weights := array[0.1667, 0.1667, 0.1667, 0.1667, 0.1666, 0.1666];
  end case;

  for i in 1..array_length(v_labels, 1) loop
    v_label := v_labels[i];
    v_weight := coalesce(v_weights[i], 0);
    v_value := coalesce((p_card_stats ->> v_label)::integer, p_fallback::integer, 40);
    v_total := v_total + greatest(35, least(99, v_value)) * v_weight;
  end loop;

  return greatest(35, least(99, round(v_total)::integer));
end;
$$;

create or replace function public.pm_player_seed_card_stats(
  p_position text,
  p_target_ovr smallint
) returns jsonb
language plpgsql
immutable
as $$
declare
  v_position text := upper(coalesce(p_position, 'CM'));
  v_labels text[] := public.pm_player_stat_labels(v_position);
  v_offsets integer[];
  v_values integer[] := '{}';
  v_target integer := greatest(35, least(99, coalesce(p_target_ovr, 40)));
  v_target_sum integer;
  v_current_sum integer := 0;
  v_direction integer;
  v_moved boolean;
  v_result jsonb := '{}'::jsonb;
  i integer;
begin
  case v_position
    when 'GK' then v_offsets := array[4, 8, 2, 10, -14, -10];
    when 'CB' then v_offsets := array[-12, -10, -2, -6, 16, 14];
    when 'RB' then v_offsets := array[8, -8, 4, 8, 4, -16];
    when 'LB' then v_offsets := array[8, -8, 4, 8, 4, -16];
    when 'CDM' then v_offsets := array[0, -6, 8, 0, 10, -12];
    when 'CM' then v_offsets := array[4, 2, 8, 4, -4, -14];
    when 'CAM' then v_offsets := array[6, 10, 10, 12, -16, -22];
    when 'LW' then v_offsets := array[14, 6, 0, 16, -18, -18];
    when 'RW' then v_offsets := array[14, 6, 0, 16, -18, -18];
    when 'ST' then v_offsets := array[10, 16, -8, 8, -20, -6];
    when 'CF' then v_offsets := array[8, 12, 4, 10, -16, -18];
    when 'LM' then v_offsets := array[10, 0, 6, 10, -10, -16];
    when 'RM' then v_offsets := array[10, 0, 6, 10, -10, -16];
    when 'AM' then v_offsets := array[6, 10, 10, 12, -16, -22];
    else v_offsets := array[0, 0, 0, 0, 0, 0];
  end case;

  for i in 1..array_length(v_labels, 1) loop
    v_values := array_append(v_values, greatest(35, least(99, v_target + v_offsets[i])));
    v_current_sum := v_current_sum + v_values[i];
  end loop;

  v_target_sum := v_target * array_length(v_labels, 1);

  while v_current_sum <> v_target_sum loop
    v_direction := case when v_current_sum < v_target_sum then 1 else -1 end;
    v_moved := false;

    for i in 1..array_length(v_values, 1) loop
      if v_values[i] + v_direction between 35 and 99 then
        v_values[i] := v_values[i] + v_direction;
        v_current_sum := v_current_sum + v_direction;
        v_moved := true;
      end if;
      exit when v_current_sum = v_target_sum;
    end loop;

    exit when not v_moved;
  end loop;

  for i in 1..array_length(v_labels, 1) loop
    v_result := v_result || jsonb_build_object(v_labels[i], v_values[i]);
  end loop;

  return v_result;
end;
$$;

create or replace function public.pm_players_sync_card_stats()
returns trigger
language plpgsql
as $$
declare
  v_position text := upper(coalesce(nullif(new.primary_position, ''), 'CM'));
  v_should_seed boolean := false;
begin
  if tg_op = 'INSERT' then
    v_should_seed := new.card_stats is null or new.card_stats = '{}'::jsonb;
  else
    v_should_seed :=
      new.card_stats is null
      or new.card_stats = '{}'::jsonb
      or (
        new.ovr_current is distinct from old.ovr_current
        and coalesce(new.card_stats, '{}'::jsonb) = coalesce(old.card_stats, '{}'::jsonb)
      )
      or (
        new.primary_position is distinct from old.primary_position
        and coalesce(new.card_stats, '{}'::jsonb) = coalesce(old.card_stats, '{}'::jsonb)
      );
  end if;

  if v_should_seed then
    new.card_stats := public.pm_player_seed_card_stats(v_position, coalesce(new.ovr_current, new.ovr_base, 40)::smallint);
  end if;

  new.ovr_current := public.pm_player_overall_from_stats(v_position, new.card_stats, coalesce(new.ovr_current, new.ovr_base, 40)::smallint);
  return new;
end;
$$;

drop trigger if exists pm_players_sync_card_stats on public.pm_players;
create trigger pm_players_sync_card_stats
before insert or update of primary_position, ovr_base, ovr_current, card_stats
on public.pm_players
for each row
execute function public.pm_players_sync_card_stats();

update public.pm_players p
set card_stats = public.pm_player_seed_card_stats(
  upper(
    coalesce(
      nullif(p.primary_position, ''),
      (
        select s.position
        from public.pm_squads s
        where s.player_id = p.id
        order by s.id asc
        limit 1
      ),
      'CM'
    )
  ),
  p.ovr_current::smallint
)
where p.card_stats is null or p.card_stats = '{}'::jsonb;

update public.pm_players
set ovr_current = public.pm_player_overall_from_stats(
  upper(coalesce(nullif(primary_position, ''), 'CM')),
  card_stats,
  ovr_current::smallint
)
where card_stats is not null and card_stats <> '{}'::jsonb;

create or replace function public.pm_train_player(
  p_team_id uuid,
  p_player_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
      when s.role_key = 'defence_coach' and v_position in ('CB', 'LB', 'RB', 'CDM') then s.level * 5
      when s.role_key = 'attack_coach' and v_position in ('LW', 'RW', 'ST', 'CF', 'CAM', 'AM', 'LM', 'RM') then s.level * 5
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
  v_card_stats := coalesce(v_player.card_stats, public.pm_player_seed_card_stats(v_position, v_player.ovr_current));

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
$$;
