-- Baseline: drift objects reconstructed from the live database (2026-07-05).
--
-- ~45 public tables, 5 enums, and a few RPC signatures exist in the live Supabase
-- project but were never captured by a CREATE in supabase/migrations/ (they were
-- created via the dashboard or uncommitted SQL). Without them a from-scratch
-- replay of the migration tree fails, because dozens of later migrations
-- ALTER / index / policy / grant against these objects.
--
-- This migration recreates them faithfully (columns, types, defaults, PK/unique
-- copied from pg_catalog on the live DB) so the tree builds on a clean engine.
-- Every statement is idempotent (IF NOT EXISTS / guarded), so applying it to the
-- live DB is a no-op. It is dated before the earliest migration so it runs first.
--
-- FKs, CHECKs, indexes, RLS policies and real function bodies are deliberately
-- NOT reproduced here — later migrations add those, and the replay gate only
-- needs the base objects to exist. See docs/SCHEMA_DRIFT.md.

create schema if not exists private;

-- ── Enums present in live, created by no migration ───────────────────────────
do $$ begin if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where t.typname='mafia_action_type' and n.nspname='public') then create type public.mafia_action_type as enum ('collect', 'train_strength', 'train_defense', 'train_speed', 'attack', 'claim_plot', 'build_plot', 'upgrade_plot', 'collect_plot', 'hire_muscle', 'raid_plot'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where t.typname='mafia_business_type' and n.nspname='public') then create type public.mafia_business_type as enum ('workshop', 'market_kiosk', 'garage', 'bar', 'casino'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where t.typname='mafia_class' and n.nspname='public') then create type public.mafia_class as enum ('bandit', 'thief', 'ex_spec'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where t.typname='mafia_feed_type' and n.nspname='public') then create type public.mafia_feed_type as enum ('system', 'economy', 'training', 'combat', 'gang', 'territory'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where t.typname='wallet_tx_type' and n.nspname='public') then create type public.wallet_tx_type as enum ('daily_bonus', 'admin_grant', 'event_reward', 'spend', 'refund'); end if; end $$;

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.admin_actions (
  id uuid default gen_random_uuid() not null,
  actor_id uuid not null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.announcement_reads (
  user_id uuid not null,
  announcement_id uuid not null,
  read_at timestamp with time zone default now()
);

create table if not exists public.announcements (
  id uuid default gen_random_uuid() not null,
  title text not null,
  body text not null,
  severity text default 'info'::text,
  author_id uuid,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone
);

create table if not exists public.articles (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  title text not null,
  excerpt text,
  content text not null,
  cover_url text,
  game_slug text,
  author_id uuid not null,
  published boolean default false not null,
  created_at timestamp with time zone default now() not null,
  published_at timestamp with time zone
);

create table if not exists public.badge_unlocks (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  badge_code text not null,
  unlocked_at timestamp with time zone default now()
);

create table if not exists public.blocked_words (
  id uuid default gen_random_uuid() not null,
  word text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.box_items (
  id uuid default gen_random_uuid() not null,
  box_id uuid not null,
  item_name text not null,
  item_type text not null,
  image_url text,
  tier text not null,
  weight integer not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() not null,
  channel_id text not null,
  author_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now(),
  deleted_at timestamp with time zone,
  deleted_by uuid
);

create table if not exists public.conversation_messages (
  id uuid default gen_random_uuid() not null,
  conversation_id uuid not null,
  sender_id uuid not null,
  body text not null,
  read_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.conversations (
  id uuid default gen_random_uuid() not null,
  user_a uuid not null,
  user_b uuid not null,
  last_message_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create table if not exists public.cracked_games (
  id text not null,
  title text not null,
  emoji text default '🎮'::text not null,
  cover_url text,
  release_year integer default EXTRACT(year FROM now()) not null,
  rating numeric default '0'::numeric not null,
  description text not null,
  download_url text default '#'::text not null,
  accent text default 'from-amber-500/30 to-amber-500/5'::text not null,
  genres text[] default '{}'::text[] not null,
  platforms text[] default '{}'::text[] not null,
  trending boolean default false not null,
  system_reqs jsonb not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  gameplay_url text,
  metacritic_score numeric
);

create table if not exists public.daily_challenges (
  id uuid default gen_random_uuid() not null,
  title text not null,
  description text,
  challenge_type text default 'manual'::text not null,
  xp_reward integer default 50 not null,
  target_count integer default 1 not null,
  active_date text not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.event_boxes (
  id uuid default gen_random_uuid() not null,
  name text not null,
  description text,
  image_url text,
  cost_currency text not null,
  cost_amount integer not null,
  is_active boolean default true not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.featured_content (
  id uuid default gen_random_uuid() not null,
  feature_type text not null,
  target_id text not null,
  position integer default 0,
  active boolean default true,
  created_by uuid,
  created_at timestamp with time zone default now()
);

create table if not exists public.follows (
  follower_id uuid not null,
  following_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.game_rooms (
  id uuid default gen_random_uuid() not null,
  room_code character varying(255) not null,
  game_slug text not null,
  mode text default 'classic'::text not null,
  host_id uuid not null,
  title text not null,
  map text,
  perspective text default 'TPP'::text not null,
  max_players integer default 100 not null,
  current_players integer default 1 not null,
  is_private boolean default false not null,
  password text,
  notes text,
  status text default 'open'::text not null,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone not null
);

create table if not exists public.hidden_cracked_games (
  id text not null,
  hidden_at timestamp with time zone default now() not null
);

create table if not exists public.lfg_comments (
  id uuid default gen_random_uuid() not null,
  post_id uuid not null,
  user_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone
);

create table if not exists public.lfg_queue (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  game_slug text not null,
  region text,
  rank_filter text,
  status text default 'searching'::text not null,
  matched_with uuid,
  matched_conversation_id uuid,
  matched_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone
);

create table if not exists public.linked_accounts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  provider text not null,
  external_id text not null,
  external_name text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.mafia_action_logs (
  id uuid default gen_random_uuid() not null,
  actor_id uuid not null,
  action_type mafia_action_type not null,
  target_user_id uuid,
  amount integer,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.mafia_battle_logs (
  id uuid default gen_random_uuid() not null,
  attacker_id uuid not null,
  defender_id uuid not null,
  winner_id uuid,
  money_transferred integer default 0 not null,
  attacker_roll integer not null,
  defender_roll integer not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.mafia_businesses (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  type mafia_business_type default 'workshop'::mafia_business_type not null,
  city character varying(40) default 'tbilisi'::character varying not null,
  district character varying(80) default 'vake'::character varying not null,
  name character varying(120) not null,
  level integer default 1 not null,
  income_per_hour integer default 18 not null,
  last_collected_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.mafia_districts (
  id character varying(50) not null,
  name character varying(100) not null,
  bonus text not null,
  clan_id uuid,
  level integer default 1 not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.mafia_feed_events (
  id uuid default gen_random_uuid() not null,
  type mafia_feed_type not null,
  actor_id uuid,
  target_user_id uuid,
  city character varying(40) default 'tbilisi'::character varying not null,
  district character varying(80),
  message text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.mafia_players (
  user_id uuid not null,
  class mafia_class default 'bandit'::mafia_class not null,
  city character varying(40) default 'tbilisi'::character varying not null,
  district character varying(80) default 'vake'::character varying not null,
  money integer default 250 not null,
  authority integer default 1 not null,
  influence integer default 1 not null,
  strength integer default 10 not null,
  defense integer default 10 not null,
  speed integer default 10 not null,
  heat integer default 0 not null,
  hospital_until timestamp with time zone,
  last_action_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.mafia_plots (
  id uuid default gen_random_uuid() not null,
  district_id character varying(50) not null,
  tile_col integer not null,
  tile_row integer not null,
  building_type character varying(50),
  level integer default 1 not null,
  owner_clan_id uuid,
  updated_at timestamp with time zone default now() not null,
  muscle integer default 0 not null,
  cash_stored integer default 0 not null,
  last_collected_at timestamp with time zone default now() not null
);

create table if not exists public.moderation_queue (
  id uuid default gen_random_uuid() not null,
  content_type text not null,
  content_id text not null,
  content_snapshot text not null,
  author_id uuid,
  ai_score numeric,
  ai_reason text,
  status text default 'pending'::text not null,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.pinned_content (
  id uuid default gen_random_uuid() not null,
  content_type text not null,
  content_id text not null,
  pinned_by uuid,
  created_at timestamp with time zone default now()
);

create table if not exists public.post_comments (
  id uuid default gen_random_uuid() not null,
  post_id uuid not null,
  author_id uuid not null,
  body text not null,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.post_likes (
  post_id uuid not null,
  user_id uuid not null
);

create table if not exists public.post_reactions (
  post_id uuid not null,
  user_id uuid not null,
  emoji text not null
);

create table if not exists public.posts (
  id uuid default gen_random_uuid() not null,
  author_id uuid not null,
  content text not null,
  likes_count integer default 0 not null,
  media_urls text[] default '{}'::text[],
  deleted_at timestamp with time zone,
  deleted_by uuid,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamp with time zone default now()
);

create table if not exists public.reports (
  id uuid default gen_random_uuid() not null,
  reporter_id uuid not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  status text default 'open'::text not null,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.room_chat_messages (
  id uuid default gen_random_uuid() not null,
  room_id uuid not null,
  user_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.shop_items (
  id uuid default gen_random_uuid() not null,
  name text not null,
  description text,
  category text not null,
  image_url text,
  cost_currency text not null,
  cost_amount integer not null,
  tier text not null,
  is_active boolean default true not null,
  sort_order integer default 0 not null,
  metadata jsonb default '{}'::jsonb not null,
  game_slug text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.user_challenge_progress (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  challenge_id uuid not null,
  progress integer default 0 not null,
  completed boolean default false not null,
  claimed boolean default false not null,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_equipped (
  user_id uuid not null,
  category text not null,
  item_id uuid not null,
  equipped_at timestamp with time zone default now() not null
);

create table if not exists public.user_inventory (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  item_id uuid not null,
  box_id uuid,
  obtained_at timestamp with time zone default now() not null
);

create table if not exists public.user_lobby_loadouts (
  user_id uuid not null,
  game_slug text not null,
  loadout jsonb default '{}'::jsonb not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.user_mutes (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  channel_id text,
  reason text,
  muted_by uuid,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_purchases (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  item_id uuid not null,
  purchased_at timestamp with time zone default now() not null
);

create table if not exists public.wallet_transactions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  currency text not null,
  amount integer not null,
  type wallet_tx_type not null,
  note text,
  granted_by uuid,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.wallets (
  user_id uuid not null,
  nc_balance integer default 0 not null,
  pro_balance integer default 0 not null,
  updated_at timestamp with time zone default now() not null
);

-- ── Primary keys & unique constraints ────────────────────────────────────────
do $$ begin if not exists (select 1 from pg_constraint where conname='admin_actions_pkey' and conrelid='public.admin_actions'::regclass) then alter table only public.admin_actions add constraint admin_actions_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='announcement_reads_pkey' and conrelid='public.announcement_reads'::regclass) then alter table only public.announcement_reads add constraint announcement_reads_pkey PRIMARY KEY (user_id, announcement_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='announcements_pkey' and conrelid='public.announcements'::regclass) then alter table only public.announcements add constraint announcements_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='articles_slug_key' and conrelid='public.articles'::regclass) then alter table only public.articles add constraint articles_slug_key UNIQUE (slug); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='articles_pkey' and conrelid='public.articles'::regclass) then alter table only public.articles add constraint articles_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='badge_unlocks_pkey' and conrelid='public.badge_unlocks'::regclass) then alter table only public.badge_unlocks add constraint badge_unlocks_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='blocked_words_word_unique' and conrelid='public.blocked_words'::regclass) then alter table only public.blocked_words add constraint blocked_words_word_unique UNIQUE (word); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='blocked_words_pkey' and conrelid='public.blocked_words'::regclass) then alter table only public.blocked_words add constraint blocked_words_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='box_items_pkey' and conrelid='public.box_items'::regclass) then alter table only public.box_items add constraint box_items_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='chat_messages_pkey' and conrelid='public.chat_messages'::regclass) then alter table only public.chat_messages add constraint chat_messages_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='conversation_messages_pkey' and conrelid='public.conversation_messages'::regclass) then alter table only public.conversation_messages add constraint conversation_messages_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='conversations_pkey' and conrelid='public.conversations'::regclass) then alter table only public.conversations add constraint conversations_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='cracked_games_pkey' and conrelid='public.cracked_games'::regclass) then alter table only public.cracked_games add constraint cracked_games_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='daily_challenges_pkey' and conrelid='public.daily_challenges'::regclass) then alter table only public.daily_challenges add constraint daily_challenges_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='event_boxes_pkey' and conrelid='public.event_boxes'::regclass) then alter table only public.event_boxes add constraint event_boxes_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='featured_content_pkey' and conrelid='public.featured_content'::regclass) then alter table only public.featured_content add constraint featured_content_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='follows_follower_id_following_id_pk' and conrelid='public.follows'::regclass) then alter table only public.follows add constraint follows_follower_id_following_id_pk PRIMARY KEY (follower_id, following_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='game_rooms_room_code_unique' and conrelid='public.game_rooms'::regclass) then alter table only public.game_rooms add constraint game_rooms_room_code_unique UNIQUE (room_code); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='game_rooms_pkey' and conrelid='public.game_rooms'::regclass) then alter table only public.game_rooms add constraint game_rooms_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='hidden_cracked_games_pkey' and conrelid='public.hidden_cracked_games'::regclass) then alter table only public.hidden_cracked_games add constraint hidden_cracked_games_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='lfg_comments_pkey' and conrelid='public.lfg_comments'::regclass) then alter table only public.lfg_comments add constraint lfg_comments_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='lfg_queue_pkey' and conrelid='public.lfg_queue'::regclass) then alter table only public.lfg_queue add constraint lfg_queue_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='linked_accounts_pkey' and conrelid='public.linked_accounts'::regclass) then alter table only public.linked_accounts add constraint linked_accounts_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='mafia_action_logs_pkey' and conrelid='public.mafia_action_logs'::regclass) then alter table only public.mafia_action_logs add constraint mafia_action_logs_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='mafia_battle_logs_pkey' and conrelid='public.mafia_battle_logs'::regclass) then alter table only public.mafia_battle_logs add constraint mafia_battle_logs_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='mafia_businesses_pkey' and conrelid='public.mafia_businesses'::regclass) then alter table only public.mafia_businesses add constraint mafia_businesses_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='mafia_districts_pkey' and conrelid='public.mafia_districts'::regclass) then alter table only public.mafia_districts add constraint mafia_districts_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='mafia_feed_events_pkey' and conrelid='public.mafia_feed_events'::regclass) then alter table only public.mafia_feed_events add constraint mafia_feed_events_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='mafia_players_pkey' and conrelid='public.mafia_players'::regclass) then alter table only public.mafia_players add constraint mafia_players_pkey PRIMARY KEY (user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='mafia_plots_district_id_tile_col_tile_row_key' and conrelid='public.mafia_plots'::regclass) then alter table only public.mafia_plots add constraint mafia_plots_district_id_tile_col_tile_row_key UNIQUE (district_id, tile_col, tile_row); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='mafia_plots_pkey' and conrelid='public.mafia_plots'::regclass) then alter table only public.mafia_plots add constraint mafia_plots_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='moderation_queue_pkey' and conrelid='public.moderation_queue'::regclass) then alter table only public.moderation_queue add constraint moderation_queue_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pinned_content_pkey' and conrelid='public.pinned_content'::regclass) then alter table only public.pinned_content add constraint pinned_content_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='post_comments_pkey' and conrelid='public.post_comments'::regclass) then alter table only public.post_comments add constraint post_comments_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='post_likes_post_id_user_id_pk' and conrelid='public.post_likes'::regclass) then alter table only public.post_likes add constraint post_likes_post_id_user_id_pk PRIMARY KEY (post_id, user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='post_reactions_post_id_user_id_emoji_pk' and conrelid='public.post_reactions'::regclass) then alter table only public.post_reactions add constraint post_reactions_post_id_user_id_emoji_pk PRIMARY KEY (post_id, user_id, emoji); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='posts_pkey' and conrelid='public.posts'::regclass) then alter table only public.posts add constraint posts_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='push_subscriptions_pkey' and conrelid='public.push_subscriptions'::regclass) then alter table only public.push_subscriptions add constraint push_subscriptions_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='reports_pkey' and conrelid='public.reports'::regclass) then alter table only public.reports add constraint reports_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='room_chat_messages_pkey' and conrelid='public.room_chat_messages'::regclass) then alter table only public.room_chat_messages add constraint room_chat_messages_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='shop_items_pkey' and conrelid='public.shop_items'::regclass) then alter table only public.shop_items add constraint shop_items_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='user_challenge_progress_user_id_challenge_id_key' and conrelid='public.user_challenge_progress'::regclass) then alter table only public.user_challenge_progress add constraint user_challenge_progress_user_id_challenge_id_key UNIQUE (user_id, challenge_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='user_challenge_progress_pkey' and conrelid='public.user_challenge_progress'::regclass) then alter table only public.user_challenge_progress add constraint user_challenge_progress_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='user_equipped_user_id_category_pk' and conrelid='public.user_equipped'::regclass) then alter table only public.user_equipped add constraint user_equipped_user_id_category_pk PRIMARY KEY (user_id, category); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='user_inventory_pkey' and conrelid='public.user_inventory'::regclass) then alter table only public.user_inventory add constraint user_inventory_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='user_lobby_loadouts_user_id_game_slug_pk' and conrelid='public.user_lobby_loadouts'::regclass) then alter table only public.user_lobby_loadouts add constraint user_lobby_loadouts_user_id_game_slug_pk PRIMARY KEY (user_id, game_slug); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='user_mutes_pkey' and conrelid='public.user_mutes'::regclass) then alter table only public.user_mutes add constraint user_mutes_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='user_purchases_pkey' and conrelid='public.user_purchases'::regclass) then alter table only public.user_purchases add constraint user_purchases_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='wallet_transactions_pkey' and conrelid='public.wallet_transactions'::regclass) then alter table only public.wallet_transactions add constraint wallet_transactions_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='wallets_pkey' and conrelid='public.wallets'::regclass) then alter table only public.wallets add constraint wallets_pkey PRIMARY KEY (user_id); end if; end $$;

-- ── RPC signatures referenced by later migrations but defined by no migration ─
-- Stub bodies; the real implementations live in the database. Later migrations
-- only GRANT/REVOKE against these, so matching signatures suffice.
create or replace function public.admin_grant_currency(p_id uuid, p_text text, p_int integer, p_text2 text) returns void language plpgsql as $$ begin end $$;
create or replace function public.open_box(p_id uuid) returns void language plpgsql as $$ begin end $$;
create or replace function public.purchase_shop_item(p_id uuid) returns void language plpgsql as $$ begin end $$;
create or replace function public.rls_auto_enable() returns void language plpgsql as $$ begin end $$;
create or replace function public.claim_daily_bonus() returns void language plpgsql as $$ begin end $$;
-- award_xp / open_box_bundle ARE defined by later migrations, but those migrations
-- GRANT against them before their own CREATE runs (intra-file order); pre-declaring
-- with the live return types lets the grant resolve, then the real body replaces this.
create or replace function public.award_xp(p_user_id uuid, p_amount integer) returns integer language plpgsql as $$ begin return 0; end $$;
create or replace function public.open_box_bundle(p_box_id uuid, p_paid_opens integer, p_total_opens integer) returns jsonb language plpgsql as $$ begin return '{}'::jsonb; end $$;
-- private.is_admin() — RLS helper in the private schema, referenced by policies but
-- created by no migration (lives in the live DB).
create or replace function private.is_admin() returns boolean language sql stable as $$ select false $$;
create or replace function public.is_admin() returns boolean language sql stable as $$ select false $$;
create or replace function public.equip_item(p_id uuid) returns void language plpgsql as $$ begin end $$;
create or replace function public.unequip_category(p_cat text) returns void language plpgsql as $$ begin end $$;
create or replace function public.expire_old_lfg_posts() returns void language plpgsql as $$ begin end $$;
-- Trigger functions referenced by grants/attachments but defined by no migration.
create or replace function public.create_wallet_for_new_user() returns trigger language plpgsql as $$ begin return null; end $$;
create or replace function public.handle_new_user() returns trigger language plpgsql as $$ begin return null; end $$;
create or replace function public.lfg_response_to_comment() returns trigger language plpgsql as $$ begin return null; end $$;
create or replace function public.notify_lfg_response() returns trigger language plpgsql as $$ begin return null; end $$;
create or replace function public.update_last_seen_at() returns trigger language plpgsql as $$ begin return null; end $$;
-- toggle_post_like IS defined by a later migration, but that migration GRANTs on it
-- before its own CREATE (intra-file order); pre-declaring it with the live signature
-- lets the grant resolve, then the real body replaces this.
create or replace function public.toggle_post_like(p_post_id uuid, p_user_id uuid) returns boolean language plpgsql as $$ begin return false; end $$;
