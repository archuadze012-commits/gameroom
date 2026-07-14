-- Referral amplifiers — two viral-loop nudges added to the qualification RPC.
--
-- 1. Invitee → inviter conversion. When a referred user qualifies they silently
--    received a welcome bonus but were never told, and were never prompted to
--    invite their OWN friends. This is the single biggest leak in the viral
--    loop: every fresh qualified user should immediately become an inviter. We
--    now drop them an in-app notification celebrating the bonus and pointing at
--    /invite. It fires the moment they act (qualification runs on their own
--    activity), so the timing is ideal.
--
-- 2. Milestone-approach teaser. The referrer's qualification notification is now
--    milestone-aware: when this activation leaves them 1–2 activations short of
--    the next bonus tier (3 / 10 / 25), we append "კიდევ N და +X NC ბონუსი!" so
--    they feel the pull to send one or two more invites.
--
-- Everything else (rewards, diminishing scale, milestone bonus + cosmetic,
-- referrer notification) is preserved exactly from 20260712b/c.
create or replace function public.process_referral_qualification(p_referred uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_ref        public.referrals%rowtype;
  v_profile    record;
  v_complete   boolean;
  v_acted      boolean;
  v_returned   boolean;
  v_referrer_reward integer;
  v_referred_reward integer;
  v_referred_name text;
  v_prior_count int;
  v_index int;
  v_count int;
  v_bonus int := 0;
  v_tier text;
  v_body text;
  v_next_ms int;
  v_remaining int;
  v_next_bonus int;
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

  select coalesce(display_name, username) into v_referred_name from public.profiles where id = p_referred;

  -- Referrer notification, with a milestone-approach teaser when 1–2 away.
  v_body := coalesce(v_referred_name, 'ახალი მოთამაშე')
         || ' შემოგვიერთდა შენი ბმულით — მიიღე +' || v_referrer_reward || ' NC';
  v_next_ms := case
                 when v_index < 3 then 3
                 when v_index < 10 then 10
                 when v_index < 25 then 25
                 else null
               end;
  if v_next_ms is not null then
    v_remaining := v_next_ms - v_index;
    if v_remaining between 1 and 2 then
      v_next_bonus := case v_next_ms when 3 then 2000 when 10 then 7500 when 25 then 20000 end;
      v_body := v_body || ' · კიდევ ' || v_remaining || ' და +' || v_next_bonus || ' NC ბონუსი!';
    end if;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
    values (
      v_ref.referrer_id,
      'referral',
      'შენი მოწვევა გააქტიურდა! 🎉',
      v_body,
      '/invite'
    );

  -- AMPLIFIER: turn the freshly-qualified invitee into an inviter.
  insert into public.notifications (user_id, type, title, body, link)
    values (
      p_referred,
      'referral',
      'მიიღე +' || v_referred_reward || ' NC მისალმების ბონუსი! 🎁',
      'ახლა შენ მოიწვიე მეგობრები და მიიღე +1000 NC ყოველ გააქტიურებულ მოწვევაზე',
      '/invite'
    );

  update public.referrals
    set status = 'rewarded', qualified_at = now(),
        referrer_reward = v_referrer_reward, referred_reward = v_referred_reward
    where id = v_ref.id;

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
end $function$;
