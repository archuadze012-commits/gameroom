-- Diminishing per-referral rewards + backfill for undocumented drift.
--
-- Context: process_referral_qualification had a flat 1000/500 NC payout per
-- qualified referral with no cap — at shop prices (top item: 1500 NC,
-- daily-bonus: 10 NC/day) that's ~100 days of organic earning per invite, and
-- with no per-referrer limit it's directly farmable (create N real Google
-- accounts, minimally qualify each, collect N*1000 NC). This adds a
-- diminishing scale: full reward for the first 3 (viral spark stays strong),
-- reduced for the next 7, minimal beyond that (kills bulk-farming ROI while
-- keeping the early-invite incentive intact). Milestone bonuses (3/10/25) are
-- unaffected — those are a separate, already-capped one-time layer.
--
-- This migration also backfills TWO changes another session applied directly
-- to the live DB without a migration file (the same schema-drift class fixed
-- in 20260711b_referral_system_backfill_and_hardening.sql):
--   1. Milestone bonus tiers (3→2000, 10→7500, 25→20000 NC) + the
--      get_top_referrers leaderboard RPC — now captured here /
--      re-declared below so the migration tree matches live and a fresh
--      replay reproduces the feature.
--   2. process_referral_qualification's search_path had regressed to
--      `SET search_path TO 'public'` (missing pg_temp) when that session
--      recreated the function — reintroducing the exact SECURITY DEFINER gap
--      fixed in 20260711b (see that file's header for the full explanation).
--      Restored to `'public', 'pg_temp'` here.

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

  -- Diminishing per-referral reward, keyed to this referrer's already-
  -- rewarded count (v_index = which qualified referral this is for them).
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

  -- Milestone bonuses (unchanged from the un-migrated live version) — a
  -- separate one-time bonus layer on top of the per-referral reward above.
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
    insert into public.notifications (user_id, type, title, body, link)
      values (
        v_ref.referrer_id,
        'referral',
        v_tier || ' მოწვევის ეტაპი მიღწეულია! 🏆',
        'ბონუსი: +' || v_bonus || ' NC ' || v_tier || ' აქტიური მოწვევისთვის',
        '/invite'
      );
  end if;

  return true;
end $$;

revoke all on function public.process_referral_qualification(uuid) from public, anon, authenticated;
grant execute on function public.process_referral_qualification(uuid) to service_role;

-- ── get_top_referrers (backfill — see header) ────────────────────────────
-- Public-safe leaderboard aggregate (username/display_name/avatar_url/count
-- only). SECURITY DEFINER is required here — not a privilege-escalation
-- shortcut — because referrals RLS restricts SELECT to the caller's own
-- referrer_id rows, so an invoker-rights version couldn't aggregate across
-- all users. Client-executable by design (the /invite leaderboard calls it
-- directly); allowlisted in scripts/audit-security-definer.mjs.
create or replace function public.get_top_referrers(p_limit integer default 10)
returns table(username text, display_name text, avatar_url text, invites bigint)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select p.username, p.display_name, p.avatar_url, count(*) as invites
  from public.referrals r
  join public.profiles p on p.id = r.referrer_id
  where r.status = 'rewarded'
  group by p.username, p.display_name, p.avatar_url
  order by invites desc, p.username asc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

revoke all on function public.get_top_referrers(integer) from public, anon;
grant execute on function public.get_top_referrers(integer) to authenticated;
