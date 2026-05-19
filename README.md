# Gameroom

ქართველი გეიმერების სათემო პლატფორმა — LFG მატჩმეიკინგი, ფორუმი, ჩათი, სიახლეები და ჩემპიონატები.

🌐 **Live:** https://gamingweb-pi.vercel.app

## სტეკი

| ფენა | ტექნოლოგია |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| ენა | TypeScript 5 + React 19 |
| სტილი | Tailwind CSS v4 + shadcn/ui (base-nova preset) |
| ფონტი | Inter (Latin) + Noto Sans Georgian + JetBrains Mono |
| თემა | red/teal cyberpunk dark (oklch tokens) |
| DB | Supabase PostgreSQL |
| Auth | Supabase Auth (Email magic link, Google, Discord OAuth) |
| ORM | Drizzle ORM + postgres-js |
| ფორმები | react-hook-form + zod |
| Hosting | Vercel (frontend + serverless) |

## სწრაფი დაწყება

```bash
npm install
cp .env.local.example .env.local   # შეავსე Supabase credentials
npm run dev                         # http://localhost:3000
```

## Scripts

| ბრძანება | რას აკეთებს |
|---|---|
| `npm run dev` | dev სერვერი Turbopack-ით |
| `npm run build` | production build |
| `npm run start` | production preview |
| `npm run lint` | ESLint |
| `npm run db:generate` | Drizzle migrations-ის გენერაცია |
| `npm run db:push` | სქემის Supabase-ში წაგდება |
| `npm run db:studio` | Drizzle Studio (DB browser) |
| `npm run db:seed` | seed ღილაკები + ფორუმის კატეგორიები |

## დოკუმენტაცია

| ფაილი | აღწერა |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | სტრუქტურა, routes, data flow, auth |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Supabase production setup |
| [docs/DATABASE.md](docs/DATABASE.md) | Drizzle სქემა + RLS გეგმა |
| [docs/FEATURES.md](docs/FEATURES.md) | ფიჩერების სტატუსი (გაკეთებული + Phase 2) |

## Phase 1 — სტატუსი

- ✅ ყველა ფრონტ-ენდის გვერდი (12+ route) UI-ით mock data-ზე
- ✅ Auth pages (login / signup / OAuth callback / logout)
- ✅ Admin panel scaffolding (dashboard, news, games, tournaments, users)
- ✅ Drizzle სქემა Phase 1 ცხრილებით + seed
- ✅ Supabase server/client/proxy auth wiring
- ✅ Single-elim bracket generator
- ⚠️ ფორმები ჯერ server actions-თან მიბმული არ არის — UI mock data-ზე render-დება
- ⚠️ RLS policies Supabase-ში ჯერ არ არის ჩაყრილი
- ⚠️ რეალური ჩათი Phase 2-ში გადადის (Supabase Realtime)

დეტალები: [docs/FEATURES.md](docs/FEATURES.md)

## ლიცენზია

private (განვითარების ფაზაში)
