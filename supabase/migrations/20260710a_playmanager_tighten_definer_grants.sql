-- PlayManager: lock down SECURITY DEFINER RPCs that trust p_team_id.
--
-- Postgres grants EXECUTE to PUBLIC by default on CREATE FUNCTION; granting to
-- service_role does NOT remove that default. Every SECURITY DEFINER function
-- added after 20260626_playmanager_tighten_grants.sql regressed and stayed
-- directly callable by anon/authenticated over PostgREST. Because these
-- functions trust their p_team_id argument (they never bind to auth.uid()), an
-- attacker holding only the public anon key could POST /rest/v1/rpc/<fn> to act
-- on ANY team: open packs against a rival's wallet, credit their own team the
-- daily reward out of band, force-release a rival's star player, sabotage
-- lineups, or invoke global maintenance sweeps unauthenticated.
--
-- These are only ever reached through server actions using the service-role
-- client (which resolves the caller's own team first), so revoking the public
-- roles breaks nothing in the app. Mirrors the 20260626 lockdown.

revoke execute on function public.pm_open_pack(uuid, integer)                    from anon, authenticated, public;
revoke execute on function public.pm_claim_daily_reward(uuid)                    from anon, authenticated, public;
revoke execute on function public.pm_confirm_ovr_upgrade(uuid, uuid, uuid[])     from anon, authenticated, public;
revoke execute on function public.pm_career_renew(uuid, uuid)                    from anon, authenticated, public;
revoke execute on function public.pm_career_release(uuid, uuid)                  from anon, authenticated, public;
revoke execute on function public.pm_save_lineup_formation(uuid, text, jsonb)    from anon, authenticated, public;
revoke execute on function public.pm_match_player_events(uuid, integer, text)    from anon, authenticated, public;
revoke execute on function public.pm_develop_academy_prospects(uuid, integer)    from anon, authenticated, public;
revoke execute on function public.pm_process_career_ends(uuid, integer)          from anon, authenticated, public;
revoke execute on function public.pm_grant_skill_development(uuid, integer)       from anon, authenticated, public;
revoke execute on function public.pm_grant_match_development(uuid)               from anon, authenticated, public;
revoke execute on function public.pm_ensure_academy_youth(uuid)                  from anon, authenticated, public;
revoke execute on function public.pm_player_dev_completion_age(uuid, text)       from anon, authenticated, public;
revoke execute on function public.pm_team_match_profile(uuid)                    from anon, authenticated, public;
revoke execute on function public.pm_retire_legacy_market_players()              from anon, authenticated, public;

-- Keep the service-role path intact (idempotent).
grant execute on function public.pm_open_pack(uuid, integer)                    to service_role;
grant execute on function public.pm_claim_daily_reward(uuid)                    to service_role;
grant execute on function public.pm_confirm_ovr_upgrade(uuid, uuid, uuid[])     to service_role;
grant execute on function public.pm_career_renew(uuid, uuid)                    to service_role;
grant execute on function public.pm_career_release(uuid, uuid)                  to service_role;
grant execute on function public.pm_save_lineup_formation(uuid, text, jsonb)    to service_role;
grant execute on function public.pm_match_player_events(uuid, integer, text)    to service_role;
grant execute on function public.pm_develop_academy_prospects(uuid, integer)    to service_role;
grant execute on function public.pm_process_career_ends(uuid, integer)          to service_role;
grant execute on function public.pm_grant_skill_development(uuid, integer)       to service_role;
grant execute on function public.pm_grant_match_development(uuid)               to service_role;
grant execute on function public.pm_ensure_academy_youth(uuid)                  to service_role;
grant execute on function public.pm_player_dev_completion_age(uuid, text)       to service_role;
grant execute on function public.pm_team_match_profile(uuid)                    to service_role;
grant execute on function public.pm_retire_legacy_market_players()              to service_role;
