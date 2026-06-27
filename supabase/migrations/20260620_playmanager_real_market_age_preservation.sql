alter table public.pm_players
  drop constraint if exists pm_players_age_check;

alter table public.pm_players
  add constraint pm_players_age_check
    check (age between 15 and 50);

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
begin
  v_price := coalesce((p_player->>'current_transfer_value_gel')::bigint, 0);
  v_position := coalesce(p_player->>'position', 'CM');
  v_age := greatest(15, least(50, coalesce((p_player->>'age')::smallint, 18)));

  if v_price <= 0 then raise exception 'invalid_price'; end if;
  if v_position not in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') then
    raise exception 'invalid_position';
  end if;

  perform public.pm_ensure_calendar(p_team_id);

  select total_days
  into v_current_total_days
  from public.pm_calendar
  where team_id = p_team_id;

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
  on conflict (normalized_name) where is_real = true do update
    set display_name = excluded.display_name
  returning id, owner_id into v_player_id, v_owner_id;

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

create or replace function public.pm_sell_player(
  p_team_id uuid,
  p_player_id uuid
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_player public.pm_players%rowtype;
  v_value bigint;
  v_sale bigint;
begin
  select * into v_player
  from public.pm_players
  where id = p_player_id and owner_id = p_team_id
  for update;

  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  v_value := v_player.current_transfer_value_gel;
  v_sale := greatest(0, floor(v_value * 0.85)::bigint);

  update public.pm_players
  set
    owner_id = null,
    age_started_total_days = case when is_real then null else age_started_total_days end,
    card_stats = coalesce(base_card_stats, card_stats),
    ovr_current = public.pm_player_overall_from_stats(
      upper(coalesce(nullif(primary_position, ''), 'CM')),
      coalesce(base_card_stats, card_stats),
      ovr_base
    )
  where id = p_player_id;

  delete from public.pm_squads
  where player_id = p_player_id and team_id = p_team_id;

  if v_sale > 0 then
    perform public.pm_credit(p_team_id, v_sale, 'transfer_sell:' || v_player.normalized_name);
  end if;

  return jsonb_build_object('playerId', v_player.id, 'amount', v_sale);
end;
$$;

grant execute on function public.pm_buy_market_player(uuid, jsonb) to service_role;
grant execute on function public.pm_sell_player(uuid, uuid) to service_role;
