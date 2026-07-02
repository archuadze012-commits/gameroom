-- PlayManager · Training XP shop packs.
-- Buys a development-XP pack: debits the club wallet and awards manager XP in a
-- single transaction. Prices and XP amounts are SERVER-AUTHORITATIVE — the client
-- only sends the pack key, never an amount.
--
-- ⚠️ SECURITY DEFINER RPC: must be revoked from anon/authenticated/public and
-- granted only to service_role (this has regressed twice — see 20260710a).

create or replace function public.pm_buy_xp_pack(p_team_id uuid, p_pack text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_owner_id uuid;
  v_price    bigint;
  v_xp       integer;
  v_new_xp   integer;
begin
  -- Server-authoritative pack catalog (keep in sync with XP_PACKS in the UI).
  case p_pack
    when 'starter' then v_price := 35000;  v_xp := 300;
    when 'prep'    then v_price := 90000;  v_xp := 850;
    when 'elite'   then v_price := 175000; v_xp := 1800;
    else raise exception 'invalid_pack';
  end case;

  select user_id into v_owner_id from public.pm_teams where id = p_team_id;
  if v_owner_id is null then
    raise exception 'team_missing';
  end if;

  -- Debit first (raises insufficient_funds + logs the transaction), then award XP.
  perform public.pm_debit(p_team_id, v_price, 'xp_pack:' || p_pack);
  v_new_xp := public.award_xp(v_owner_id, v_xp);

  return jsonb_build_object('xp', v_xp, 'price', v_price, 'newXp', v_new_xp);
end;
$function$;

revoke execute on function public.pm_buy_xp_pack(uuid, text) from anon, authenticated, public;
grant  execute on function public.pm_buy_xp_pack(uuid, text) to service_role;
