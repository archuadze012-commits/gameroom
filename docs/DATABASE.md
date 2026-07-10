# Database

Drizzle ORM + Supabase PostgreSQL. სქემა — `src/db/schema.ts`.

## Tables

### პროფილები & თამაშები

| Table | მთავარი ველები | აღწერა |
|---|---|---|
| `auth.users` | `id` | Supabase Auth-ის built-in (read-only) |
| `profiles` | `id` (FK→auth.users), `username` (unique, lower), `display_name`, `avatar_url`, `bio`, `region`, `voice_chat`, `available_hours` (jsonb), `role` (user\|moderator\|admin), `banned` | მომხმარებლის public პროფილი |
| `games` | `slug` (unique), `name_ka`, `name_en`, `icon_url`, `banner_url`, `accent_color`, `active`, `position` | თამაშების კატალოგი (admin-მართვადი) |
| `user_game_profiles` | `user_id`, `game_id`, `in_game_id`, `rank`, `position`, `playstyle` | per-game პროფილი |

### LFG

| Table | მთავარი ველები | აღწერა |
|---|---|---|
| `lfg_posts` | `author_id`, `game_id`, `title`, `description`, `rank_min`, `rank_max`, `region`, `slots_total`, `slots_filled`, `voice_required`, `status` (open\|filled\|closed), `expires_at` | "ვეძებ გუნდს" პოსტი |
| `lfg_responses` | `post_id`, `user_id`, `message`, `status` (pending\|accepted\|rejected) | join request-ი |

### სიახლეები

| Table | მთავარი ველები | აღწერა |
|---|---|---|
| `news_articles` | `author_id`, `game_id` (nullable), `title`, `slug` (unique), `cover_url`, `excerpt`, `body` (markdown), `status` (draft\|published\|archived), `published_at` | admin-მართვადი blog |
| `news_comments` | `article_id`, `user_id`, `parent_id` (nullable for replies), `body` | კომენტარები |

### ჩემპიონატები

| Table | მთავარი ველები | აღწერა |
|---|---|---|
| `tournaments` | `game_id`, `name`, `slug` (unique), `format` (single_elim\|double_elim\|round_robin), `max_participants`, `prize_pool`, `rules`, `registration_opens_at`, `registration_closes_at`, `checkin_opens_at`, `starts_at`, `status` (draft\|open\|checkin\|live\|completed\|cancelled), `winner_id` | ჩემპიონატი |
| `tournament_participants` | `tournament_id`, `user_id`, `team_name`, `seed`, `checked_in`, `eliminated_at` | რეგისტრაცია |
| `tournament_matches` | `tournament_id`, `round`, `position`, `player1_id`, `player2_id`, `score1`, `score2`, `winner_id`, `next_match_id`, `status` (pending\|ready\|live\|reported\|confirmed\|disputed) | bracket-ის თითო მატჩი |

### ჩათი

| Table | მთავარი ველები | აღწერა |
|---|---|---|
| `chat_channels` | `type` (global\|game\|lfg\|tournament\|direct), `reference_id`, `name`, `description` | არხები |
| `chat_messages` | `channel_id`, `user_id`, `body` | მესიჯები (Phase 2: Realtime) |

### შეტყობინებები

| Table | მთავარი ველები | აღწერა |
|---|---|---|
| `notifications` | `user_id`, `type` (lfg_response\|lfg_accepted\|news_comment\|tournament_checkin\|tournament_match\|system), `title`, `body`, `link`, `read_at` | in-app notifications |

## Enums

| Enum | მნიშვნელობები |
|---|---|
| `user_role` | user, moderator, admin |
| `lfg_status` | open, filled, closed |
| `lfg_response_status` | pending, accepted, rejected |
| `tournament_format` | single_elim, double_elim, round_robin |
| `tournament_status` | draft, open, checkin, live, completed, cancelled |
| `match_status` | pending, ready, live, reported, confirmed, disputed |
| `article_status` | draft, published, archived |
| `chat_channel_type` | global, game, lfg, tournament, direct |
| `notification_type` | lfg_response, lfg_accepted, news_comment, tournament_checkin, tournament_match, system |

## Indexes

Hot paths:

- `profiles.username` — `unique(lower(username))` case-insensitive lookup
- `lfg_posts(status, created_at)` — list page-ის queue
- `lfg_posts(game_id)` — per-game ფილტრი
- `news_articles(status, published_at)` — public list
- `tournaments(game_id, status)` — per-game filter
- `tournament_matches(tournament_id, round, position)` — bracket lookup
- `chat_messages(channel_id, created_at)` — channel timeline
- `notifications(user_id, read_at, created_at)` — bell unread count

## Migrations

```bash
# შეცვალე src/db/schema.ts
npm run db:generate        # ქმნის src/db/migrations/<timestamp>_*.sql
npm run db:push            # apply Supabase-ში (dev)

# Studio-ში ნახვა
npm run db:studio          # localhost:4983
```

> **Production:** `db:push`-ის ნაცვლად ხელით apply-ე migrations Supabase SQL Editor-ში, რომ schema-ის ცვლილებები version control-ში წინ ვიდოდეს. Production-ში drift არ უნდა მოხდეს.

## Seed

`src/db/seed.ts` ჩაყრის:

- **5 თამაში** (eFootball Mobile, FIFA Mobile, PUBG, Warzone, Valorant) + accent ფერი

გაშვება:

```bash
npm run db:seed
```

`profiles`-ში მომხმარებლები არ იყრება — ისინი Supabase Auth-ის trigger-ით ავტომატურად შეიქმნება ფირველი sign-up-ის შემდეგ.

## RLS Policies

> ⚠️ **TODO Phase 1:** ეს policies ჯერ Supabase-ში არ არის ჩაყრილი. ქვემოთ — გასაშვები plan.

ძირითადი წესი: **user-მა მართოს მხოლოდ თავის row-ები. admin-მა — ნებისმიერი. read — public published content-ისთვის ღია.**

### profiles
```sql
alter table profiles enable row level security;

create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_self" on profiles for update using (auth.uid() = id);
create policy "profiles_admin_all" on profiles for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
```

### lfg_posts
```sql
alter table lfg_posts enable row level security;

create policy "lfg_select_all" on lfg_posts for select using (true);
create policy "lfg_insert_own" on lfg_posts for insert with check (auth.uid() = author_id);
create policy "lfg_update_own" on lfg_posts for update using (auth.uid() = author_id);
create policy "lfg_delete_own" on lfg_posts for delete using (auth.uid() = author_id);
```

### news_articles
- `select` — `status = 'published'` ან admin
- `insert` / `update` / `delete` — მხოლოდ admin

### tournaments
- `select` — ღია
- `insert` / `update` — მხოლოდ admin
- `participants insert` — `auth.uid() = user_id` + tournament status = 'open'

### chat_messages
- `select` — ღია (Phase 2-ში per-channel restriction)
- `insert` — `auth.uid() = user_id` + `not banned`
- `delete` — owner ან moderator

### notifications
- `select` — `auth.uid() = user_id` (მხოლოდ თავისი)
- `update` — `auth.uid() = user_id` (read_at-ის დაყენება)

## Drizzle ↔ Supabase

`db/client.ts`-ში:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
```

`prepare: false` — Supabase pooler (PgBouncer) prepared statements-ს არ უჭერს მხარს. ეს მნიშვნელოვანია, თუ `DATABASE_URL`-ი pooler endpoint-ია (port 6543), არა direct (port 5432).
