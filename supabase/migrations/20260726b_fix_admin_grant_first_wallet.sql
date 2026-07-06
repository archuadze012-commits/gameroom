-- Fix a real balance/ledger desync in admin_grant_currency_as, found by the new
-- shop-currency integration test. The upsert only set (user_id, updated_at) on
-- INSERT and applied p_amount solely in the ON CONFLICT DO UPDATE branch. So when
-- the target user had NO wallet row yet (a fresh user), the grant created a
-- 0-balance wallet and added nothing — yet still wrote a wallet_transactions row
-- claiming +p_amount, leaving the ledger ahead of the actual balance. Set the
-- initial balance on the INSERT too (as claim_daily_bonus_as already does), so a
-- first-time grant credits correctly whether or not the wallet pre-exists.
create or replace function public.admin_grant_currency_as(
  p_admin_id uuid,
  p_user_id uuid,
  p_currency text,
  p_amount integer,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_admin_role text;
begin
  select role::text into v_admin_role
  from public.profiles
  where id = p_admin_id;

  if v_admin_role != 'admin' then
    return jsonb_build_object('success', false, 'error', 'unauthorized');
  end if;

  if p_currency not in ('nc', 'pro') then
    return jsonb_build_object('success', false, 'error', 'invalid_currency');
  end if;

  if p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  insert into public.wallets (user_id, nc_balance, pro_balance, updated_at)
    values (
      p_user_id,
      case when p_currency = 'nc' then p_amount else 0 end,
      case when p_currency = 'pro' then p_amount else 0 end,
      now()
    )
  on conflict (user_id) do update set
    nc_balance  = case when p_currency = 'nc'  then wallets.nc_balance  + p_amount else wallets.nc_balance  end,
    pro_balance = case when p_currency = 'pro' then wallets.pro_balance + p_amount else wallets.pro_balance end,
    updated_at = now();

  insert into public.wallet_transactions (user_id, currency, amount, type, note, granted_by)
    values (p_user_id, p_currency, p_amount, 'admin_grant', p_note, p_admin_id);

  return jsonb_build_object('success', true, 'amount', p_amount, 'currency', p_currency);
end;
$function$;

revoke all on function public.admin_grant_currency_as(uuid, uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.admin_grant_currency_as(uuid, uuid, text, integer, text) to service_role;
