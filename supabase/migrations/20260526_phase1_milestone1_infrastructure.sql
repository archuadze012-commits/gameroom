-- =============================================================
-- GAMEROOM Phase 1 — სრული Setup SQL
-- Supabase SQL Editor-ში გაუშვი მთლიანად
-- ცხრილები + trigger + columns + RLS policies
-- =============================================================

-- =============================================================
-- SECTION 0: Extensions
-- =============================================================
create extension if not exists "uuid-ossp";

-- =============================================================
-- SECTION 1: Enums
-- =============================================================
do $$ begin
  create type public.user_role as enum ('user','moderator','organizer','streamer','esports','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lfg_status as enum ('open','filled','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lfg_response_status as enum ('pending','accepted','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tournament_format as enum ('single_elim','double_elim','round_robin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tournament_status as enum ('draft','open','checkin','live','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.match_status as enum ('pending','ready','live','reported','confirmed','disputed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.article_status as enum ('draft','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum (
    'lfg_response','lfg_accepted','forum_reply','news_comment',
    'tournament_checkin','tournament_match','system'
  );
exception when duplicate_object then null; end $$;

-- =============================================================
-- SECTION 2: Core Tables
-- =============================================================

-- profiles
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  username             varchar(32) not null,
  display_name         varchar(64),
  avatar_url           text,
  bio                  text,
  region               varchar(32),
  voice_chat           boolean not null default false,
  available_hours      jsonb,
  role                 public.user_role not null default 'user',
  banned               boolean not null default false,
  ban_reason           text,
  banner_url           text,
  favorite_game_slugs  text[] default '{}',
  main_game_slug       varchar(64),
  youtube_handle       varchar(64),
  tiktok_handle        varchar(64),
  tiktok_followers     varchar(32),
  in_game_name         varchar(64),
  game_id              varchar(64),
  is_verified          boolean not null default false,
  emoji                varchar(8),
  xp                   integer not null default 0,
  level                integer not null default 1,
  last_xp_at           timestamptz,
  last_seen_at         timestamptz,
  last_login_award_at  date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username));

-- games
do $$
begin
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'games') then
    if not exists (select from information_schema.columns where table_name='games' and column_name='id') then
      alter table public.games drop constraint if exists games_pkey cascade;
      alter table public.games add column id uuid default gen_random_uuid();
      alter table public.games add primary key (id);
      alter table public.games add constraint games_slug_key unique (slug);
    end if;
  end if;
end $$;

create table if not exists public.games (
  id           uuid primary key default gen_random_uuid(),
  slug         varchar(64) not null unique,
  name_ka      varchar(128) not null,
  name_en      varchar(128) not null,
  description  text,
  icon_url     text,
  banner_url   text,
  accent_color varchar(16),
  emoji        varchar(8),
  active       boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

-- add missing columns if games table already existed
alter table public.games add column if not exists emoji varchar(8);
alter table public.games add column if not exists active boolean not null default true;
alter table public.games add column if not exists position integer not null default 0;

create index if not exists games_active_idx on public.games (active);

-- user_game_profiles
create table if not exists public.user_game_profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_id    uuid not null references public.games(id) on delete cascade,
  in_game_id varchar(64),
  rank       varchar(32),
  position   varchar(32),
  playstyle  varchar(32),
  created_at timestamptz not null default now(),
  unique (user_id, game_id)
);

-- lfg_posts
create table if not exists public.lfg_posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  title          varchar(200) not null,
  description    text,
  region         varchar(32),
  slots_total    integer not null default 4,
  slots_filled   integer not null default 0,
  voice_required boolean not null default false,
  status         public.lfg_status not null default 'open',
  expires_at     timestamptz,
  -- PostgREST / app-used columns
  game_slug      varchar(64),
  mode           varchar(64),
  rank           varchar(64),
  deleted_at     timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_lfg_posts_game_status_created
  on public.lfg_posts (game_slug, mode, created_at desc)
  where deleted_at is null;

create index if not exists idx_lfg_posts_author_id
  on public.lfg_posts (author_id);

-- lfg_responses
create table if not exists public.lfg_responses (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.lfg_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  message    text,
  status     public.lfg_response_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists lfg_response_post_idx on public.lfg_responses (post_id);

-- forum_categories
create table if not exists public.forum_categories (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid references public.games(id) on delete set null,
  name        varchar(128) not null,
  slug        varchar(64) not null unique,
  description text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- forum_threads
create table if not exists public.forum_threads (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.forum_categories(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  title         varchar(200) not null,
  slug          varchar(220) not null,
  pinned        boolean not null default false,
  locked        boolean not null default false,
  views         integer not null default 0,
  last_reply_at timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create unique index if not exists forum_thread_slug_cat_unique
  on public.forum_threads (category_id, slug);

create index if not exists forum_thread_category_idx
  on public.forum_threads (category_id, last_reply_at desc);

-- forum_posts
create table if not exists public.forum_posts (
  id             uuid primary key default gen_random_uuid(),
  thread_id      uuid not null references public.forum_threads(id) on delete cascade,
  author_id      uuid not null references public.profiles(id) on delete cascade,
  parent_post_id uuid,
  body           text not null,
  edited         boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists forum_post_thread_idx
  on public.forum_posts (thread_id, created_at);

-- forum_likes
create table if not exists public.forum_likes (
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

-- news_articles
create table if not exists public.news_articles (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles(id) on delete set null,
  game_id      uuid references public.games(id) on delete set null,
  title        varchar(200) not null,
  slug         varchar(220) not null unique,
  cover_url    text,
  excerpt      text,
  body         text not null,
  status       public.article_status not null default 'draft',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists news_published_idx
  on public.news_articles (status, published_at desc);

-- news_comments
create table if not exists public.news_comments (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.news_articles(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid,
  body       text not null,
  created_at timestamptz not null default now()
);

-- tournaments
create table if not exists public.tournaments (
  id                      uuid primary key default gen_random_uuid(),
  game_id                 uuid not null references public.games(id) on delete cascade,
  name                    varchar(200) not null,
  slug                    varchar(220) not null unique,
  description             text,
  banner_url              text,
  format                  public.tournament_format not null default 'single_elim',
  max_participants        integer not null default 8,
  prize_pool              text,
  rules                   text,
  registration_opens_at   timestamptz,
  registration_closes_at  timestamptz,
  checkin_opens_at        timestamptz,
  starts_at               timestamptz,
  status                  public.tournament_status not null default 'draft',
  created_by              uuid references public.profiles(id) on delete set null,
  winner_id               uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now()
);

create index if not exists tournament_game_status_idx
  on public.tournaments (game_id, status);

-- tournament_participants
create table if not exists public.tournament_participants (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  team_name     varchar(64),
  seed          integer,
  checked_in    boolean not null default false,
  eliminated_at timestamptz,
  registered_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create index if not exists tournament_participant_idx
  on public.tournament_participants (tournament_id);

-- tournament_matches
create table if not exists public.tournament_matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round         integer not null,
  position      integer not null,
  player1_id    uuid references public.profiles(id) on delete set null,
  player2_id    uuid references public.profiles(id) on delete set null,
  score1        integer,
  score2        integer,
  winner_id     uuid references public.profiles(id) on delete set null,
  next_match_id uuid,
  scheduled_at  timestamptz,
  status        public.match_status not null default 'pending',
  created_at    timestamptz not null default now(),
  unique (tournament_id, round, position)
);

-- notifications
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       public.notification_type not null,
  title      varchar(200) not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, read_at, created_at desc);

-- =============================================================
-- SECTION 3: Profile auto-create trigger
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_base text;
  v_username text;
  v_suffix int := 0;
begin
  v_base := lower(
    regexp_replace(
      split_part(coalesce(new.email, ''), '@', 1),
      '[^a-z0-9_]', '', 'g'
    )
  );
  if length(v_base) < 3 then
    v_base := 'user_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  v_base := substr(v_base, 1, 24);

  v_username := v_base;
  loop
    exit when not exists (
      select 1 from public.profiles where lower(username) = lower(v_username)
    );
    v_suffix := v_suffix + 1;
    v_username := v_base || v_suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, role, created_at, updated_at)
  values (
    new.id,
    v_username,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    'user',
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- =============================================================
-- SECTION 4: RLS Enable + Policies
-- =============================================================

-- profiles
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_all"   on public.profiles;
drop policy if exists "profiles_insert_own"   on public.profiles;
drop policy if exists "profiles_update_own"   on public.profiles;
drop policy if exists "profiles_admin_all"    on public.profiles;

create policy "profiles_select_all"  on public.profiles for select using (true);
create policy "profiles_insert_own"  on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own"  on public.profiles for update to authenticated using (id = (select auth.uid()));
create policy "profiles_admin_all"   on public.profiles for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role));

-- games
alter table public.games enable row level security;
drop policy if exists "games_select_all"   on public.games;
drop policy if exists "games_admin_write"  on public.games;
create policy "games_select_all"  on public.games for select using (true);
create policy "games_admin_write" on public.games for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin'::public.user_role,'moderator'::public.user_role)))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin'::public.user_role,'moderator'::public.user_role)));

-- lfg_posts
alter table public.lfg_posts enable row level security;
drop policy if exists "lfg_select_all"  on public.lfg_posts;
drop policy if exists "lfg_insert_own"  on public.lfg_posts;
drop policy if exists "lfg_update_own"  on public.lfg_posts;
drop policy if exists "lfg_delete_own"  on public.lfg_posts;
create policy "lfg_select_all"  on public.lfg_posts for select using (true);
create policy "lfg_insert_own"  on public.lfg_posts for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "lfg_update_own"  on public.lfg_posts for update to authenticated using ((select auth.uid()) = author_id or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin'::public.user_role,'moderator'::public.user_role)));
create policy "lfg_delete_own"  on public.lfg_posts for delete to authenticated using ((select auth.uid()) = author_id or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin'::public.user_role,'moderator'::public.user_role)));

-- lfg_responses
alter table public.lfg_responses enable row level security;
drop policy if exists "lfg_resp_select"  on public.lfg_responses;
drop policy if exists "lfg_resp_insert"  on public.lfg_responses;
drop policy if exists "lfg_resp_update"  on public.lfg_responses;
create policy "lfg_resp_select" on public.lfg_responses for select to authenticated
  using (user_id = (select auth.uid()) or exists (select 1 from public.lfg_posts lp where lp.id = post_id and lp.author_id = (select auth.uid())));
create policy "lfg_resp_insert" on public.lfg_responses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "lfg_resp_update" on public.lfg_responses for update to authenticated
  using (exists (select 1 from public.lfg_posts lp where lp.id = post_id and lp.author_id = (select auth.uid())) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role));

-- forum_categories
alter table public.forum_categories enable row level security;
drop policy if exists "forum_cat_select_all"   on public.forum_categories;
drop policy if exists "forum_cat_admin_write"  on public.forum_categories;
create policy "forum_cat_select_all"  on public.forum_categories for select using (true);
create policy "forum_cat_admin_write" on public.forum_categories for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role));

-- forum_threads
alter table public.forum_threads enable row level security;
drop policy if exists "forum_thread_select_all"   on public.forum_threads;
drop policy if exists "forum_thread_insert_auth"  on public.forum_threads;
drop policy if exists "forum_thread_update_own"   on public.forum_threads;
create policy "forum_thread_select_all"  on public.forum_threads for select using (true);
create policy "forum_thread_insert_auth" on public.forum_threads for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "forum_thread_update_own"  on public.forum_threads for update to authenticated
  using ((select auth.uid()) = author_id or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin'::public.user_role,'moderator'::public.user_role)));

-- forum_posts
alter table public.forum_posts enable row level security;
drop policy if exists "forum_post_select_all"   on public.forum_posts;
drop policy if exists "forum_post_insert_auth"  on public.forum_posts;
drop policy if exists "forum_post_update_own"   on public.forum_posts;
drop policy if exists "forum_post_delete_own"   on public.forum_posts;
create policy "forum_post_select_all"  on public.forum_posts for select using (true);
create policy "forum_post_insert_auth" on public.forum_posts for insert to authenticated
  with check ((select auth.uid()) = author_id and not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.banned = true));
create policy "forum_post_update_own"  on public.forum_posts for update to authenticated
  using ((select auth.uid()) = author_id or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin'::public.user_role,'moderator'::public.user_role)));
create policy "forum_post_delete_own"  on public.forum_posts for delete to authenticated
  using ((select auth.uid()) = author_id or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin'::public.user_role,'moderator'::public.user_role)));

-- forum_likes
alter table public.forum_likes enable row level security;
drop policy if exists "forum_likes_select_all"  on public.forum_likes;
drop policy if exists "forum_likes_insert_own"  on public.forum_likes;
drop policy if exists "forum_likes_delete_own"  on public.forum_likes;
create policy "forum_likes_select_all"  on public.forum_likes for select using (true);
create policy "forum_likes_insert_own"  on public.forum_likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "forum_likes_delete_own"  on public.forum_likes for delete to authenticated using ((select auth.uid()) = user_id);

-- news_articles
alter table public.news_articles enable row level security;
drop policy if exists "news_select_published"  on public.news_articles;
drop policy if exists "news_admin_all"         on public.news_articles;
create policy "news_select_published" on public.news_articles for select
  using (status = 'published'::public.article_status or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role));
create policy "news_admin_all" on public.news_articles for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role));

-- news_comments
alter table public.news_comments enable row level security;
drop policy if exists "news_comments_select_all"   on public.news_comments;
drop policy if exists "news_comments_insert_auth"  on public.news_comments;
create policy "news_comments_select_all"  on public.news_comments for select using (true);
create policy "news_comments_insert_auth" on public.news_comments for insert to authenticated with check ((select auth.uid()) = user_id);

-- tournaments
alter table public.tournaments enable row level security;
drop policy if exists "tournament_select_all"   on public.tournaments;
drop policy if exists "tournament_admin_write"  on public.tournaments;
create policy "tournament_select_all"  on public.tournaments for select using (true);
create policy "tournament_admin_write" on public.tournaments for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin'::public.user_role,'organizer'::public.user_role)))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin'::public.user_role,'organizer'::public.user_role)));

-- tournament_participants
alter table public.tournament_participants enable row level security;
drop policy if exists "tp_select_all"     on public.tournament_participants;
drop policy if exists "tp_insert_own"     on public.tournament_participants;
drop policy if exists "tp_update_checkin" on public.tournament_participants;
create policy "tp_select_all"  on public.tournament_participants for select using (true);
create policy "tp_insert_own"  on public.tournament_participants for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.tournaments t where t.id = tournament_id and t.status = 'open'::public.tournament_status));
create policy "tp_update_checkin" on public.tournament_participants for update to authenticated
  using ((select auth.uid()) = user_id or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin'::public.user_role,'organizer'::public.user_role)));

-- tournament_matches
alter table public.tournament_matches enable row level security;
drop policy if exists "tm_select_all"   on public.tournament_matches;
drop policy if exists "tm_admin_write"  on public.tournament_matches;
create policy "tm_select_all"  on public.tournament_matches for select using (true);
create policy "tm_admin_write" on public.tournament_matches for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin'::public.user_role,'organizer'::public.user_role)));

-- notifications
alter table public.notifications enable row level security;
drop policy if exists "notif_select_own"     on public.notifications;
drop policy if exists "notif_update_own"     on public.notifications;
drop policy if exists "notif_insert_service" on public.notifications;
create policy "notif_select_own"     on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy "notif_update_own"     on public.notifications for update to authenticated using ((select auth.uid()) = user_id);
create policy "notif_insert_service" on public.notifications for insert to authenticated with check (true);

-- =============================================================
-- SECTION 5: Storage bucket policies
-- (buckets-ი Dashboard-ში ხელით შექმენი: avatars + banners)
-- =============================================================

drop policy if exists "avatars_read_public"   on storage.objects;
drop policy if exists "avatars_upload_own"    on storage.objects;
drop policy if exists "avatars_update_own"    on storage.objects;
drop policy if exists "avatars_delete_own"    on storage.objects;
drop policy if exists "banners_read_public"   on storage.objects;
drop policy if exists "banners_upload_own"    on storage.objects;
drop policy if exists "banners_update_own"    on storage.objects;
drop policy if exists "banners_delete_own"    on storage.objects;

create policy "avatars_read_public"  on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_upload_own"   on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_update_own"   on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_delete_own"   on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "banners_read_public"  on storage.objects for select using (bucket_id = 'banners');
create policy "banners_upload_own"   on storage.objects for insert to authenticated with check (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "banners_update_own"   on storage.objects for update to authenticated using (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "banners_delete_own"   on storage.objects for delete to authenticated using (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =============================================================
-- DONE ✅
-- =============================================================
