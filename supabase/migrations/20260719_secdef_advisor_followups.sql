-- Follow-ups from the Supabase security advisors, run right after 20260712–18
-- landed on live (advisors 0028 / 0029). Root cause: a `revoke ... from public`
-- looks sufficient locally but Supabase grants EXECUTE to anon/authenticated by
-- DEFAULT — those grants are separate from PUBLIC and survive a public-only
-- revoke. The from-scratch replay now models those default grants (replay-lib),
-- so the security-definer audit catches this class; these revokes close it.

-- pm_swap_squad_players (20260712) revoked only PUBLIC, leaving it callable by any
-- signed-in user via /rest/v1/rpc — and it trusts a caller-supplied p_team_id and
-- mutates the squad, so anyone could rearrange ANY team. Lock to service_role.
revoke all on function public.pm_swap_squad_players(uuid, bigint, bigint) from public, anon, authenticated;
grant execute on function public.pm_swap_squad_players(uuid, bigint, bigint) to service_role;

-- The DM/block trigger functions (20260716) are SECURITY DEFINER and, per the
-- Supabase defaults, executable by anon/authenticated. They only ever run as
-- triggers (Postgres rejects direct invocation of a trigger function), so this is
-- harmless in practice, but revoke it to clear the advisor. Trigger firing is
-- unaffected by EXECUTE grants.
revoke all on function public.enforce_dm_block_on_message() from public, anon, authenticated;
revoke all on function public.enforce_dm_privacy_on_conversation() from public, anon, authenticated;
