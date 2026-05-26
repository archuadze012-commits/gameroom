create or replace function public.admin_grant_currency_as(
  p_admin_id uuid,
  p_user_id uuid,
  p_currency text,
  p_amount integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
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

  insert into public.wallets (user_id, updated_at)
    values (p_user_id, now())
  on conflict (user_id) do update set
    nc_balance = case when p_currency = 'nc' then wallets.nc_balance + p_amount else wallets.nc_balance end,
    pro_balance = case when p_currency = 'pro' then wallets.pro_balance + p_amount else wallets.pro_balance end,
    updated_at = now();

  insert into public.wallet_transactions (user_id, currency, amount, type, note, granted_by)
    values (p_user_id, p_currency, p_amount, 'admin_grant', p_note, p_admin_id);

  return jsonb_build_object('success', true, 'amount', p_amount, 'currency', p_currency);
end;
$function$;

revoke execute on function public.admin_grant_currency(uuid, text, integer, text) from public, anon, authenticated;
revoke execute on function public.admin_grant_currency_as(uuid, uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.admin_grant_currency_as(uuid, uuid, text, integer, text) to service_role;
