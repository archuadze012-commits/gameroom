-- PlayManager: add a 'processing' match status so the lazy simulators can claim
-- a fixture atomically (ready -> processing) before simulating.
--
-- processDueCupMatches / processDueLeagueMatches run on nearly every page load
-- and inside playNextFixtureForTeam. With no per-row claim, two concurrent
-- triggers simulate the SAME 'ready' fixture twice: double standings, double
-- development XP, and (at a final) a double cup-prize payout — all farmable by
-- firing parallel requests. The 'processing' marker lets the update itself be
-- the lock: only the txn that flips ready->processing proceeds.

alter table public.pm_cup_matches   drop constraint if exists pm_cup_matches_status_check;
alter table public.pm_cup_matches   add  constraint pm_cup_matches_status_check
  check (status = any (array['pending','ready','processing','completed']));

alter table public.pm_league_fixtures drop constraint if exists pm_league_fixtures_status_check;
alter table public.pm_league_fixtures add  constraint pm_league_fixtures_status_check
  check (status = any (array['pending','ready','processing','completed']));
