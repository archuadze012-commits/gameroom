do $$
declare
  v_box_id uuid;
begin
  select id
    into v_box_id
  from public.event_boxes
  where lower(name) in ('კავკასიის აჩრდილი', 'caucasian icefire')
  order by created_at desc
  limit 1;

  if v_box_id is null then
    raise exception 'Caucasian Icefire crate not found';
  end if;

  update public.event_boxes
  set name = 'Caucasian Icefire',
      description = 'Mythic ice + gold crate. მთავარი drop-ები: M416 Caucasus Icefire და ჟიგული 06.',
      image_url = '/crates/caucasus-icefire-cover.png',
      cost_currency = 'pro',
      cost_amount = 30,
      is_active = true,
      sort_order = 6
  where id = v_box_id;

  update public.box_items
  set item_name = 'M416 Caucasus Icefire',
      item_type = 'weapon_skin',
      image_url = '/weapons/m416-caucasus-icefire.png',
      tier = 'legendary',
      weight = 100
  where box_id = v_box_id
    and item_name in ('M416 Caucasus Ghost', 'M416 Caucasus Icefire');

  if not exists (
    select 1
    from public.box_items
    where box_id = v_box_id
      and item_name = 'ჟიგული 06'
  ) then
    insert into public.box_items (
      box_id,
      item_name,
      item_type,
      image_url,
      tier,
      weight
    )
    values (
      v_box_id,
      'ჟიგული 06',
      'cosmetic',
      '/lobby-assets/icefire-sedan-v3.png',
      'legendary',
      35
    );
  else
    update public.box_items
    set item_type = 'cosmetic',
        image_url = '/lobby-assets/icefire-sedan-v3.png',
        tier = 'legendary',
        weight = 35
    where box_id = v_box_id
      and item_name = 'ჟიგული 06';
  end if;
end $$;
