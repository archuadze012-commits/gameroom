-- Follow-ups from the SECURITY DEFINER / RPC-exposure audit (2026-07-05),
-- surfaced by an adversarial review of the audit gate itself. Both are pure
-- drift capture: the live DB is already in the target state, but the state was
-- never written to a migration, so a from-scratch build (CI / preview branch /
-- DR) reopens the hole. Verified against live: functions are service_role-only,
-- tables have RLS enabled.

-- 1. pm_hire_staff / pm_upgrade_staff are SECURITY INVOKER mutators (they debit
--    the wallet and write pm_staff) that trust a caller-supplied p_team_id.
--    20260628 redefined pm_hire_staff without `security definer`, and neither
--    got an EXECUTE revoke in any migration — so in a fresh build both are
--    callable by anon/authenticated via PostgREST /rest/v1/rpc with the anon
--    key, letting any user hire/upgrade staff on ANY team. The definer-only
--    audit missed them because prosecdef=false. Lock to service_role like every
--    other mutating pm_* RPC.
revoke all on function public.pm_hire_staff(uuid, text) from public, anon, authenticated;
grant execute on function public.pm_hire_staff(uuid, text) to service_role;

revoke all on function public.pm_upgrade_staff(uuid, text) from public, anon, authenticated;
grant execute on function public.pm_upgrade_staff(uuid, text) to service_role;

-- 2. These tables carry RLS policies but were never `enable row level security`
--    in a migration (the enable was done directly on live). With RLS off the
--    policies are inert, so a fresh build serves them wide open to anon /
--    authenticated (which hold Supabase's default table grants). Enable RLS to
--    activate the policies that already exist. Idempotent — a no-op on live.
alter table public.admin_actions            enable row level security;
alter table public.articles                 enable row level security;
alter table public.blocked_words            enable row level security;
alter table public.cracked_games            enable row level security;
alter table public.featured_content         enable row level security;
alter table public.follows                  enable row level security;
alter table public.hidden_cracked_games     enable row level security;
alter table public.moderation_queue         enable row level security;
alter table public.pinned_content           enable row level security;
alter table public.posts                    enable row level security;
alter table public.reports                  enable row level security;
alter table public.user_challenge_progress  enable row level security;
