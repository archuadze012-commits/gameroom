-- PlayManager: purge all virtual players, re-draft every team from the real pool.
--
-- The game is real-players-only now. Remove every generated/virtual player
-- (is_real = false), then top every team back up to a full squad with low-level
-- real (EAFC) players via pm_draft_squad().
--
-- pm_squads has no ON DELETE CASCADE to pm_players, so squad rows for virtual
-- players must be removed first. pm_player_position_unlocks and pm_transfer_offers
-- DO cascade, so they clean up automatically.

-- 1. Drop squad memberships of virtual players.
delete from public.pm_squads
  where player_id in (select id from public.pm_players where is_real = false);

-- 2. Delete the virtual players themselves.
delete from public.pm_players where is_real = false;

-- 3. Re-draft every team back up to a full real squad.
do $$
declare t record;
begin
  for t in select id from public.pm_teams loop
    perform public.pm_draft_squad(t.id);
  end loop;
end $$;
