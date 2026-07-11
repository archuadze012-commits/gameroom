-- Backfills the referral/invite feature's schema into the migration tree —
-- it was applied directly to the live database (profiles.referral_code,
-- public.referrals, gen_ref_code/set_referral_code/process_referral_qualification)
-- without ever landing a migration file, so `npm run test:migrations` /
-- `npm run test:security-definer` had no visibility into it and a fresh
-- clone/CI replay could not reproduce it. Written idempotently (if-not-exists
-- guards) so it safely no-ops against the live DB's existing objects while
-- fully creating them on a fresh replay.
--
-- It also fixes two real gaps found while reconciling live state against this
-- repo's own security conventions:
--
--   1. process_referral_qualification was `SET search_path TO 'public'`
--      (missing pg_temp) — the exact SECURITY DEFINER footgun
--      scripts/audit-security-definer.mjs exists to catch (a caller-created
--      pg_temp object could shadow an unqualified name inside the function,
--      executing with the function owner's privileges). It currently isn't
--      client-executable (EXECUTE was never granted to anon/authenticated),
--      so this wasn't an active exploit path — but it would have failed the
--      audit the moment this migration made it visible, and it's the same
--      class of bug this repo has hardened everywhere else. Fixed to
--      `SET search_path TO 'public', 'pg_temp'`.
--
--   2. public.referrals kept Supabase's default table-level grants
--      (INSERT/SELECT/UPDATE/DELETE/TRUNCATE for anon AND authenticated) —
--      RLS being enabled with a single referrers-select-own policy meant
--      INSERT/UPDATE/DELETE were already default-denied for both roles (no
--      matching policy = zero rows for that command), so this wasn't an
--      active hole either. But it's inconsistent with every other
--      user-owned table in this repo (user_blocks, profiles, linked_accounts
--      all explicitly revoke-then-narrow-grant) and is fragile: a future
--      permissive policy added without noticing the wide grant becomes
--      instantly exploitable. Locked down to `select` only for
--      `authenticated`; `anon` gets nothing.

-- ── profiles.referral_code ────────────────────────────────────────────────
alter table public.profiles
  add column if not exists referral_code character varying;

create unique index if not exists profiles_referral_code_unique
  on public.profiles (referral_code)
  where referral_code is not null;

-- 8-char code from an unambiguous alphabet (no 0/O/1/I/L). Invoker rights —
-- pure/no side effects, safe to leave callable by anyone.
create or replace function public.gen_ref_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  end loop;
  return result;
end $$;

-- Assigns a unique referral_code to new profiles that don't already have one
-- (existing.referral_code is preserved, e.g. on a re-run). Invoker rights —
-- runs as part of the profiles INSERT, no privilege change needed.
create or replace function public.set_referral_code()
returns trigger
language plpgsql
as $$
declare c text; tries int := 0;
begin
  if new.referral_code is not null then return new; end if;
  loop
    c := public.gen_ref_code();
    exit when not exists (select 1 from public.profiles where referral_code = c);
    tries := tries + 1;
    if tries > 6 then c := c || floor(random() * 10)::text; exit; end if;
  end loop;
  new.referral_code := c;
  return new;
end $$;

drop trigger if exists trg_set_referral_code on public.profiles;
create trigger trg_set_referral_code
  before insert on public.profiles
  for each row
  execute function public.set_referral_code();

-- Defensive backfill: a profile created before this trigger existed would have
-- a null code (and thus be un-referrable / show "code generating…" forever on
-- /invite). No-op on this repo's live DB (already backfilled) and on a fresh
-- replay (every insert runs the trigger), but makes the migration self-healing
-- for a DB caught in between.
do $$
declare r record; c text; tries int;
begin
  for r in select id from public.profiles where referral_code is null loop
    tries := 0;
    loop
      c := public.gen_ref_code();
      exit when not exists (select 1 from public.profiles where referral_code = c);
      tries := tries + 1;
      if tries > 6 then c := c || floor(random() * 10)::text; exit; end if;
    end loop;
    update public.profiles set referral_code = c where id = r.id;
  end loop;
end $$;

-- ── public.referrals ─────────────────────────────────────────────────────
-- One pending-then-rewarded row per referred user (referred_id is unique —
-- a user can only ever be referred once). code_used is the code as typed at
-- signup time, kept for audit even though referrer_id already resolves it.
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  code_used character varying,
  status text not null default 'pending',
  referrer_reward integer not null default 0,
  referred_reward integer not null default 0,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  constraint referrals_no_self check (referrer_id <> referred_id),
  constraint referrals_referred_unique unique (referred_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.referrals'::regclass and conname = 'referrals_status_check'
  ) then
    alter table public.referrals
      add constraint referrals_status_check check (status in ('pending', 'rewarded'));
  end if;
end $$;

create index if not exists referrals_referrer_idx on public.referrals(referrer_id);
create index if not exists referrals_status_idx on public.referrals(status);

alter table public.referrals enable row level security;

-- A referrer sees their own referral list (the /invite page's "invitees").
-- All writes (attribution on signup, reward on qualification) go through the
-- service-role client / the SECURITY DEFINER function below — no client-side
-- write path exists or should exist, so no insert/update/delete policy.
drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own" on public.referrals
  for select using ((select auth.uid()) = referrer_id);

-- Supabase grants table access to anon/authenticated by default on create;
-- narrow it to what the RLS policy above actually allows.
revoke all on table public.referrals from anon, authenticated;
grant select on table public.referrals to authenticated;

-- ── qualification + reward ──────────────────────────────────────────────
-- Called once per day (see src/lib/update-last-seen.ts) for the current user.
-- A referral "qualifies" once the referred user has: a complete-enough
-- profile (avatar or ≥1 favorite game), returned on a later calendar day than
-- signup, and taken at least one real action (post/LFG post/LFG reply/DM).
-- SECURITY DEFINER because it credits wallets or/notifications for a user
-- OTHER than the caller (the referrer) — must run with elevated privilege,
-- and must NOT be client-executable (see revoke below).
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
  v_referrer_reward constant integer := 1000;
  v_referred_reward constant integer := 500;
  v_referrer_name text;
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

  -- Grant rewards (upsert wallet, then ledger)
  insert into public.wallets (user_id, nc_balance) values (v_ref.referrer_id, v_referrer_reward)
    on conflict (user_id) do update set nc_balance = public.wallets.nc_balance + v_referrer_reward, updated_at = now();
  insert into public.wallets (user_id, nc_balance) values (p_referred, v_referred_reward)
    on conflict (user_id) do update set nc_balance = public.wallets.nc_balance + v_referred_reward, updated_at = now();

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
    values
      (v_ref.referrer_id, 'nc', v_referrer_reward, 'referral', 'referral: invited a friend'),
      (p_referred,        'nc', v_referred_reward, 'referral', 'referral: welcome bonus');

  -- Notify the referrer
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

  return true;
end $$;

-- Called only via the service-role client (src/lib/update-last-seen.ts) —
-- never directly by a client session.
revoke all on function public.process_referral_qualification(uuid) from public, anon, authenticated;
grant execute on function public.process_referral_qualification(uuid) to service_role;
