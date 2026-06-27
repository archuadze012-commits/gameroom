-- PlayManager: leagues (divisions) start locked; new managers start in division D.
-- The full registration UI/flow is a future build — admin will open each division.
-- NOTE: this session also performed one-time DATA ops (not in this file): wiped
-- pm_cup_matches/participants/instances and deleted all is_bot teams (their players
-- fell to owner_id null → free agents via the SET NULL FK). Re-run those manually if
-- rebuilding from scratch.
alter table public.pm_divisions
  add column if not exists registration_open boolean not null default false;

update public.pm_divisions set registration_open = false;

-- New teams start in the bottom division D (level 4) and climb.
alter table public.pm_teams
  alter column division_id set default 4;
