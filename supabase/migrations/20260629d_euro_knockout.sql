-- Euro tournaments: add a knockout format to the league system. Knockout uses
-- the same instances/participants/fixtures tables, with a single-elim bracket
-- (fixtures gain a position; team slots become nullable until winners propagate).

alter table public.pm_league_instances
  add column if not exists format text not null default 'round_robin'
    check (format in ('round_robin', 'knockout'));

alter table public.pm_league_fixtures
  add column if not exists position smallint;

-- Later bracket rounds have empty slots until the prior round resolves.
alter table public.pm_league_fixtures alter column home_team_id drop not null;
alter table public.pm_league_fixtures alter column away_team_id drop not null;
