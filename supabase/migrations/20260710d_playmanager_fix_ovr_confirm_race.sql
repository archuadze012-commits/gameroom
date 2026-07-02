-- PlayManager: harden pm_confirm_ovr_upgrade.
--
-- Bug 1 (HIGH, fodder double-spend race): the target player was locked FOR
-- UPDATE but the fodder rows were not, and consumption was an idempotent
-- DELETE/UPDATE with no rowcount check. Two concurrent confirms on DIFFERENT
-- targets that both list the SAME fodder id would each read the fodder as still
-- in-squad, both pass the count gate, and both realise an upgrade for one
-- sacrifice. Fix: lock the picked fodder rows FOR UPDATE SKIP LOCKED (a racing
-- txn then can't grab them → insufficient_fodder → rollback) and assert the
-- squad DELETE actually removed v_cost rows.
--
-- Bug 2 (MEDIUM, talent-ceiling bypass): v_new_ovr was written to ovr_current
-- with no clamp, so the fodder/XP path could push a player past
-- ovr_base + growth_cap (the ceiling pm_train_player already enforces). Clamp it.

create or replace function public.pm_confirm_ovr_upgrade(p_team_id uuid, p_player_id uuid, p_fodder_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_player public.pm_players%rowtype;
  v_pos text;
  v_pending jsonb;
  v_new_ovr smallint;
  v_old_ovr smallint;
  v_cost integer;
  v_consumed uuid[];
  v_deleted integer;
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
  -- Enforce the talent-class ceiling (ovr_base + growth cap), mirroring pm_train_player.
  v_new_ovr := least(
    v_new_ovr,
    (v_player.ovr_base + public.pm_player_ovr_growth_cap(coalesce(v_player.talent, 1)::smallint))::smallint
  );
  if v_new_ovr <= v_old_ovr then
    raise exception 'no_upgrade_available';
  end if;

  v_cost := public.pm_ovr_upgrade_total_cost(v_old_ovr, v_new_ovr);

  select array_agg(id) into v_consumed from (
    select p.id
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id
      and p.id = any(p_fodder_ids)
      and p.id <> p_player_id
      and coalesce(p.talent, 1) between 1 and 3
    limit v_cost
    for update skip locked
  ) picked;

  if v_consumed is null or array_length(v_consumed, 1) < v_cost then
    raise exception 'insufficient_fodder: need %, got %', v_cost, coalesce(array_length(v_consumed,1), 0);
  end if;

  delete from public.pm_squads where team_id = p_team_id and player_id = any(v_consumed);
  get diagnostics v_deleted = row_count;
  if v_deleted < v_cost then
    -- Another txn consumed some of this fodder between the lock and the delete.
    raise exception 'fodder_conflict';
  end if;

  update public.pm_players set owner_id = null, status = 'retired' where id = any(v_consumed);

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
$function$;

revoke execute on function public.pm_confirm_ovr_upgrade(uuid, uuid, uuid[]) from anon, authenticated, public;
grant  execute on function public.pm_confirm_ovr_upgrade(uuid, uuid, uuid[]) to service_role;
