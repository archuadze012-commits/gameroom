# Deployment

## სტეკი

- **Frontend + serverless:** Vercel
- **DB + Auth + Storage + Realtime:** Supabase
- **Git remote:** GitHub (`Betuchio/gameroom`)

## ცოცხალი გარემო

- Production: https://gamingweb-pi.vercel.app
- Vercel project: `gamingweb` (org: `bekas-projects-4494d35b`)

> **შენიშვნა:** Vercel-ის project-მა მიიღო ფოლდერის სახელი (`gamingweb`), არა `gameroom`. ფოლდერი დესკტოპზე ისევ `gamingweb`-ად დარჩა. URL/project name-ის შესაცვლელად: Vercel dashboard → Settings → General → Project Name.

## Environment Variables

| ცვლადი | სად | რას ნიშნავს |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Public anon key (client-side OK) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel მხოლოდ | server-only, admin operations-ისთვის |
| `DATABASE_URL` | Vercel + `.env.local` | `postgresql://...` Drizzle-ისთვის |

Vercel-ში ცვლადების დასაყენებლად:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add DATABASE_URL production
```

ან Dashboard → Project → Settings → Environment Variables.

## Supabase setup (პირველი ჯერი)

1. **შექმენი project** https://supabase.com/dashboard-ზე → "New project"
2. **DB-ის credentials** → Project Settings → Database → Connection string (URI mode) — ეს იქნება `DATABASE_URL`
3. **API keys** → Project Settings → API → URL + anon key + service_role key
4. **სქემის migration:**
   ```bash
   npm run db:generate   # ფაილის გენერაცია (src/db/migrations/)
   npm run db:push       # Supabase-ში წაგდება
   npm run db:seed       # თამაშები + ფორუმის კატეგორიები
   ```
5. **Auth providers** → Authentication → Providers:
   - **Email** — magic link (default ჩართულია)
   - **Google** — დაამატე Client ID + Secret (Google Cloud Console-ში OAuth credentials), redirect URL: `https://YOUR-SITE/auth/callback`
   - **Discord** — დაამატე Application ID + Secret (Discord Developer Portal), redirect URL იგივე
6. **Profile auto-create trigger** — Supabase SQL Editor-ში:
   ```sql
   create or replace function public.handle_new_user()
   returns trigger as $$
   begin
     insert into public.profiles (id, username)
     values (
       new.id,
       coalesce(
         new.raw_user_meta_data->>'preferred_username',
         split_part(new.email, '@', 1)
       )
     );
     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_auth_user_created
     after insert on auth.users
     for each row execute procedure public.handle_new_user();
   ```
7. **RLS policies** — იხ. [DATABASE.md § RLS](DATABASE.md#rls-policies)

## Vercel deploy

### ავტომატური (GitHub-ით)

1. Vercel Dashboard → Settings → Git → Connect Git Repository → აარჩიე `Betuchio/gameroom`
2. push-ი `master`-ზე → ავტომატური production deploy
3. PR-ის push → ავტომატური preview deploy

### მანუალური (CLI)

```bash
npm install -g vercel
vercel login
vercel link          # არსებულ project-თან მიბმა
vercel --prod        # production deploy
```

### Build settings

- **Framework Preset:** Next.js (auto-detected)
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install`
- **Node version:** 24.x

## Troubleshooting

### Deploy UNKNOWN-ზე ჩერდება

Vercel-ის queue ხანდახან ერთი project-ისთვის "გაიკეტება" და build runner-ი არ აიწევს deploy-ს. სიმპტომი:

- ყოველი ახალი deploy `UNKNOWN` status, `0ms` build duration
- `vercel inspect ... --logs` ცარიელია
- `vercel redeploy` ერორი: `This deployment can not be redeployed. Please try again from a fresh commit.`

**გადაჭრა:**

```bash
# 1. წაშალე broken project (deployments-იც ერთად წაიშლება)
vercel project rm <name>

# 2. ხელახლა link + deploy
rm -rf .vercel
vercel --prod
```

> ეს ქმნის ახალ Vercel project-ს. შედეგად URL შეიცვლება. გასათვალისწინებელია — GitHub integration ხელახლა უნდა მიებას dashboard-დან.

### Build წარმატებულია მაგრამ site ცარიელია

შეამოწმე:
- env ცვლადები Vercel-ში ნაცვალდა?
- `proxy.ts`-ის `matcher` ხომ არ ბლოკავს გვერდს?
- console-ში (browser DevTools) ხომ არ არის Supabase auth error

### Local dev მუშაობს, production-ი არა

ხშირად env ცვლადების სხვაობაა. დადასტურდი:

```bash
vercel env pull .env.production.local   # ჩამოწერე Vercel-ის ცვლადები
npm run build && npm run start          # ლოკალურად production-ად ცადე
```

## Rollback

```bash
vercel ls gameroom               # ნახე ისტორია
vercel rollback <deployment-url> # წინა Ready deploy-ზე გადასვლა
```

ან Dashboard → Deployments → ბოლო Ready → "Promote to Production".
