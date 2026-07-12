-- Referral-exclusive cosmetic milestones: at 3 / 10 / 25 qualified invites the
-- referrer is granted an equippable cosmetic that CANNOT be bought in the shop
-- (a visible status flex — far stronger invite motivation than currency alone).
-- These layer on top of the existing NC milestone bonuses.
--
-- Mechanism: the cosmetics are ordinary shop_items with cost_currency = 'referral'
-- (a sentinel — not a real wallet currency), so they show in the shop grid as
-- aspirational "unlock by inviting" items but aren't purchasable. Ownership is
-- granted via user_purchases by process_referral_qualification; equipping then
-- works through the normal equip_item_as path (which checks ownership, not
-- is_active / currency).

-- ── 1. Exclusive cosmetics (idempotent per-row on the referral_tier key) ──────
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('მომწვევი', 'ექსკლუზიური სახელის ჩარჩო — 3 მეგობრის მოწვევისთვის', 'name_frame', 3, 'rare',
        '{"gradient":"from-cyan-400 to-blue-500","glow":true,"referral_tier":"3","exclusive":true}'::jsonb),
      ('ამბასადორი', 'ექსკლუზიური პროფილის ჩარჩო — 10 მეგობრის მოწვევისთვის', 'profile_frame', 10, 'epic',
        '{"color":"#22d3ee","border":"ring-cyan-400/70","animation":"pulse","referral_tier":"10","exclusive":true}'::jsonb),
      ('ლეგენდარული მასპინძელი', 'ექსკლუზიური პროფილის თემა — 25 მეგობრის მოწვევისთვის', 'profile_theme', 25, 'legendary',
        '{"bg":"from-amber-500 to-yellow-300","referral_tier":"25","exclusive":true}'::jsonb)
    ) as t(name, description, category, cost_amount, tier, metadata)
  loop
    if not exists (select 1 from public.shop_items s where s.metadata->>'referral_tier' = r.metadata->>'referral_tier') then
      insert into public.shop_items (name, description, category, cost_currency, cost_amount, tier, is_active, sort_order, metadata, game_slug)
      values (r.name, r.description, r.category, 'referral', r.cost_amount, r.tier, true, 0, r.metadata, null);
    end if;
  end loop;
end $$;

-- ── 2. Block purchase of non-wallet-currency items ───────────────────────────
-- purchase_shop_item_as previously treated ANY cost_currency other than 'nc' as
-- 'pro' (the else branch), so a 'referral' item could be bought with pro coins.
-- Reject anything that isn't a real wallet currency.
create or replace function public.purchase_shop_item_as(p_user_id uuid, p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
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

  if v_item.cost_currency not in ('nc', 'pro') then
    return jsonb_build_object('success', false, 'error', 'not_purchasable');
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
    set nc_balance = nc_balance - v_item.cost_amount, updated_at = now()
    where user_id = p_user_id;
  else
    if coalesce(v_pro_balance, 0) < v_item.cost_amount then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;
    update public.wallets
    set pro_balance = pro_balance - v_item.cost_amount, updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
    values (p_user_id, v_item.cost_currency, -v_item.cost_amount, 'spend', 'შოპი: ' || v_item.name);

  insert into public.user_purchases (user_id, item_id)
    values (p_user_id, p_item_id);

  return jsonb_build_object('success', true, 'item_name', v_item.name);
end;
$function$;

-- ── 3. Grant the cosmetic in the milestone block ─────────────────────────────
-- Recreate process_referral_qualification (from 20260712b) with an extra
-- user_purchases grant of the tier's exclusive cosmetic alongside the NC bonus.
create or replace function public.process_referral_qualification(p_referred uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_ref        public.referrals%rowtype;
  v_profile    record;
  v_complete   boolean;
  v_acted      boolean;
  v_returned   boolean;
  v_referrer_reward integer;
  v_referred_reward integer;
  v_referrer_name text;
  v_prior_count int;
  v_index int;
  v_count int;
  v_bonus int := 0;
  v_tier text;
begin
  select * into v_ref from public.referrals
    where referred_id = p_referred and status = 'pending'
    for update;
  if not found then return false; end if;

  select p.avatar_url, p.favorite_game_slugs, p.created_at, p.last_seen_at, p.username, p.display_name
    into v_profile
    from public.profiles p where p.id = p_referred;
  if not found then return false; end if;

  v_complete := (v_profile.avatar_url is not null and v_profile.avatar_url <> '')
    or coalesce(array_length(v_profile.favorite_game_slugs, 1), 0) >= 1;
  v_returned := v_profile.last_seen_at is not null
    and v_profile.last_seen_at::date > v_profile.created_at::date;
  v_acted :=
       exists (select 1 from public.posts where author_id = p_referred and deleted_at is null)
    or exists (select 1 from public.lfg_posts where author_id = p_referred and deleted_at is null)
    or exists (select 1 from public.lfg_responses where user_id = p_referred)
    or exists (select 1 from public.conversation_messages where sender_id = p_referred and deleted_at is null);

  if not (v_complete and v_returned and v_acted) then
    return false;
  end if;

  select count(*) into v_prior_count from public.referrals
    where referrer_id = v_ref.referrer_id and status = 'rewarded';
  v_index := v_prior_count + 1;

  if v_index <= 3 then
    v_referrer_reward := 1000; v_referred_reward := 500;
  elsif v_index <= 10 then
    v_referrer_reward := 300; v_referred_reward := 150;
  else
    v_referrer_reward := 100; v_referred_reward := 50;
  end if;

  insert into public.wallets (user_id, nc_balance) values (v_ref.referrer_id, v_referrer_reward)
    on conflict (user_id) do update set nc_balance = public.wallets.nc_balance + v_referrer_reward, updated_at = now();
  insert into public.wallets (user_id, nc_balance) values (p_referred, v_referred_reward)
    on conflict (user_id) do update set nc_balance = public.wallets.nc_balance + v_referred_reward, updated_at = now();

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
    values
      (v_ref.referrer_id, 'nc', v_referrer_reward, 'referral', 'referral: invited a friend'),
      (p_referred,        'nc', v_referred_reward, 'referral', 'referral: welcome bonus');

  select coalesce(display_name, username) into v_referrer_name from public.profiles where id = p_referred;
  insert into public.notifications (user_id, type, title, body, link)
    values (
      v_ref.referrer_id,
      'referral',
      'შენი მოწვევა გააქტიურდა! 🎉',
      coalesce(v_referrer_name, 'ახალი მოთამაშე') || ' შემოგვიერთდა შენი ბმულით — მიიღე +' || v_referrer_reward || ' NC',
      '/invite'
    );

  update public.referrals
    set status = 'rewarded', qualified_at = now(),
        referrer_reward = v_referrer_reward, referred_reward = v_referred_reward
    where id = v_ref.id;

  -- Milestone bonuses: NC + an exclusive equippable cosmetic.
  select count(*) into v_count from public.referrals
    where referrer_id = v_ref.referrer_id and status = 'rewarded';
  if v_count = 3 then v_bonus := 2000; v_tier := '3';
  elsif v_count = 10 then v_bonus := 7500; v_tier := '10';
  elsif v_count = 25 then v_bonus := 20000; v_tier := '25';
  end if;
  if v_bonus > 0 then
    insert into public.wallets (user_id, nc_balance) values (v_ref.referrer_id, v_bonus)
      on conflict (user_id) do update set nc_balance = public.wallets.nc_balance + v_bonus, updated_at = now();
    insert into public.wallet_transactions (user_id, currency, amount, type, note)
      values (v_ref.referrer_id, 'nc', v_bonus, 'referral', 'referral milestone x' || v_tier);

    -- Grant the tier's exclusive cosmetic (no-op if it doesn't exist / already owned).
    insert into public.user_purchases (user_id, item_id)
    select v_ref.referrer_id, s.id from public.shop_items s
      where s.metadata->>'referral_tier' = v_tier
    on conflict (user_id, item_id) do nothing;

    insert into public.notifications (user_id, type, title, body, link)
      values (
        v_ref.referrer_id,
        'referral',
        v_tier || ' მოწვევის ეტაპი მიღწეულია! 🏆',
        'ბონუსი: +' || v_bonus || ' NC + ექსკლუზიური cosmetic ' || v_tier || ' აქტიური მოწვევისთვის',
        '/invite'
      );
  end if;

  return true;
end $$;

revoke all on function public.process_referral_qualification(uuid) from public, anon, authenticated;
grant execute on function public.process_referral_qualification(uuid) to service_role;
