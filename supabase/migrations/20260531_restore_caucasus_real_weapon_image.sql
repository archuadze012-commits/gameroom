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
    return;
  end if;

  update public.event_boxes
  set description = 'Mythic ice + gold weapon crate. მთავარი drop: M416 Caucasus Icefire.',
      image_url = '/weapons/m416-glacier.png',
      is_active = true,
      sort_order = 6
  where id = v_box_id;

  update public.box_items
  set item_name = 'M416 Caucasus Icefire',
      item_type = 'weapon_skin',
      image_url = '/weapons/m416-glacier.png',
      tier = 'legendary',
      weight = 100
  where box_id = v_box_id
    and item_name in ('M416 Caucasus Ghost', 'M416 Caucasus Icefire');
end $$;
