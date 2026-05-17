# Gameroom

ქართველი გეიმერების სათემო პლატფორმა — LFG მატჩმეიკინგი, ფორუმი, ჩათი, სიახლეები, ჩემპიონატები.

## ტექნოლოგიური სტეკი

- **Next.js 16** (App Router) + **TypeScript** + **Turbopack**
- **Tailwind CSS v4** + **shadcn/ui** (base-nova preset)
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
- **Drizzle ORM** — TypeScript-first schema
- **Inter + Noto Sans Georgian** ფონტები
- მუქი გეიმერული თემა (cyan + violet neon accent)

## Phase 1 — გაკეთებული

- ✅ Auth pages (Email magic link, Google OAuth, Discord OAuth)
- ✅ Landing page (hero, თამაშები, LFG, news, tournaments)
- ✅ LFG (list ფილტრებით, შექმნა, detail + join request)
- ✅ ფორუმი (categories, threads, posts, ლაიქი)
- ✅ სიახლეები (list, article + comments)
- ✅ ჩემპიონატები (list, detail, single-elim bracket renderer)
- ✅ ჩათი (Demo UI — real-time Phase 2-ში)
- ✅ თამაშების კატალოგი
- ✅ პროფილი (public + settings)
- ✅ Admin panel (dashboard, news, games, tournaments, users)
- ✅ Drizzle schema ყველა Phase 1 ცხრილით + seed script
- ✅ Supabase server/client/proxy auth-ის wiring

ფიჩერების უმეტესობას ჯერ მოქმედი backend არ აქვს — UI-ი render-დება mock data-ით
(`src/lib/mock-data.ts`). Supabase ჩართვის შემდეგ ფორმები მიეცემა server actions-ს.

## დაყენება

### 1. Supabase პროექტი
1. შექმენი ახალი პროექტი https://supabase.com-ზე
2. დააკოპირე `.env.local.example` → `.env.local` და შეავსე:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   DATABASE_URL=postgresql://...
   ```
3. Supabase Auth → Providers-ში ჩართე Google და Discord OAuth (callback URL: `https://YOUR-SITE/auth/callback`)

### 2. ბაზის სქემა
```bash
npm run db:generate   # მიგრაციების ფაილების გენერაცია
npm run db:push       # შემოპლების Supabase-ში
npm run db:seed       # თამაშები + ფორუმის კატეგორიების ჩაყრა
```

### 3. dev სერვერი
```bash
npm install
npm run dev
```

ბრაუზერში http://localhost:3000

## სტრუქტურა

```
src/
├── app/
│   ├── (root)                    # landing, /chat, etc.
│   ├── auth/                     # login, signup, callback, logout
│   ├── lfg/                      # LFG list/new/detail
│   ├── forum/[category]/[thread] # forum
│   ├── news/[slug]               # news
│   ├── tournaments/[slug]        # tournaments + brackets
│   ├── games/[slug]              # games catalog
│   ├── profile/[username]
│   ├── settings/
│   └── admin/                    # admin panel
├── components/
│   ├── ui/                       # shadcn primitives
│   ├── layout/                   # header, footer, nav
│   ├── tournament/bracket.tsx
│   └── page-header.tsx
├── db/
│   ├── schema.ts                 # Drizzle schema (Phase 1 ცხრილები)
│   ├── client.ts
│   └── seed.ts
├── lib/
│   ├── supabase/                 # server, client, middleware helpers
│   ├── tournament/generate-bracket.ts
│   ├── mock-data.ts              # initial UI data
│   ├── auth.ts
│   └── utils.ts
└── proxy.ts                      # Next.js 16 proxy (was middleware.ts)
```

## შემდეგი ნაბიჯები (Phase 1 დასასრულებლად)

1. Supabase-ის env ცვლადების შევსება + `db:push` + `db:seed`
2. Server actions-ის ჩაწერა (mock data → Drizzle queries):
   - `app/lfg/new/new-lfg-form.tsx`
   - `app/lfg/[id]/join-request-form.tsx`
   - `app/settings/settings-form.tsx`
   - `app/admin/news/...` CRUD
3. RLS policies Supabase-ში (user-მა მხოლოდ თავის LFG მართოს, ა.შ.)
4. Real auth gating `admin/layout.tsx`-ში (profiles.role === 'admin')

## Phase 2 (MVP-ის შემდეგ)

- რეალური real-time ჩათი (Supabase Realtime)
- გუნდები / კლანები
- Reputation / Trust Score
- Double-elim + round-robin ბრეკეტები
- Email + push notifications (PWA)
- Discord webhook ინტეგრაცია
- სტრიმინგი (Twitch/YouTube embed)
