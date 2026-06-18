-- PlayManager Phase 1: Core Schema

-- Divisions
create table if not exists pm_divisions (
  id       serial primary key,
  name     text not null,
  level    int  not null default 1
);
insert into pm_divisions (name, level) values
  ('დივიზიონი 1', 1),
  ('დივიზიონი 2', 2),
  ('დივიზიონი 3', 3)
on conflict do nothing;

-- Teams (one per user)
create table if not exists pm_teams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  division_id int  not null default 1 references pm_divisions(id),
  created_at  timestamptz not null default now(),
  constraint pm_teams_user_uniq unique (user_id),
  constraint pm_teams_name_uniq unique (name)
);

-- PM₾ Wallets
create table if not exists pm_wallets (
  team_id  uuid primary key references pm_teams(id) on delete cascade,
  balance  bigint not null default 0 check (balance >= 0)
);

-- PM₾ Ledger
create table if not exists pm_transactions (
  id         bigserial primary key,
  team_id    uuid not null references pm_teams(id) on delete cascade,
  amount     bigint not null, -- positive = credit, negative = debit
  reason     text not null,
  created_at timestamptz not null default now()
);

-- Players (global pool; owner_id null = free/available)
create table if not exists pm_players (
  id              uuid primary key default gen_random_uuid(),
  normalized_name text not null,
  display_name    text not null,
  is_real         boolean not null default false,
  talent          smallint not null check (talent between 1 and 10),
  ovr_base        smallint not null check (ovr_base between 40 and 99),
  ovr_current     smallint not null,
  age             smallint not null default 18 check (age between 18 and 40),
  fatigue         smallint not null default 0 check (fatigue between 0 and 100),
  status          text not null default 'active' check (status in ('active','injured','retired')),
  owner_id        uuid references pm_teams(id) on delete set null,
  created_at      timestamptz not null default now(),
  retired_at      timestamptz,
  constraint pm_players_name_uniq unique (normalized_name)
);

-- Squad (team's active roster)
create table if not exists pm_squads (
  id           bigserial primary key,
  team_id      uuid not null references pm_teams(id) on delete cascade,
  player_id    uuid not null references pm_players(id),
  position     text not null check (position in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST')),
  shirt_number smallint,
  constraint pm_squads_player_uniq unique (player_id)
);

-- Pack definitions
create table if not exists pm_packs (
  id              serial primary key,
  name            text not null,
  description     text,
  cost_pm         bigint not null default 0,
  cost_coins      int,
  rarity_weights  jsonb not null,
  player_count    smallint not null default 5
);

insert into pm_packs (name, description, cost_pm, rarity_weights, player_count) values
  ('სტარტერ პაკი', 'მოგასხურებთ PlayManager-ში!', 0, '{"1":5,"2":10,"3":15,"4":20,"5":20,"6":15,"7":10,"8":3,"9":1,"10":1}', 15)
on conflict do nothing;

-- Pack openings log
create table if not exists pm_pack_openings (
  id              bigserial primary key,
  team_id         uuid not null references pm_teams(id),
  pack_id         int  not null references pm_packs(id),
  players_received uuid[] not null,
  opened_at       timestamptz not null default now()
);

-- Indexes
create index if not exists pm_players_owner_idx on pm_players(owner_id) where owner_id is not null;
create index if not exists pm_players_status_idx on pm_players(status);
create index if not exists pm_squads_team_idx    on pm_squads(team_id);
create index if not exists pm_transactions_team_idx on pm_transactions(team_id, created_at desc);

-- RLS
alter table pm_divisions     enable row level security;
alter table pm_teams         enable row level security;
alter table pm_wallets       enable row level security;
alter table pm_transactions  enable row level security;
alter table pm_players       enable row level security;
alter table pm_squads        enable row level security;
alter table pm_packs         enable row level security;
alter table pm_pack_openings enable row level security;

-- Divisions: public read
create policy "pm_divisions_public_select" on pm_divisions for select using (true);

-- Packs: public read
create policy "pm_packs_public_select" on pm_packs for select using (true);

-- Teams: owner reads own
create policy "pm_teams_owner_select" on pm_teams for select using (user_id = auth.uid());
create policy "pm_teams_owner_insert" on pm_teams for insert with check (user_id = auth.uid());

-- Wallets: owner reads own
create policy "pm_wallets_owner_select" on pm_wallets for select using (
  team_id in (select id from pm_teams where user_id = auth.uid())
);

-- Transactions: owner reads own
create policy "pm_transactions_owner_select" on pm_transactions for select using (
  team_id in (select id from pm_teams where user_id = auth.uid())
);

-- Players: everyone can see all
create policy "pm_players_public_select" on pm_players for select using (true);

-- Squads: owner reads own
create policy "pm_squads_owner_select" on pm_squads for select using (
  team_id in (select id from pm_teams where user_id = auth.uid())
);

-- Pack openings: owner reads own
create policy "pm_pack_openings_owner_select" on pm_pack_openings for select using (
  team_id in (select id from pm_teams where user_id = auth.uid())
);
