do $$
declare
  v_box_id uuid;
begin
  select id
    into v_box_id
  from public.event_boxes
  where name = 'Borjgali PRO Crate'
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
      'Borjgali PRO Crate',
      'ქართული ორნამენტებით გაფორმებული PRO ყუთი. პირველი drop: AKM Borjgali PRO.',
      '/weapons/akm-borjgali-pro.svg',
      'pro',
      25,
      true,
      5
    )
    returning id into v_box_id;
  else
    update public.event_boxes
    set description = 'ქართული ორნამენტებით გაფორმებული PRO ყუთი. პირველი drop: AKM Borjgali PRO.',
        image_url = '/weapons/akm-borjgali-pro.svg',
        cost_currency = 'pro',
        cost_amount = 25,
        is_active = true,
        sort_order = 5
    where id = v_box_id;
  end if;

  if not exists (
    select 1
    from public.box_items
    where box_id = v_box_id
      and item_name = 'AKM Borjgali PRO'
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
      'AKM Borjgali PRO',
      'weapon_skin',
      '/weapons/akm-borjgali-pro.svg',
      'legendary',
      100
    );
  else
    update public.box_items
    set item_type = 'weapon_skin',
        image_url = '/weapons/akm-borjgali-pro.svg',
        tier = 'legendary',
        weight = 100
    where box_id = v_box_id
      and item_name = 'AKM Borjgali PRO';
  end if;
end $$;
