-- Morale drain by squad role, applied on every day-advance (alongside the
-- psychologist recovery in pm_advance_time). Until now morale ONLY ever rose
-- (wins/draws/rest/training all +; only a loss subtracted), so it saturated at
-- 94-100 and stopped being a lever. Now playing time matters: starters stay
-- content, bench players slip, reserves slip faster — so morale stratifies by
-- role and the manager has to rotate the squad or lose the bench.
--
-- Kept as a SEPARATE function (called after pm_advance_time in the server
-- `advancePlayManagerTime` wrapper) rather than editing the ~220-line
-- pm_advance_time, to avoid regressing its aging/decay logic.
--
-- Role thresholds mirror the lineup taxonomy (pm_squads.shirt_number): starters
-- 1-11, bench 12-15, reserves 16+/unset — same split as src/lib/playmanager/city-data.ts.
-- Rates are intentionally gentle: match wins (+6 to all squad) offset them, so
-- the equilibrium is "starters high, bench mid, reserves low", not "everyone 0".

create or replace function public.pm_apply_squad_morale_drain(p_team_id uuid, p_days integer default 1)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_days integer := greatest(1, coalesce(p_days, 1));
begin
  update public.pm_players p
  set morale = least(100, greatest(0, p.morale - (
    case
      when coalesce(s.shirt_number, 99) <= 11 then 0          -- starters: playing → content
      when coalesce(s.shirt_number, 99) <= 15 then v_days     -- bench:    -1 / day
      else v_days * 2                                         -- reserves: -2 / day
    end
  )))
  from public.pm_squads s
  where s.player_id = p.id
    and s.team_id = p_team_id;
end;
$function$;

revoke execute on function public.pm_apply_squad_morale_drain(uuid, integer) from anon, authenticated, public;
grant  execute on function public.pm_apply_squad_morale_drain(uuid, integer) to service_role;
