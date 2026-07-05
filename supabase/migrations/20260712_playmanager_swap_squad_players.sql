-- pm_swap_squad_players: swap which player occupies two of a team's squad slots.
--
-- The active squad is the first 18 pm_squads rows (by id); rows beyond that are
-- the "unassigned" holding area (excess players a team owns but hasn't slotted).
-- Swapping the player_id between an active slot and an unassigned slot promotes
-- the unassigned player into the active squad and demotes the other — each slot
-- keeps its own lineup position (shirt_number), only the occupant changes.
--
-- Ownership-scoped (both slots must belong to p_team_id) and SECURITY DEFINER /
-- service_role-only, matching every other mutating pm_* RPC.

-- pm_squads has unique(player_id). Swapping two rows' player_id transiently
-- collides mid-swap, which a non-deferrable unique rejects. Make the constraint
-- deferrable (still checked immediately by default) so the swap function can
-- defer it to transaction end for that one operation.
alter table public.pm_squads drop constraint if exists pm_squads_player_uniq;
alter table public.pm_squads
  add constraint pm_squads_player_uniq unique (player_id) deferrable initially immediate;

create or replace function public.pm_swap_squad_players(
  p_team_id uuid,
  p_active_id bigint,
  p_unassigned_id bigint
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_active_player uuid;
  v_unassigned_player uuid;
begin
  if p_active_id = p_unassigned_id then
    raise exception 'invalid_swap';
  end if;

  select player_id into v_active_player
  from public.pm_squads
  where id = p_active_id and team_id = p_team_id;
  if not found then
    raise exception 'player_not_found';
  end if;

  select player_id into v_unassigned_player
  from public.pm_squads
  where id = p_unassigned_id and team_id = p_team_id;
  if not found then
    raise exception 'player_not_found';
  end if;

  -- Defer the unique(player_id) check to transaction end so the two UPDATEs
  -- below can pass through a transient collision (row A holds B's player before
  -- row B is reassigned). The end-state is a valid 1:1 swap.
  set constraints pm_squads_player_uniq deferred;

  update public.pm_squads set player_id = v_unassigned_player
  where id = p_active_id and team_id = p_team_id;

  update public.pm_squads set player_id = v_active_player
  where id = p_unassigned_id and team_id = p_team_id;

  return jsonb_build_object(
    'swapped', true,
    'activeSlot', p_active_id,
    'unassignedSlot', p_unassigned_id
  );
end;
$$;

revoke all on function public.pm_swap_squad_players(uuid, bigint, bigint) from public;
grant execute on function public.pm_swap_squad_players(uuid, bigint, bigint) to service_role;
