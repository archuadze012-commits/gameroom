-- Real-manager leagues (round-robin championships of real pm_teams). Mirrors the
-- cups pattern (instances → participants → fixtures), but standings are folded
-- into participants and matches are simulated in TS (lib/playmanager/leagues.ts)
-- via buildMatchProfile/simulateMatch — no giant SQL match function needed.

create table if not exists public.pm_league_instances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  division_level smallint not null default 4,
  status text not null default 'registration' check (status in ('registration', 'in_progress', 'completed')),
  season_no integer not null default 1,
  max_teams smallint not null default 8,
  prize_pool bigint not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.pm_league_participants (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.pm_league_instances(id) on delete cascade,
  team_id uuid not null references public.pm_teams(id) on delete cascade,
  played smallint not null default 0,
  won smallint not null default 0,
  drawn smallint not null default 0,
  lost smallint not null default 0,
  goals_for smallint not null default 0,
  goals_against smallint not null default 0,
  points smallint not null default 0,
  joined_at timestamptz not null default now(),
  unique (league_id, team_id)
);

create table if not exists public.pm_league_fixtures (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.pm_league_instances(id) on delete cascade,
  round smallint not null,
  home_team_id uuid not null references public.pm_teams(id) on delete cascade,
  away_team_id uuid not null references public.pm_teams(id) on delete cascade,
  home_goals smallint,
  away_goals smallint,
  winner_id uuid references public.pm_teams(id) on delete set null,
  status text not null default 'ready' check (status in ('pending', 'ready', 'completed')),
  start_time timestamptz not null default now(),
  played_at timestamptz
);

create index if not exists pm_league_participants_league_idx on public.pm_league_participants (league_id);
create index if not exists pm_league_fixtures_league_idx on public.pm_league_fixtures (league_id, round);
create index if not exists pm_league_fixtures_due_idx on public.pm_league_fixtures (status, start_time);

-- RLS: read-only for authenticated users; all writes go through the service role
-- (lib/playmanager/leagues.ts via the admin client), which bypasses RLS.
alter table public.pm_league_instances enable row level security;
alter table public.pm_league_participants enable row level security;
alter table public.pm_league_fixtures enable row level security;

drop policy if exists pm_league_instances_read on public.pm_league_instances;
create policy pm_league_instances_read on public.pm_league_instances for select to authenticated using (true);

drop policy if exists pm_league_participants_read on public.pm_league_participants;
create policy pm_league_participants_read on public.pm_league_participants for select to authenticated using (true);

drop policy if exists pm_league_fixtures_read on public.pm_league_fixtures;
create policy pm_league_fixtures_read on public.pm_league_fixtures for select to authenticated using (true);
