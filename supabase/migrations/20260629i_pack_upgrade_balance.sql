-- Pack / OVR-upgrade economy balance.
-- 1) Cap the upgrade-cost tail: above OVR 68 it grew +20 pro cards/level forever
--    (80->81 = 340 cards). Pro now comes only from the finite real pool, so cap at
--    120 cards/point — still a steep elite sink, but it won't drain the pool.
create or replace function public.pm_ovr_upgrade_cost(p_from_ovr integer)
returns integer
language sql
immutable
as $$
  with n as (select greatest(1, p_from_ovr - 49) as v)
  select case
    when (select v from n) <= 19 then
      (array[1,2,4,6,8,12,16,20,24,30,35,40,45,50,60,70,80,90,100])[(select v from n)]
    else least(120, 100 + ((select v from n) - 19) * 20)
  end;
$$;

-- 2) Packs respect "pro (1-3) is fodder-only":
--    Pro fodder pack → every card is fodder-eligible (talent 1-3).
--    Premium pack → floors at star (4); never wastes a pull on pro.
update public.pm_packs
set rarity_weights = '{"1":40,"2":38,"3":22}'::jsonb
where name = 'Pro ფოდერ პაკი';

update public.pm_packs
set rarity_weights = '{"4":30,"5":30,"6":22,"7":12,"8":4,"10":2}'::jsonb
where name = 'პრემიუმ პაკი';
