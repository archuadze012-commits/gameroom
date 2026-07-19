-- ── Clan subsystem drift backfill ────────────────────────────────────────────
-- These 9 tables, 4 functions, 10 policies and the extra columns on clans /
-- clan_members / tournament_participants exist on LIVE but were never captured in
-- supabase/migrations. A fresh replay of the tree would drop them. This migration
-- reconstructs them EXACTLY from a live introspection (2026-07-14) so tree == live.
--
-- Fully idempotent: applied to live it is a safe no-op (create/add … if not
-- exists, create or replace, drop policy + create). Replayed from empty it builds
-- the whole subsystem. See docs/SCHEMA_DRIFT.md.
--
-- clans / clan_members / clan_requests base tables + clan_role/clan_status enums
-- already live in the tree (20260526_phase3_clans.sql) — here we only ADD their
-- drifted columns.
--
-- ⚠ SECURITY DEFINER hardening: award_clan_xp and is_clan_member were on live with
-- search_path=public only (no pg_temp) — the audit gate requires pg_temp. This
-- migration pins `public, pg_temp` on all four definer fns; applying it to live
-- via create-or-replace brings live INTO alignment (no silent mismatch). Privileged
-- mutating fns are revoked from public/anon/authenticated; is_clan_member stays
-- EXECUTE-able by anon/authenticated because 8 clan RLS policies call it (mirrors
-- the is_admin/can_manage helper pattern) — do NOT revoke it, or clan RLS breaks.

-- ── drifted columns on existing tree tables ──────────────────────────────────
alter table public.clans add column if not exists game_slug   varchar(64);
alter table public.clans add column if not exists recruiting   boolean not null default false;
alter table public.clans add column if not exists recruit_note text;
alter table public.clans add column if not exists treasury     integer not null default 0;
alter table public.clans add column if not exists accent_color text;
alter table public.clans add column if not exists emblem       text;

alter table public.clan_members add column if not exists contribution  integer not null default 0;
alter table public.clan_members add column if not exists position      text;
alter table public.clan_members add column if not exists lineup_status text not null default 'bench';
alter table public.clan_members add column if not exists jersey_number smallint;
alter table public.clan_members add column if not exists is_captain    boolean not null default false;

alter table public.tournament_participants add column if not exists clan_id uuid;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tournament_participants_clan_id_fkey'
      and conrelid = 'public.tournament_participants'::regclass
  ) then
    alter table public.tournament_participants
      add constraint tournament_participants_clan_id_fkey
      foreign key (clan_id) references public.clans(id) on delete set null;
  end if;
end $$;

-- ── new tables (live-only) ───────────────────────────────────────────────────
-- Parent tables (clan_events, clan_cosmetic_catalog) precede their children.

create table if not exists public.clan_announcements (
  id         uuid primary key default gen_random_uuid(),
  clan_id    uuid not null references public.clans(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now(),
  pinned     boolean not null default false
);

create table if not exists public.clan_cosmetic_catalog (
  key   text primary key,
  name  text not null,
  type  text not null,
  cost  integer not null,
  value text not null,
  sort  integer not null default 0,
  constraint clan_cosmetic_catalog_type_check check (type = any (array['accent'::text, 'emblem'::text]))
);

create table if not exists public.clan_cosmetics (
  clan_id      uuid not null references public.clans(id) on delete cascade,
  cosmetic_key text not null references public.clan_cosmetic_catalog(key),
  purchased_at timestamptz not null default now(),
  primary key (clan_id, cosmetic_key)
);

create table if not exists public.clan_events (
  id          uuid primary key default gen_random_uuid(),
  clan_id     uuid not null references public.clans(id) on delete cascade,
  created_by  uuid references public.profiles(id) on delete set null,
  title       text not null,
  description text,
  starts_at   timestamptz not null,
  created_at  timestamptz not null default now(),
  event_type  text not null default 'practice',
  constraint clan_events_type_chk check (event_type = any (array['practice'::text, 'match'::text, 'meeting'::text, 'other'::text]))
);

create table if not exists public.clan_event_rsvps (
  event_id   uuid not null references public.clan_events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'going',
  created_at timestamptz not null default now(),
  primary key (event_id, user_id),
  constraint clan_event_rsvps_status_chk check (status = any (array['in'::text, 'out'::text, 'maybe'::text]))
);

create table if not exists public.clan_fixture_rsvps (
  clan_id       uuid not null references public.clans(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        text not null,
  created_at    timestamptz not null default now(),
  primary key (clan_id, tournament_id, user_id),
  constraint clan_fixture_rsvps_status_check check (status = any (array['in'::text, 'out'::text, 'maybe'::text]))
);

create table if not exists public.clan_invites (
  id           uuid primary key default gen_random_uuid(),
  clan_id      uuid not null references public.clans(id) on delete cascade,
  invited_user uuid not null references public.profiles(id) on delete cascade,
  invited_by   uuid references public.profiles(id) on delete set null,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  constraint clan_invites_unique unique (clan_id, invited_user)
);

create table if not exists public.clan_messages (
  id         uuid primary key default gen_random_uuid(),
  clan_id    uuid not null references public.clans(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.clan_treasury_ledger (
  id         uuid primary key default gen_random_uuid(),
  clan_id    uuid not null references public.clans(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  delta      integer not null,
  kind       text not null,
  memo       text,
  created_at timestamptz not null default now(),
  constraint clan_treasury_ledger_kind_check check (kind = any (array['donation'::text, 'purchase'::text]))
);

-- ── indexes (live-only) ──────────────────────────────────────────────────────
create index if not exists clan_announcements_clan_idx   on public.clan_announcements using btree (clan_id, created_at desc);
create index if not exists clan_announcements_pinned_idx on public.clan_announcements using btree (clan_id, pinned, created_at desc);
create unique index if not exists clan_event_rsvps_unique on public.clan_event_rsvps using btree (event_id, user_id);
create index if not exists clan_events_clan_idx      on public.clan_events using btree (clan_id, starts_at);
create index if not exists clan_events_clan_time_idx on public.clan_events using btree (clan_id, starts_at);
create index if not exists clan_invites_user_idx     on public.clan_invites using btree (invited_user, status);
create index if not exists clan_messages_clan_idx    on public.clan_messages using btree (clan_id, created_at);
create index if not exists clan_treasury_ledger_idx  on public.clan_treasury_ledger using btree (clan_id, created_at desc);

-- ── functions (live-only) ────────────────────────────────────────────────────
create or replace function public.is_clan_member(p_clan uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (select 1 from public.clan_members m where m.clan_id = p_clan and m.user_id = p_user);
$function$;
-- Read-only membership helper used by clan RLS policies. Keep anon/authenticated
-- EXECUTE (revoking it disables clan RLS) — allowlisted in audit-security-definer.
revoke all on function public.is_clan_member(uuid, uuid) from public;
grant execute on function public.is_clan_member(uuid, uuid) to anon, authenticated, service_role;

create or replace function public.award_clan_xp(p_clan uuid, p_user uuid, p_amount integer)
returns void
language sql
security definer
set search_path = public, pg_temp
as $function$
  update public.clans
    set xp = xp + p_amount,
        level = (1 + floor((xp + p_amount) / 1000.0))::int,
        updated_at = now()
    where id = p_clan;
  update public.clan_members
    set contribution = contribution + p_amount
    where clan_id = p_clan and p_user is not null and user_id = p_user;
$function$;
revoke all on function public.award_clan_xp(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.award_clan_xp(uuid, uuid, integer) to service_role;

create or replace function public.clan_buy_cosmetic(p_user uuid, p_clan uuid, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare v_role text; v_cost integer; v_treasury integer; v_owned boolean;
begin
  if p_user is null then return jsonb_build_object('success', false, 'error', 'not_authenticated'); end if;

  select role into v_role from clan_members where clan_id = p_clan and user_id = p_user;
  if v_role is null or v_role not in ('leader','officer') then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  select cost into v_cost from clan_cosmetic_catalog where key = p_key;
  if v_cost is null then return jsonb_build_object('success', false, 'error', 'not_found'); end if;

  select exists(select 1 from clan_cosmetics where clan_id = p_clan and cosmetic_key = p_key) into v_owned;
  if v_owned then return jsonb_build_object('success', false, 'error', 'already_owned'); end if;

  select treasury into v_treasury from clans where id = p_clan for update;
  if coalesce(v_treasury,0) < v_cost then
    return jsonb_build_object('success', false, 'error', 'insufficient_treasury');
  end if;

  update clans set treasury = treasury - v_cost where id = p_clan;
  insert into clan_cosmetics (clan_id, cosmetic_key) values (p_clan, p_key);
  insert into clan_treasury_ledger (clan_id, user_id, delta, kind, memo)
    values (p_clan, p_user, -v_cost, 'purchase', p_key);

  return jsonb_build_object('success', true);
end; $function$;
revoke all on function public.clan_buy_cosmetic(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.clan_buy_cosmetic(uuid, uuid, text) to service_role;

create or replace function public.clan_donate_nc(p_user uuid, p_clan uuid, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare v_bal integer; v_is_member boolean; v_new_treasury integer; v_clan_name text;
begin
  if p_user is null then return jsonb_build_object('success', false, 'error', 'not_authenticated'); end if;
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('success', false, 'error', 'bad_amount'); end if;

  select exists(select 1 from clan_members where clan_id = p_clan and user_id = p_user) into v_is_member;
  if not v_is_member then return jsonb_build_object('success', false, 'error', 'not_member'); end if;

  select nc_balance into v_bal from wallets where user_id = p_user for update;
  if not found or coalesce(v_bal,0) < p_amount then
    return jsonb_build_object('success', false, 'error', 'insufficient_funds');
  end if;

  update wallets set nc_balance = nc_balance - p_amount, updated_at = now() where user_id = p_user;
  select name into v_clan_name from clans where id = p_clan;
  insert into wallet_transactions (user_id, currency, amount, type, note)
    values (p_user, 'nc', -p_amount, 'spend', 'კლანის ხაზინა: ' || coalesce(v_clan_name,''));

  update clans set treasury = treasury + p_amount where id = p_clan returning treasury into v_new_treasury;
  insert into clan_treasury_ledger (clan_id, user_id, delta, kind, memo)
    values (p_clan, p_user, p_amount, 'donation', null);

  return jsonb_build_object('success', true, 'treasury', v_new_treasury);
end; $function$;
revoke all on function public.clan_donate_nc(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.clan_donate_nc(uuid, uuid, integer) to service_role;

-- ── RLS + policies (live-only) ───────────────────────────────────────────────
alter table public.clan_announcements    enable row level security;
alter table public.clan_cosmetic_catalog enable row level security;
alter table public.clan_cosmetics        enable row level security;
alter table public.clan_event_rsvps      enable row level security;
alter table public.clan_events           enable row level security;
alter table public.clan_fixture_rsvps    enable row level security;
alter table public.clan_invites          enable row level security;
alter table public.clan_messages         enable row level security;
alter table public.clan_treasury_ledger  enable row level security;

drop policy if exists clan_announcements_select on public.clan_announcements;
create policy clan_announcements_select on public.clan_announcements
  for select using (is_clan_member(clan_id, auth.uid()));

drop policy if exists clan_cosmetic_catalog_select on public.clan_cosmetic_catalog;
create policy clan_cosmetic_catalog_select on public.clan_cosmetic_catalog
  for select using (true);

drop policy if exists clan_cosmetics_select on public.clan_cosmetics;
create policy clan_cosmetics_select on public.clan_cosmetics
  for select using (true);

drop policy if exists clan_event_rsvps_select on public.clan_event_rsvps;
create policy clan_event_rsvps_select on public.clan_event_rsvps
  for select using (exists (
    select 1 from clan_events e
    where e.id = clan_event_rsvps.event_id and is_clan_member(e.clan_id, auth.uid())
  ));

drop policy if exists clan_events_select on public.clan_events;
create policy clan_events_select on public.clan_events
  for select using (is_clan_member(clan_id, auth.uid()));

drop policy if exists clan_fixture_rsvps_select on public.clan_fixture_rsvps;
create policy clan_fixture_rsvps_select on public.clan_fixture_rsvps
  for select using (is_clan_member(clan_id, auth.uid()));

drop policy if exists clan_invites_select on public.clan_invites;
create policy clan_invites_select on public.clan_invites
  for select using (invited_user = auth.uid() or is_clan_member(clan_id, auth.uid()));

drop policy if exists clan_messages_select on public.clan_messages;
create policy clan_messages_select on public.clan_messages
  for select using (exists (
    select 1 from clan_members m
    where m.clan_id = clan_messages.clan_id and m.user_id = auth.uid()
  ));

drop policy if exists clan_messages_insert on public.clan_messages;
create policy clan_messages_insert on public.clan_messages
  for insert with check (
    user_id = auth.uid() and exists (
      select 1 from clan_members m
      where m.clan_id = clan_messages.clan_id and m.user_id = auth.uid()
    )
  );

drop policy if exists clan_treasury_ledger_select on public.clan_treasury_ledger;
create policy clan_treasury_ledger_select on public.clan_treasury_ledger
  for select using (is_clan_member(clan_id, auth.uid()));
