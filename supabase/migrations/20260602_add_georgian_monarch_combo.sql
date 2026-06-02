do $$
declare
  v_item_id uuid := 'f4f7d2db-83d4-4d2e-9a79-5a3988d16e1b';
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
    'ქართველი მონარქი',
    'პრემიუმ combo სცენა, სადაც ჩარაქტერი და lobby ერთ cinematic სურათად ერთიანდება.',
    'combo',
    '/lobbies/georgian-monarch-combo.png',
    'pro',
    10000,
    'legendary',
    true,
    5,
    jsonb_build_object(
      'game', 'pubg-mobile',
      'combo_id', 'georgian_monarch_combo',
      'scene_url', '/lobbies/georgian-monarch-combo.png',
      'hides_vehicle', true,
      'hides_weapon_stand', true,
      'includes_character', true,
      'includes_lobby', true
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
end $$;
