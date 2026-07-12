-- "Better together" co-op reward: a one-time bonus that fires only once the
-- referrer and the referred user have actually INTERACTED on the platform —
-- not merely signed up. Ties the reward to a real connection (retention), and
-- the two-sided requirement blocks trivial one-account self-farming.

alter table public.referrals
  add column if not exists coop_rewarded_at timestamptz;

-- Called once/day per active user (see src/lib/update-last-seen.ts) for any
-- referral pair the user belongs to (as referrer OR referred). Grants both
-- sides a modest NC bonus the first time they've genuinely played together.
-- SECURITY DEFINER (credits a wallet for the OTHER user); service-role only.
create or replace function public.process_referral_coop(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_ref record;
  v_a uuid;
  v_b uuid;
  v_interacted boolean;
  v_reward constant integer := 300;
begin
  for v_ref in
    select id, referrer_id, referred_id from public.referrals
    where (referrer_id = p_user or referred_id = p_user) and coop_rewarded_at is null
    for update
  loop
    v_a := v_ref.referrer_id;
    v_b := v_ref.referred_id;

    -- "Together" = a two-sided DM (both sent a message in a shared conversation)
    -- OR one answered the other's LFG post.
    v_interacted :=
      exists (
        select 1 from public.conversations c
        where ((c.user_a = v_a and c.user_b = v_b) or (c.user_a = v_b and c.user_b = v_a))
          and exists (select 1 from public.conversation_messages m
                      where m.conversation_id = c.id and m.sender_id = v_a and m.deleted_at is null)
          and exists (select 1 from public.conversation_messages m
                      where m.conversation_id = c.id and m.sender_id = v_b and m.deleted_at is null)
      )
      or exists (
        select 1 from public.lfg_responses r
        join public.lfg_posts p on p.id = r.post_id
        where (r.user_id = v_a and p.author_id = v_b)
           or (r.user_id = v_b and p.author_id = v_a)
      );

    if v_interacted then
      insert into public.wallets (user_id, nc_balance) values (v_a, v_reward)
        on conflict (user_id) do update set nc_balance = public.wallets.nc_balance + v_reward, updated_at = now();
      insert into public.wallets (user_id, nc_balance) values (v_b, v_reward)
        on conflict (user_id) do update set nc_balance = public.wallets.nc_balance + v_reward, updated_at = now();

      insert into public.wallet_transactions (user_id, currency, amount, type, note) values
        (v_a, 'nc', v_reward, 'referral', 'co-op bonus: played with your referral'),
        (v_b, 'nc', v_reward, 'referral', 'co-op bonus: played with your inviter');

      insert into public.notifications (user_id, type, title, body, link) values
        (v_a, 'referral', 'Co-op ბონუსი! 🤝', 'ითამაშე მოწვეულ მეგობართან ერთად — მიიღე +' || v_reward || ' NC', '/invite'),
        (v_b, 'referral', 'Co-op ბონუსი! 🤝', 'ითამაშე მომწვევ მეგობართან ერთად — მიიღე +' || v_reward || ' NC', '/invite');

      update public.referrals set coop_rewarded_at = now() where id = v_ref.id;
    end if;
  end loop;
end $$;

revoke all on function public.process_referral_coop(uuid) from public, anon, authenticated;
grant execute on function public.process_referral_coop(uuid) to service_role;
