do $$
declare
  v_box_id uuid;
begin
  select id
    into v_box_id
  from public.event_boxes
  where name = 'კავკასიის აჩრდილი'
  limit 1;

  if v_box_id is null then
    insert into public.event_boxes (
      name,
      description,
      image_url,
      cost_currency,
      cost_amount,
      is_active,
      sort_order
    )
    values (
      'კავკასიის აჩრდილი',
      'Mythic ice + gold weapon crate. მთავარი drop: M416 Caucasus Icefire.',
      '/weapons/m416-caucasus-icefire.svg',
      'pro',
      30,
      true,
      6
    )
    returning id into v_box_id;
  else
    update public.event_boxes
    set description = 'Mythic ice + gold weapon crate. მთავარი drop: M416 Caucasus Icefire.',
        image_url = '/weapons/m416-caucasus-icefire.svg',
        cost_currency = 'pro',
        cost_amount = 30,
        is_active = true,
        sort_order = 6
    where id = v_box_id;
  end if;

  update public.box_items
  set item_name = 'M416 Caucasus Icefire',
      item_type = 'weapon_skin',
      image_url = '/weapons/m416-caucasus-icefire.svg',
      tier = 'legendary',
      weight = 100
  where box_id = v_box_id
    and item_name in ('M416 Caucasus Ghost', 'M416 Caucasus Icefire');

  if not exists (
    select 1
    from public.box_items
    where box_id = v_box_id
      and item_name = 'M416 Caucasus Icefire'
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
      'M416 Caucasus Icefire',
      'weapon_skin',
      '/weapons/m416-caucasus-icefire.svg',
      'legendary',
      100
    );
  end if;
end $$;
