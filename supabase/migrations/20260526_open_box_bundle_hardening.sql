alter function public.open_box(uuid) set search_path = public, pg_temp;
alter function public.purchase_shop_item(uuid) set search_path = public, pg_temp;
alter function public.claim_daily_bonus() set search_path = public, pg_temp;
alter function public.admin_grant_currency(uuid, text, integer, text) set search_path = public, pg_temp;

revoke execute on function public.open_box(uuid) from public, anon;
grant execute on function public.open_box(uuid) to authenticated, service_role;

revoke execute on function public.purchase_shop_item(uuid) from public, anon;
grant execute on function public.purchase_shop_item(uuid) to authenticated, service_role;

revoke execute on function public.claim_daily_bonus() from public, anon;
grant execute on function public.claim_daily_bonus() to authenticated, service_role;

revoke execute on function public.admin_grant_currency(uuid, text, integer, text) from public, anon;
grant execute on function public.admin_grant_currency(uuid, text, integer, text) to authenticated, service_role;

create or replace function public.open_box_bundle(
  p_box_id uuid,
  p_paid_opens integer default 10,
  p_total_opens integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_box public.event_boxes%rowtype;
  v_nc_balance integer;
  v_pro_balance integer;
  v_total_weight integer;
  v_total_cost integer;
  v_roll integer;
  v_cumulative integer;
  v_item public.box_items%rowtype;
  v_items jsonb := '[]'::jsonb;
  v_index integer;
  v_bonus_count integer := greatest(p_total_opens - p_paid_opens, 0);
  v_item_found boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_paid_opens < 1 or p_total_opens < p_paid_opens or p_total_opens > 50 then
    return jsonb_build_object('success', false, 'error', 'unknown');
  end if;

  select *
  into v_box
  from public.event_boxes
  where id = p_box_id
    and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'box_not_found');
  end if;

  select coalesce(sum(weight), 0)
  into v_total_weight
  from public.box_items
  where box_id = p_box_id;

  if v_total_weight <= 0 then
    return jsonb_build_object('success', false, 'error', 'unknown');
  end if;

  select nc_balance, pro_balance
  into v_nc_balance, v_pro_balance
  from public.wallets
  where user_id = v_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'insufficient_funds');
  end if;

  v_total_cost := v_box.cost_amount * p_paid_opens;

  if v_box.cost_currency = 'nc' then
    if coalesce(v_nc_balance, 0) < v_total_cost then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set nc_balance = nc_balance - v_total_cost,
        updated_at = now()
    where user_id = v_user_id;
  else
    if coalesce(v_pro_balance, 0) < v_total_cost then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set pro_balance = pro_balance - v_total_cost,
        updated_at = now()
    where user_id = v_user_id;
  end if;

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
  values (
    v_user_id,
    v_box.cost_currency,
    -v_total_cost,
    'spend',
    format('ყუთი x%s (+%s ბონუსი): %s', p_paid_opens, v_bonus_count, v_box.name)
  );

  for v_index in 1..p_total_opens loop
    v_roll := floor(random() * v_total_weight)::integer + 1;
    v_cumulative := 0;
    v_item_found := false;

    for v_item in
      select *
      from public.box_items
      where box_id = p_box_id
      order by id
    loop
      v_cumulative := v_cumulative + v_item.weight;
      if v_roll <= v_cumulative then
        v_item_found := true;
        exit;
      end if;
    end loop;

    if not v_item_found then
      raise exception 'open_box_bundle item selection failed for box %', p_box_id;
    end if;

    insert into public.user_inventory (user_id, item_id, box_id)
    values (v_user_id, v_item.id, p_box_id);

    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'id', v_item.id,
        'name', v_item.item_name,
        'tier', v_item.tier,
        'item_type', v_item.item_type,
        'image_url', v_item.image_url
      )
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'items', v_items,
    'paidOpens', p_paid_opens,
    'totalOpens', p_total_opens,
    'bonusAwarded', v_bonus_count
  );
end;
$function$;

revoke execute on function public.open_box_bundle(uuid, integer, integer) from public, anon;
grant execute on function public.open_box_bundle(uuid, integer, integer) to authenticated, service_role;
