drop index if exists public.pm_players_real_name_uniq;

create unique index if not exists pm_players_real_name_uniq_85_plus
  on public.pm_players (normalized_name)
  where is_real = true
    and coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 85;

create or replace function public.pm_buy_market_player(
  p_team_id uuid,
  p_player jsonb
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_player_id uuid;
  v_owner_id uuid;
  v_price bigint;
  v_position text;
  v_age smallint;
  v_current_total_days integer := 1;
  v_real_ovr smallint;
begin
  v_price := coalesce((p_player->>'current_transfer_value_gel')::bigint, 0);
  v_position := coalesce(p_player->>'position', 'CM');
  v_age := greatest(15, least(50, coalesce((p_player->>'age')::smallint, 18)));
  v_real_ovr := coalesce(nullif(p_player->>'ea_fc_ovr', '')::smallint, (p_player->>'ovr_base')::smallint, (p_player->>'ovr_current')::smallint, 0);

  if v_price <= 0 then raise exception 'invalid_price'; end if;
  if v_position not in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') then
    raise exception 'invalid_position';
  end if;

  perform public.pm_ensure_calendar(p_team_id);

  select total_days
  into v_current_total_days
  from public.pm_calendar
  where team_id = p_team_id;

  if coalesce((p_player->>'is_real')::boolean, true) and v_real_ovr >= 85 then
    insert into public.pm_players (
      normalized_name, display_name, is_real, talent, ea_fc_ovr, ovr_source,
      ovr_base, ovr_current, age, base_transfer_value_gel, current_transfer_value_gel
    ) values (
      p_player->>'normalized_name',
      p_player->>'display_name',
      true,
      coalesce((p_player->>'talent')::smallint, 8),
      nullif(p_player->>'ea_fc_ovr', '')::smallint,
      coalesce(p_player->>'ovr_source', 'ea_fc'),
      (p_player->>'ovr_base')::smallint,
      (p_player->>'ovr_base')::smallint,
      v_age,
      v_price,
      v_price
    )
    on conflict (normalized_name) where (
      is_real = true
      and coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 85
    ) do update
      set display_name = excluded.display_name
    returning id, owner_id into v_player_id, v_owner_id;
  else
    insert into public.pm_players (
      normalized_name, display_name, is_real, talent, ea_fc_ovr, ovr_source,
      ovr_base, ovr_current, age, base_transfer_value_gel, current_transfer_value_gel
    ) values (
      p_player->>'normalized_name',
      p_player->>'display_name',
      coalesce((p_player->>'is_real')::boolean, true),
      coalesce((p_player->>'talent')::smallint, 8),
      nullif(p_player->>'ea_fc_ovr', '')::smallint,
      coalesce(p_player->>'ovr_source', 'ea_fc'),
      (p_player->>'ovr_base')::smallint,
      (p_player->>'ovr_base')::smallint,
      v_age,
      v_price,
      v_price
    )
    returning id, owner_id into v_player_id, v_owner_id;
  end if;

  if v_owner_id = p_team_id then
    raise exception 'player_owned';
  end if;

  if v_owner_id is not null and v_owner_id != p_team_id then
    raise exception 'player_unavailable';
  end if;

  perform public.pm_debit(p_team_id, v_price, 'transfer_buy:' || (p_player->>'normalized_name'));

  update public.pm_players
  set
    owner_id = p_team_id,
    age_started_total_days = v_current_total_days,
    card_stats = coalesce(base_card_stats, card_stats),
    ovr_current = public.pm_player_overall_from_stats(
      upper(coalesce(nullif(primary_position, ''), v_position, 'CM')),
      coalesce(base_card_stats, card_stats),
      ovr_base
    )
  where id = v_player_id;

  insert into public.pm_squads (team_id, player_id, position)
  values (p_team_id, v_player_id, v_position)
  on conflict (player_id) do nothing;

  return jsonb_build_object('playerId', v_player_id, 'cost', v_price);
end;
$$;

grant execute on function public.pm_buy_market_player(uuid, jsonb) to service_role;
