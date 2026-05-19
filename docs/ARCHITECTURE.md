# Architecture

## ფაილური სტრუქტურა

```
src/
├── app/                            # Next.js 16 App Router
│   ├── page.tsx                    # / — landing (hero, games, LFG preview, news, tournaments)
│   ├── layout.tsx                  # root layout (dark mode forced, fonts, header/footer)
│   ├── globals.css                 # Tailwind v4 + theme tokens (oklch)
│   ├── not-found.tsx               # 404
│   │
│   ├── auth/
│   │   ├── login/                  # /auth/login
│   │   ├── signup/                 # /auth/signup
│   │   ├── callback/               # /auth/callback — OAuth redirect target
│   │   └── logout/                 # /auth/logout — server action redirect
│   │
│   ├── lfg/
│   │   ├── page.tsx                # /lfg — list + ფილტრები
│   │   ├── new/                    # /lfg/new — შექმნა
│   │   └── [id]/                   # /lfg/:id — detail + join
│   │
│   ├── forum/
│   │   ├── page.tsx                # /forum — categories
│   │   └── [category]/
│   │       ├── page.tsx            # /forum/:category — threads
│   │       └── [thread]/           # /forum/:category/:thread — posts
│   │
│   ├── news/
│   │   ├── page.tsx                # /news — list
│   │   └── [slug]/                 # /news/:slug — article + comments
│   │
│   ├── tournaments/
│   │   ├── page.tsx                # /tournaments — list
│   │   └── [slug]/                 # /tournaments/:slug — info + bracket
│   │
│   ├── games/
│   │   ├── page.tsx                # /games — catalog
│   │   └── [slug]/                 # /games/:slug — game detail
│   │
│   ├── chat/                       # /chat — demo (channel switch, working input)
│   ├── profile/[username]/         # /profile/:username — public profile
│   ├── settings/                   # /settings — own profile edit
│   │
│   └── admin/                      # role-gated (TODO: gate via profiles.role)
│       ├── page.tsx                # /admin — dashboard
│       ├── news/
│       ├── games/
│       ├── tournaments/
│       └── users/
│
├── components/
│   ├── ui/                         # shadcn primitives (button, card, badge, ...)
│   ├── layout/
│   │   ├── site-header.tsx         # header + nav (server)
│   │   ├── site-footer.tsx
│   │   ├── mobile-nav.tsx          # client (sheet)
│   │   ├── user-menu.tsx           # server (reads session)
│   │   └── nav-links.ts            # shared link list (no "use client" needed)
│   ├── tournament/bracket.tsx      # SVG bracket renderer
│   ├── mention-text.tsx            # @-mention parser (chat/forum)
│   └── page-header.tsx
│
├── db/
│   ├── schema.ts                   # Drizzle table definitions (იხ. DATABASE.md)
│   ├── client.ts                   # postgres-js client + drizzle instance
│   └── seed.ts                     # tsx-მართული seed (games, forum categories)
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts               # createServerClient (server-only)
│   │   ├── client.ts               # createBrowserClient
│   │   └── middleware.ts           # auth refresh helper used by proxy.ts
│   ├── tournament/
│   │   └── generate-bracket.ts     # single-elim seeding (power-of-2 + byes)
│   ├── mock-data.ts                # MVP UI data (გაქრება server actions-ის შემდეგ)
│   ├── auth.ts                     # session helpers
│   └── utils.ts                    # cn(), date formatters
│
└── proxy.ts                        # Next.js 16 proxy (ყოფილი middleware.ts) — auth session refresh
```

## Routing model

ყველა route — App Router-ში, file-based. Server Component default-ად. Client component-ი
სადაც სჭირდება interactivity (`"use client"`).

| Route | Component type | მონაცემები |
|---|---|---|
| `/` | Server | mock-data |
| `/lfg`, `/forum`, `/news`, `/tournaments`, `/games` | Server | mock-data |
| `/lfg/new`, `/settings` | Server + Client form | mock-data → TODO server action |
| `/chat` | Client (state) | mock-data (Phase 2: Supabase Realtime) |
| `/admin/*` | Server | mock-data → TODO role guard + Drizzle queries |

## Auth flow

1. **User-მა შესვლა დააჭიროს** → `/auth/login` form (Email magic link, ან Google/Discord OAuth)
2. **OAuth redirect** → Supabase-ი დაარედირექტებს `/auth/callback`-ზე code parameter-ით
3. **Callback handler** → ცვლის code-ს session-ად, ქმნის cookie-ს, ვინ რიდირექტდება `/`-ზე
4. **Profile auto-creation** → Supabase trigger `on auth.users insert` ქმნის `public.profiles` row-ს (TODO: trigger script docs/DATABASE.md-ში)
5. **Session refresh** → ყოველი request-ის ფარგლებში `src/proxy.ts` (Next.js 16 ექვივალენტი ყოფილი `middleware.ts`-ის) ეძახის `lib/supabase/middleware.ts`-ის `updateSession()`-ს რომელიც ცვლის expired access token-ს
6. **Server components** → კითხულობენ user-ს `createServerClient()` arrow-დან
7. **Logout** → `/auth/logout` რექვესთი ეძახის `supabase.auth.signOut()`-ს და რედირექტდება `/`-ზე

## Theme

Tailwind v4-ის `@theme inline` სინტაქსი. Token-ები `oklch` სივრცეში:

- **Background:** dark purple (`oklch(0.18 0.03 280)`)
- **Card:** dark teal
- **Foreground:** cyan-tinted
- **Primary:** red (`oklch(0.6280 0.2577 29.2339)`)
- **Accent:** teal/cyan
- **Border:** subtle teal-tinted

`<html>` ყოველთვის `class="dark"`-ში (`layout.tsx`-ში hardcoded). light mode არ არსებობს.

## Mock data → real data გადასვლა (TODO)

ფიჩერების უმეტესობა იყენებს `src/lib/mock-data.ts`-ის ექსპორტებს (`mockGames`, `mockLfgPosts`, `mockNews`, `mockTournaments`, `mockForumCategories`, `mockChatChannels`).

Phase 1-ის დასასრულებლად:

1. შესაბამისი page.tsx-ში `const games = await db.select().from(games)`-ი ჩასვა (server component → async)
2. Form-ის submission server action-ად გადაიქცეს (`use server`)
3. mock-data export-ი წაიშალოს როცა გვერდი migrated-ია
4. RLS policies Supabase-ში ჩაიყაროს (იხ. [DATABASE.md](DATABASE.md))

## Key დიზაინული გადაწყვეტილებები

- **App Router only** — Pages Router არ გამოიყენება
- **Server Components by default** — interactivity-ის შემთხვევაში მინიმალური client island
- **`asChild` pattern** — Button-ი `@radix-ui/react-slot`-ით (base-ui-ში native support არ არსებობს)
- **base-ui render prop** — DropdownMenuItem, SheetTrigger იყენებენ `render={<Link/>}` ჩამოწერას
- **No `middleware.ts`** — Next.js 16 დეპრიკეიტმა, გადავიდა `src/proxy.ts`-ში
- **მხოლოდ ქართული UI** — i18n setup არ არის Phase 1-ში (Phase 3-ში დაემატება next-intl)
- **Mention parsing** — `@username` regex → მონიშნული link (`@`-ის გარეშე) styled mention chip-ად
