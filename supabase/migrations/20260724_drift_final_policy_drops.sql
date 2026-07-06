-- Migration-drift reconciliation, part 4: the final 4 stale-policy drops.
--
-- These 4 policies were superseded on production (pm_squads/pm_teams owner-only
-- selects were widened to public selects; two profiles UPDATE policies were
-- folded into profiles_update_own), but a from-scratch rebuild keeps re-creating
-- them because the migration that creates them (20260619_performance_rls_cleanup)
-- applies on a LATER pass of the dependency-tolerant replay than the migrations
-- that supersede them — so an earlier drop gets clobbered by a later create.
--
-- The DO-block below gates this migration on tournament_admin_insert existing.
-- That policy is created ONLY by 20260619_performance_rls_cleanup (no earlier
-- migration creates it), so its presence is a reliable "20260619 has already
-- applied" marker. If it isn't there yet, we RAISE so the dependency-tolerant
-- replay defers this file to a later pass; once 20260619 has run (creating the
-- stale policies for the last time), this file applies and drops them for good.
-- Against the live DB this whole file is a no-op: the marker already exists and
-- the 4 policies are already gone.
do $$
begin
  if not exists (
    select 1 from pg_policy
    where polname = 'tournament_admin_insert'
      and polrelid = 'public.tournaments'::regclass
  ) then
    raise exception 'drift-reconciliation: defer until 20260619_performance_rls_cleanup has applied';
  end if;
end $$;

drop policy if exists "pm_squads_owner_select"       on public.pm_squads;   -- live: pm_squads_public_select
drop policy if exists "pm_teams_owner_select"        on public.pm_teams;    -- live: pm_teams_public_select
drop policy if exists "profiles_admin_update"        on public.profiles;    -- live: folded into profiles_update_own
drop policy if exists "profiles_update_own_or_admin" on public.profiles;    -- live: profiles_update_own
