-- PlayManager: lock down the new SECURITY DEFINER RPCs.
--
-- These functions trust their p_team_id argument (they do not bind to auth.uid()),
-- so they must NOT be directly callable by anon/authenticated over PostgREST — a
-- user could otherwise act on another team. They are only reached through server
-- actions using the service-role client, which resolves the caller's own team
-- first (same pattern as pm_sell_player). Internal helpers (pm_draft_squad) are
-- called by SECURITY DEFINER functions and need no role grant at all.

revoke execute on function public.pm_draft_squad(uuid, smallint, smallint) from anon, authenticated, public;
revoke execute on function public.pm_create_team_v2(uuid, text)            from anon, authenticated, public;
revoke execute on function public.pm_list_player(uuid, uuid, bigint)       from anon, authenticated, public;
revoke execute on function public.pm_unlist_player(uuid, uuid)             from anon, authenticated, public;
revoke execute on function public.pm_buy_listed_player(uuid, uuid)         from anon, authenticated, public;

grant execute on function public.pm_create_team_v2(uuid, text)      to service_role;
grant execute on function public.pm_list_player(uuid, uuid, bigint) to service_role;
grant execute on function public.pm_unlist_player(uuid, uuid)       to service_role;
grant execute on function public.pm_buy_listed_player(uuid, uuid)   to service_role;
