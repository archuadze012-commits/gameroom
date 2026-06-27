create table if not exists public.pm_team_assets (
  team_id uuid not null references public.pm_teams(id) on delete cascade,
  asset_key text not null,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (team_id, asset_key)
);

create table if not exists public.pm_player_position_unlocks (
  team_id uuid not null references public.pm_teams(id) on delete cascade,
  player_id uuid not null references public.pm_players(id) on delete cascade,
  unlocked_position text not null check (unlocked_position in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST','LM','RM','AM')),
  created_at timestamptz not null default now(),
  primary key (team_id, player_id, unlocked_position)
);

create index if not exists pm_team_assets_team_idx on public.pm_team_assets(team_id);
create index if not exists pm_player_position_unlocks_team_player_idx on public.pm_player_position_unlocks(team_id, player_id);

alter table public.pm_team_assets enable row level security;
alter table public.pm_player_position_unlocks enable row level security;

drop policy if exists "pm_team_assets_owner_select" on public.pm_team_assets;
create policy "pm_team_assets_owner_select"
on public.pm_team_assets
for select
using (team_id in (select id from public.pm_teams where user_id = auth.uid()));

drop policy if exists "pm_player_position_unlocks_owner_select" on public.pm_player_position_unlocks;
create policy "pm_player_position_unlocks_owner_select"
on public.pm_player_position_unlocks
for select
using (team_id in (select id from public.pm_teams where user_id = auth.uid()));

revoke insert, update, delete on public.pm_team_assets from anon, authenticated;
revoke insert, update, delete on public.pm_player_position_unlocks from anon, authenticated;
