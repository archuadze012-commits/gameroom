-- Phase 4: confirm an available OVR upgrade by sacrificing Pro-class fodder.
-- pending_card_stats (grown by XP) only become active here. Cost per OVR level is
-- the agreed curve, keyed to the player's current OVR (floor 49): a more developed
-- player is more expensive to push further, and the cost carries across transfers.

-- Pro players needed to raise a player from p_from_ovr to p_from_ovr + 1.
create or replace function public.pm_ovr_upgrade_cost(p_from_ovr integer)
returns integer
language sql
immutable
as $$
  with n as (select greatest(1, p_from_ovr - 49) as v)
  select case
    when (select v from n) <= 19 then
      (array[1,2,4,6,8,12,16,20,24,30,35,40,45,50,60,70,80,90,100])[(select v from n)]
    else 100 + ((select v from n) - 19) * 20
  end;
$$;

-- Total Pro fodder to realize ALL currently-pending OVR growth (sum per level).
create or replace function public.pm_ovr_upgrade_total_cost(p_from_ovr integer, p_to_ovr integer)
returns integer
language sql
immutable
as $$
  select coalesce(sum(public.pm_ovr_upgrade_cost(y)), 0)::integer
  from generate_series(p_from_ovr, greatest(p_from_ovr, p_to_ovr - 1)) y
  where p_to_ovr > p_from_ovr;
$$;

create or replace function public.pm_confirm_ovr_upgrade(
  p_team_id uuid,
  p_player_id uuid,
  p_fodder_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_player public.pm_players%rowtype;
  v_pos text;
  v_pending jsonb;
  v_new_ovr smallint;
  v_old_ovr smallint;
  v_cost integer;
  v_consumed uuid[];
begin
  select p.* into v_player
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where p.id = p_player_id and s.team_id = p_team_id
  for update;
  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  v_pos := upper(coalesce(nullif(v_player.primary_position, ''),
    (select s.position from public.pm_squads s where s.player_id = p_player_id and s.team_id = p_team_id limit 1), 'CM'));

  v_pending := v_player.pending_card_stats;
  if v_pending is null then
    raise exception 'no_pending_development';
  end if;

  v_old_ovr := v_player.ovr_current;
  v_new_ovr := public.pm_player_overall_from_stats(v_pos, v_pending, v_old_ovr);
  if v_new_ovr <= v_old_ovr then
    raise exception 'no_upgrade_available';
  end if;

  v_cost := public.pm_ovr_upgrade_total_cost(v_old_ovr, v_new_ovr);

  -- Eligible fodder: this team's Pro-class players (talent 1-3), excluding the target.
  select array_agg(id) into v_consumed from (
    select p.id
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id
      and p.id = any(p_fodder_ids)
      and p.id <> p_player_id
      and coalesce(p.talent, 1) between 1 and 3
    limit v_cost
  ) picked;

  if v_consumed is null or array_length(v_consumed, 1) < v_cost then
    raise exception 'insufficient_fodder: need %, got %', v_cost, coalesce(array_length(v_consumed,1), 0);
  end if;

  -- Consume the fodder: leave the squad and the active pool.
  delete from public.pm_squads where team_id = p_team_id and player_id = any(v_consumed);
  update public.pm_players set owner_id = null, status = 'retired' where id = any(v_consumed);

  -- Realize the development: pending stats go active, OVR rises.
  update public.pm_players
  set card_stats = v_pending,
      pending_card_stats = null,
      ovr_current = v_new_ovr,
      current_transfer_value_gel = public.pm_player_current_transfer_value_gel(ovr_base, v_new_ovr)
  where id = p_player_id;

  return jsonb_build_object(
    'playerId', p_player_id,
    'oldOvr', v_old_ovr,
    'newOvr', v_new_ovr,
    'fodderConsumed', v_cost
  );
end;
$$;
