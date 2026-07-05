-- SECURITY DEFINER ACL hardening (2026-07-05 audit).
--
-- Two sources of drift, both found by scripts/audit-security-definer.mjs:
--
-- 1. The pre-migration draft of pm_swap_squad_players was created directly on
--    the live DB with (uuid, integer, integer) args — SECURITY DEFINER, no
--    pinned search_path, and default (PUBLIC/anon/authenticated) EXECUTE, and
--    with p_team_id caller-supplied it let any client shuffle ANY team's squad.
--    The canonical hardened version (20260712) uses bigint args, so the draft
--    would survive as a second overload (also making PostgREST rpc() calls
--    ambiguous). Drop it. No-op on a from-scratch replay, where it never exists.
drop function if exists public.pm_swap_squad_players(uuid, integer, integer);

-- 2. For the pm_* set below, the defining migrations only ever GRANTed execute
--    to service_role and never REVOKEd the default PUBLIC execute — so a fresh
--    build leaves them callable by anon/authenticated via PostgREST /rest/v1/rpc
--    (the revoke was applied on live but never captured). Capture the live
--    state: service_role-only, like every mutating RPC.
--    (toggle_post_like is the exception — its revoke IS in earlier migrations,
--    but a later-sorting migration re-grants it to authenticated and can win the
--    dependency-tolerant replay ordering, so it's re-revoked here to be safe.)
revoke all on function public.pm_apply_weekly_finance(uuid, integer) from public, anon, authenticated;
grant execute on function public.pm_apply_weekly_finance(uuid, integer) to service_role;

revoke all on function public.pm_calculate_weekly_wages(uuid) from public, anon, authenticated;
grant execute on function public.pm_calculate_weekly_wages(uuid) to service_role;

revoke all on function public.pm_create_team(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.pm_create_team(uuid, text, jsonb) to service_role;

revoke all on function public.pm_credit(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.pm_credit(uuid, bigint, text) to service_role;

revoke all on function public.pm_debit(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.pm_debit(uuid, bigint, text) to service_role;

revoke all on function public.pm_ensure_facilities(uuid) from public, anon, authenticated;
grant execute on function public.pm_ensure_facilities(uuid) to service_role;

revoke all on function public.pm_ensure_finance_state(uuid) from public, anon, authenticated;
grant execute on function public.pm_ensure_finance_state(uuid) to service_role;

revoke all on function public.pm_ensure_match_settings(uuid) from public, anon, authenticated;
grant execute on function public.pm_ensure_match_settings(uuid) to service_role;

revoke all on function public.pm_join_cup(uuid, uuid) from public, anon, authenticated;
grant execute on function public.pm_join_cup(uuid, uuid) to service_role;

revoke all on function public.pm_negotiate_sponsor(uuid) from public, anon, authenticated;
grant execute on function public.pm_negotiate_sponsor(uuid) to service_role;

revoke all on function public.pm_run_city_action(uuid, text, text) from public, anon, authenticated;
grant execute on function public.pm_run_city_action(uuid, text, text) to service_role;

revoke all on function public.pm_save_match_settings(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.pm_save_match_settings(uuid, text, text, text, text) to service_role;

revoke all on function public.pm_save_ticket_price(uuid, integer) from public, anon, authenticated;
grant execute on function public.pm_save_ticket_price(uuid, integer) to service_role;

revoke all on function public.toggle_post_like(uuid, uuid) from public, anon, authenticated;
grant execute on function public.toggle_post_like(uuid, uuid) to service_role;
