create or replace function public.pm_buy_position_shift_token(
  p_team_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quantity integer;
begin
  perform public.pm_debit(p_team_id, 1000000, 'market_asset:position_shift_token');

  insert into public.pm_team_assets (team_id, asset_key, quantity)
  values (p_team_id, 'position_shift_token', 1)
  on conflict (team_id, asset_key) do update
    set
      quantity = public.pm_team_assets.quantity + 1,
      updated_at = now()
  returning quantity into v_quantity;

  return jsonb_build_object(
    'assetKey', 'position_shift_token',
    'price', 1000000,
    'quantity', coalesce(v_quantity, 0)
  );
end;
$$;

create or replace function public.pm_unlock_secondary_position(
  p_team_id uuid,
  p_player_id uuid,
  p_target_position text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player public.pm_players%rowtype;
  v_primary_position text;
  v_target_position text;
  v_allowed_positions text[];
  v_token_quantity integer;
begin
  select *
  into v_player
  from public.pm_players
  where id = p_player_id and owner_id = p_team_id
  for update;

  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  v_primary_position := upper(trim(coalesce(v_player.primary_position, 'CM')));
  if v_primary_position = 'CF' then v_primary_position := 'ST'; end if;
  if v_primary_position in ('LCB', 'RCB') then v_primary_position := 'CB'; end if;
  if v_primary_position in ('LCM', 'RCM') then v_primary_position := 'CM'; end if;
  if v_primary_position = 'LWB' then v_primary_position := 'LB'; end if;
  if v_primary_position = 'RWB' then v_primary_position := 'RB'; end if;

  v_target_position := upper(trim(coalesce(p_target_position, '')));
  if v_target_position = 'CF' then v_target_position := 'ST'; end if;
  if v_target_position in ('LCB', 'RCB') then v_target_position := 'CB'; end if;
  if v_target_position in ('LCM', 'RCM') then v_target_position := 'CM'; end if;
  if v_target_position = 'LWB' then v_target_position := 'LB'; end if;
  if v_target_position = 'RWB' then v_target_position := 'RB'; end if;

  if v_target_position = '' then
    raise exception 'invalid_position';
  end if;

  if v_target_position = v_primary_position then
    raise exception 'primary_position';
  end if;

  v_allowed_positions := case v_primary_position
    when 'ST' then array['LW', 'RW']
    when 'LW' then array['RW', 'LM']
    when 'RW' then array['LW', 'RM']
    when 'LM' then array['LW', 'CM']
    when 'RM' then array['RW', 'CM']
    when 'CAM' then array['CM', 'ST']
    when 'AM' then array['CAM', 'CM']
    when 'CM' then array['CDM', 'CAM']
    when 'CDM' then array['CM', 'CB']
    when 'CB' then array['RB', 'LB']
    when 'LB' then array['CB', 'LM']
    when 'RB' then array['CB', 'RM']
    else array[]::text[]
  end;

  if not (v_target_position = any(v_allowed_positions)) then
    raise exception 'position_not_allowed';
  end if;

  if exists (
    select 1
    from public.pm_player_position_unlocks
    where team_id = p_team_id
      and player_id = p_player_id
      and unlocked_position = v_target_position
  ) then
    raise exception 'already_unlocked';
  end if;

  select quantity
  into v_token_quantity
  from public.pm_team_assets
  where team_id = p_team_id and asset_key = 'position_shift_token'
  for update;

  if coalesce(v_token_quantity, 0) <= 0 then
    raise exception 'missing_token';
  end if;

  update public.pm_team_assets
  set
    quantity = quantity - 1,
    updated_at = now()
  where team_id = p_team_id and asset_key = 'position_shift_token';

  insert into public.pm_player_position_unlocks (team_id, player_id, unlocked_position)
  values (p_team_id, p_player_id, v_target_position);

  return jsonb_build_object(
    'playerId', p_player_id,
    'position', v_target_position,
    'remainingTokens', greatest(coalesce(v_token_quantity, 0) - 1, 0)
  );
end;
$$;

grant execute on function public.pm_buy_position_shift_token(uuid) to service_role;
grant execute on function public.pm_unlock_secondary_position(uuid, uuid, text) to service_role;
