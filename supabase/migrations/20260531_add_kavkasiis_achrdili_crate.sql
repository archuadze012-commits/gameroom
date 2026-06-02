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
      'მაღალი tier-ის სპეციალური ყუთი. მთავარი drop: M416 Caucasus Ghost.',
      '/weapons/m416-glacier.png',
      'pro',
      30,
      true,
      6
    )
    returning id into v_box_id;
  else
    update public.event_boxes
    set description = 'მაღალი tier-ის სპეციალური ყუთი. მთავარი drop: M416 Caucasus Ghost.',
        image_url = '/weapons/m416-glacier.png',
        cost_currency = 'pro',
        cost_amount = 30,
        is_active = true,
        sort_order = 6
    where id = v_box_id;
  end if;

  if not exists (
    select 1
    from public.box_items
    where box_id = v_box_id
      and item_name = 'M416 Caucasus Ghost'
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
      'M416 Caucasus Ghost',
      'weapon_skin',
      '/weapons/m416-glacier.png',
      'legendary',
      100
    );
  else
    update public.box_items
    set item_type = 'weapon_skin',
        image_url = '/weapons/m416-glacier.png',
        tier = 'legendary',
        weight = 100
    where box_id = v_box_id
      and item_name = 'M416 Caucasus Ghost';
  end if;
end $$;
