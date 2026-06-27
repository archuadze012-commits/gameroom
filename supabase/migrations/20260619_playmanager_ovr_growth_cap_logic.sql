create or replace function public.pm_player_ovr_growth_cap(
  p_talent smallint
) returns smallint language sql immutable as $$
  select case
    when p_talent = 10 then 25
    when p_talent = 9 then 20
    when p_talent = 8 then 15
    else (p_talent * 2) + 1
  end::smallint
$$;

create or replace function public.pm_train_player(
  p_team_id uuid,
  p_player_id uuid
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_player public.pm_players%rowtype;
  v_new_ovr smallint;
  v_cap_ovr smallint;
begin
  select p.* into v_player
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where p.id = p_player_id and s.team_id = p_team_id
  for update;

  if v_player.id is null then raise exception 'player_not_found'; end if;
  if v_player.status != 'active' then raise exception 'player_unavailable'; end if;

  v_cap_ovr := v_player.ovr_base + public.pm_player_ovr_growth_cap(v_player.talent);
  v_new_ovr := least(v_cap_ovr, v_player.ovr_current + 1);

  update public.pm_players
  set
    ovr_current = v_new_ovr,
    current_transfer_value_gel = public.pm_player_current_transfer_value_gel(ovr_base, v_new_ovr),
    fatigue = least(100, fatigue + 8)
  where id = p_player_id
  returning * into v_player;

  return jsonb_build_object(
    'playerId', v_player.id,
    'ovrCurrent', v_player.ovr_current,
    'currentTransferValueGel', v_player.current_transfer_value_gel
  );
end;
$$;

create or replace function public.pm_train_player(
  p_team_id uuid,
  p_player_id uuid
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_player public.pm_players%rowtype;
  v_new_ovr smallint;
  v_ovr_gain smallint := 1;
  v_cap_ovr smallint;
  v_staff_training_pct integer := 0;
  v_extra_roll_applied boolean := false;
begin
  select p.* into v_player
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where p.id = p_player_id and s.team_id = p_team_id
  for update;

  if v_player.id is null then raise exception 'player_not_found'; end if;
  if v_player.status != 'active' or coalesce(v_player.injury_matches, 0) > 0 then raise exception 'player_unavailable'; end if;

  select coalesce(sum(case when s.role_key = 'head_coach' then s.level * 6 else 0 end), 0)
  into v_staff_training_pct
  from public.pm_staff s
  where s.team_id = p_team_id;

  if v_staff_training_pct > 0 and random() < least(0.9, v_staff_training_pct::numeric / 100.0) then
    v_extra_roll_applied := true;
    v_ovr_gain := 2;
  end if;

  v_cap_ovr := v_player.ovr_base + public.pm_player_ovr_growth_cap(v_player.talent);
  v_new_ovr := least(v_cap_ovr, v_player.ovr_current + v_ovr_gain);

  update public.pm_players
  set
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
    'extraRollApplied', v_extra_roll_applied
  );
end;
$$;
