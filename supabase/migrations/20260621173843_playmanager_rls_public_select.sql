-- Drop old select policy on pm_teams
drop policy if exists "pm_teams_owner_select" on public.pm_teams;

-- Create new public select policy on pm_teams
create policy "pm_teams_public_select" on public.pm_teams
  for select to public using (true);

-- Drop old select policy on pm_squads
drop policy if exists "pm_squads_owner_select" on public.pm_squads;

-- Create new public select policy on pm_squads
create policy "pm_squads_public_select" on public.pm_squads
  for select to public using (true);
