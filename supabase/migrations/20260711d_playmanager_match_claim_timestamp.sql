-- PlayManager: stuck-match recovery for the lazy cup/league simulators.
--
-- processDue* claims a fixture ready -> processing, simulates it, then writes
-- the result and flips it to completed. If the process dies (crash, timeout,
-- network drop) between the claim and the completion, the fixture is stranded
-- in 'processing' forever — processDue only ever selects 'ready', so it is never
-- retried: standings never update and that match never plays.
--
-- Record WHEN a fixture was claimed so a later run can reclaim a stale one
-- (processing longer than a safe window) back to 'ready'. The completion write
-- is a single atomic update, so a stranded 'processing' row has no partial
-- result to undo — resetting it to 'ready' is clean.

alter table public.pm_cup_matches     add column if not exists claimed_at timestamptz;
alter table public.pm_league_fixtures  add column if not exists claimed_at timestamptz;

-- One-off: recover anything already stranded in 'processing' from before this fix.
update public.pm_cup_matches    set status = 'ready', claimed_at = null where status = 'processing';
update public.pm_league_fixtures set status = 'ready', claimed_at = null where status = 'processing';
