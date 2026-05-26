create or replace function public.claim_daily_bonus_as(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_last date;
  v_today date := current_date;
  v_reward integer := 10;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select last_login_award_at
  into v_last
  from public.profiles
  where id = p_user_id
  for update;

  if v_last is not null and v_last >= v_today then
    return jsonb_build_object(
      'success', false,
      'error', 'already_claimed',
      'next_claim', (v_today + interval '1 day')::date
    );
  end if;

  insert into public.wallets (user_id, nc_balance, updated_at)
    values (p_user_id, v_reward, now())
  on conflict (user_id) do update
    set nc_balance = wallets.nc_balance + v_reward,
        updated_at = now();

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
    values (p_user_id, 'nc', v_reward, 'daily_bonus', 'ყოველდღიური ბონუსი');

  update public.profiles
  set last_login_award_at = v_today
  where id = p_user_id;

  return jsonb_build_object('success', true, 'amount', v_reward, 'currency', 'nc');
end;
$function$;

create or replace function public.purchase_shop_item_as(p_user_id uuid, p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_item record;
  v_nc_balance integer;
  v_pro_balance integer;
  v_exists boolean;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_item
  from public.shop_items
  where id = p_item_id
    and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'item_not_found');
  end if;

  select exists (
    select 1
    from public.user_purchases
    where user_id = p_user_id
      and item_id = p_item_id
  ) into v_exists;

  if v_exists then
    return jsonb_build_object('success', false, 'error', 'already_owned');
  end if;

  select nc_balance, pro_balance
  into v_nc_balance, v_pro_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'insufficient_funds');
  end if;

  if v_item.cost_currency = 'nc' then
    if coalesce(v_nc_balance, 0) < v_item.cost_amount then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set nc_balance = nc_balance - v_item.cost_amount,
        updated_at = now()
    where user_id = p_user_id;
  else
    if coalesce(v_pro_balance, 0) < v_item.cost_amount then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set pro_balance = pro_balance - v_item.cost_amount,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
    values (p_user_id, v_item.cost_currency, -v_item.cost_amount, 'spend', 'შოპი: ' || v_item.name);

  insert into public.user_purchases (user_id, item_id)
    values (p_user_id, p_item_id);

  return jsonb_build_object('success', true, 'item_name', v_item.name);
end;
$function$;

create or replace function public.equip_item_as(p_user_id uuid, p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_item record;
  v_owns boolean;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_item
  from public.shop_items
  where id = p_item_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'item_not_found');
  end if;

  select exists (
    select 1
    from public.user_purchases
    where user_id = p_user_id
      and item_id = p_item_id
  ) into v_owns;

  if not v_owns then
    return jsonb_build_object('success', false, 'error', 'not_owned');
  end if;

  insert into public.user_equipped (user_id, category, item_id)
    values (p_user_id, v_item.category, p_item_id)
  on conflict (user_id, category)
    do update set item_id = p_item_id, equipped_at = now();

  return jsonb_build_object('success', true, 'category', v_item.category);
end;
$function$;

create or replace function public.unequip_category_as(p_user_id uuid, p_category text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  delete from public.user_equipped
  where user_id = p_user_id
    and category = p_category;

  return jsonb_build_object('success', true);
end;
$function$;

create or replace function public.open_box_as(p_user_id uuid, p_box_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_box public.event_boxes%rowtype;
  v_nc_balance integer;
  v_pro_balance integer;
  v_total_weight integer;
  v_roll integer;
  v_cumulative integer := 0;
  v_item public.box_items%rowtype;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_box
  from public.event_boxes
  where id = p_box_id
    and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'box_not_found');
  end if;

  select nc_balance, pro_balance
  into v_nc_balance, v_pro_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'insufficient_funds');
  end if;

  if v_box.cost_currency = 'nc' then
    if coalesce(v_nc_balance, 0) < v_box.cost_amount then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set nc_balance = nc_balance - v_box.cost_amount,
        updated_at = now()
    where user_id = p_user_id;
  else
    if coalesce(v_pro_balance, 0) < v_box.cost_amount then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set pro_balance = pro_balance - v_box.cost_amount,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
    values (p_user_id, v_box.cost_currency, -v_box.cost_amount, 'spend', 'ყუთი: ' || v_box.name);

  select coalesce(sum(weight), 0)
  into v_total_weight
  from public.box_items
  where box_id = p_box_id;

  if v_total_weight = 0 then
    return jsonb_build_object('success', false, 'error', 'no_items');
  end if;

  v_roll := floor(random() * v_total_weight)::integer + 1;

  for v_item in
    select *
    from public.box_items
    where box_id = p_box_id
    order by id
  loop
    v_cumulative := v_cumulative + v_item.weight;
    if v_roll <= v_cumulative then
      exit;
    end if;
  end loop;

  insert into public.user_inventory (user_id, item_id, box_id)
    values (p_user_id, v_item.id, p_box_id);

  return jsonb_build_object(
    'success', true,
    'item', jsonb_build_object(
      'id', v_item.id,
      'name', v_item.item_name,
      'tier', v_item.tier,
      'item_type', v_item.item_type,
      'image_url', v_item.image_url
    )
  );
end;
$function$;

create or replace function public.open_box_bundle_as(
  p_user_id uuid,
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
  if p_user_id is null then
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
  where user_id = p_user_id
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
    where user_id = p_user_id;
  else
    if coalesce(v_pro_balance, 0) < v_total_cost then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set pro_balance = pro_balance - v_total_cost,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
  values (
    p_user_id,
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
    values (p_user_id, v_item.id, p_box_id);

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

create or replace function public.toggle_post_like_as(p_user_id uuid, p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  already_liked boolean;
begin
  if p_user_id is null then
    raise exception 'unauthorized';
  end if;

  select exists (
    select 1
    from public.post_likes
    where post_id = p_post_id
      and user_id = p_user_id
  ) into already_liked;

  if already_liked then
    delete from public.post_likes
    where post_id = p_post_id
      and user_id = p_user_id;

    update public.posts
    set likes_count = greatest(0, likes_count - 1)
    where id = p_post_id;

    return false;
  end if;

  insert into public.post_likes (post_id, user_id)
    values (p_post_id, p_user_id);

  update public.posts
  set likes_count = likes_count + 1
  where id = p_post_id;

  return true;
end;
$function$;

revoke execute on function public.claim_daily_bonus() from public, anon, authenticated;
revoke execute on function public.purchase_shop_item(uuid) from public, anon, authenticated;
revoke execute on function public.equip_item(uuid) from public, anon, authenticated;
revoke execute on function public.unequip_category(text) from public, anon, authenticated;
revoke execute on function public.open_box(uuid) from public, anon, authenticated;
revoke execute on function public.open_box_bundle(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.toggle_post_like(uuid, uuid) from public, anon, authenticated;

revoke execute on function public.claim_daily_bonus_as(uuid) from public, anon, authenticated;
revoke execute on function public.purchase_shop_item_as(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.equip_item_as(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.unequip_category_as(uuid, text) from public, anon, authenticated;
revoke execute on function public.open_box_as(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.open_box_bundle_as(uuid, uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.toggle_post_like_as(uuid, uuid) from public, anon, authenticated;

grant execute on function public.claim_daily_bonus_as(uuid) to service_role;
grant execute on function public.purchase_shop_item_as(uuid, uuid) to service_role;
grant execute on function public.equip_item_as(uuid, uuid) to service_role;
grant execute on function public.unequip_category_as(uuid, text) to service_role;
grant execute on function public.open_box_as(uuid, uuid) to service_role;
grant execute on function public.open_box_bundle_as(uuid, uuid, integer, integer) to service_role;
grant execute on function public.toggle_post_like_as(uuid, uuid) to service_role;
