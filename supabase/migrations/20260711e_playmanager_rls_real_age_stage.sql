-- pm_player_real_age_stage holds public reference data only — the real-world age
-- of each real player from the EA FC dataset (normalized_name -> real_age; no
-- team_id, no user_id, no per-user data). It was the ONLY pm_ table with row
-- level security disabled, an inconsistency that makes the read-side harder to
-- audit ("is every pm_ table protected?"). Enable RLS for consistency, with a
-- public read policy so its intended world-readable access is unchanged and
-- nothing breaks. Writes still go through the service role.

alter table public.pm_player_real_age_stage enable row level security;

drop policy if exists pm_player_real_age_stage_read on public.pm_player_real_age_stage;
create policy pm_player_real_age_stage_read
  on public.pm_player_real_age_stage
  for select to public
  using (true);
