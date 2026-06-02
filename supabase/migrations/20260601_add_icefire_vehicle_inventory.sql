do $$
declare
  v_item_id uuid := '0b2f3a8e-7c94-4d2e-9f56-8d3e72f5c421';
  v_user_id uuid;
begin
  insert into public.shop_items (
    id,
    name,
    description,
    category,
    image_url,
    cost_currency,
    cost_amount,
    tier,
    is_active,
    sort_order,
    metadata,
    game_slug
  )
  values (
    v_item_id,
    'ჟიგული 06',
    'ლობისთვის განკუთვნილი ყინულის ეფექტიანი ავტომობილი.',
    'vehicle',
    '/lobby-assets/icefire-sedan.png',
    'pro',
    2500,
    'legendary',
    true,
    10,
    jsonb_build_object(
      'game', 'pubg-mobile',
      'vehicle_id', 'icefire_sedan',
      'lobby_slot', 'vehicle',
      'thumbnail_object_position', 'center'
    ),
    'pubg-mobile'
  )
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    image_url = excluded.image_url,
    cost_currency = excluded.cost_currency,
    cost_amount = excluded.cost_amount,
    tier = excluded.tier,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order,
    metadata = excluded.metadata,
    game_slug = excluded.game_slug;

  select id
    into v_user_id
  from public.profiles
  where lower(username) = lower('leonsio12')
  limit 1;

  if v_user_id is not null then
    insert into public.user_purchases (user_id, item_id)
    values (v_user_id, v_item_id)
    on conflict (user_id, item_id) do nothing;

    insert into public.user_equipped (user_id, category, item_id)
    values (v_user_id, 'vehicle', v_item_id)
    on conflict (user_id, category) do update set
      item_id = excluded.item_id,
      equipped_at = now();

    insert into public.user_lobby_loadouts (user_id, game_slug, loadout, updated_at)
    values (v_user_id, 'pubg-mobile', jsonb_build_object('vehicle', 'icefire_sedan'), now())
    on conflict (user_id, game_slug) do update set
      loadout = public.user_lobby_loadouts.loadout || jsonb_build_object('vehicle', 'icefire_sedan'),
      updated_at = now();
  end if;
end $$;
