-- Drift columns added to migration-created tables directly on the live DB.
-- Reconstructed here (idempotent) so the from-scratch replay matches production.
--
-- pm_teams.is_bot — used by 20260619_performance_rls_cleanup's RLS policy but
-- never added by any migration. See docs/SCHEMA_DRIFT.md.
alter table public.pm_teams add column if not exists is_bot boolean not null default false;
