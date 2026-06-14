-- PlayManager fix #6: apply a transfer-market spread on sale.
--
-- Problem: pm_sell_player credited the FULL current_transfer_value_gel, and
-- pm_buy_market_player debits that same value. Buying a player for P and immediately
-- selling returned P — a no-loss loop that also farmed XP (+18 buy, +12 sell) for free,
-- and with the transfer-discount perk (refund on buy) it produced net profit per cycle.
--
-- Fix: sell at 85% of the player's value (15% spread). A buy→sell round trip now costs
-- 0.15·P, removing the free money/XP loop while keeping selling a viable strategy.
--
-- ⚠️ Requires `supabase db push` + testing of sell flow and the returned `amount`.

create or replace function public.pm_sell_player(
  p_team_id uuid,
  p_player_id uuid
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_player public.pm_players%rowtype;
  v_value bigint;
  v_sale bigint;
begin
  select * into v_player
  from public.pm_players
  where id = p_player_id and owner_id = p_team_id
  for update;

  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  v_value := v_player.current_transfer_value_gel;
  -- 15% transfer-market spread: you never recoup the full sticker price.
  v_sale := greatest(0, floor(v_value * 0.85)::bigint);

  update public.pm_players
  set owner_id = null
  where id = p_player_id;

  delete from public.pm_squads
  where player_id = p_player_id and team_id = p_team_id;

  if v_sale > 0 then
    perform public.pm_credit(p_team_id, v_sale, 'transfer_sell:' || v_player.normalized_name);
  end if;

  return jsonb_build_object('playerId', v_player.id, 'amount', v_sale);
end;
$$;

grant execute on function public.pm_sell_player(uuid, uuid) to service_role;
