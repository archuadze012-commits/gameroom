# Features

ფიჩერების კატალოგი — სტატუსით (✅ მზადაა, 🟡 UI-ი mock-ზე, ⚠️ TODO, 🔮 Phase 2+).

## Phase 1 — MVP

### Auth & პროფილი

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Email magic link sign-up/login | ✅ | Supabase Auth + Server Actions |
| Google OAuth | ✅ | Supabase Auth + Google Provider |
| Discord OAuth | 🟡 UI | provider Supabase-ში უნდა ჩაირთოს |
| OAuth callback handler | ✅ | `/auth/callback` ცვლის code-ს session-ად |
| Logout | ✅ | `/auth/logout` route handler |
| Profile auto-create | ✅ | Supabase trigger (migrations-შია) |
| Public profile გვერდი | ✅ | `/profile/[username]` — რეალური მონაცემები |
| Settings (own profile edit) | ✅ | `/settings` — Server Actions |
| Avatar upload | ✅ | Supabase Storage + Image Cropping |
| Wallet & Currency | ✅ | NC და PRO ბალანსი, Daily bonus (RPC) |

### LFG (Looking For Group)

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| LFG list ფილტრებით (game, region, rank) | ✅ | რეალური მონაცემები + ფილტრაცია |
| ცოცხალი LFG preview homepage-ზე | ✅ | ავტომატური რეფრეში |
| LFG შექმნა (AI Assist-ით) | ✅ | OpenAI-ს დახმარებით დაპოსტვა |
| LFG detail გვერდი | ✅ | `/lfg/[id]` |
| Join request | ✅ | რეალური flow + ავტორის დასტური |
| LFG Comments | ✅ | Real-time კომენტარები |

### Social Feed (სიახლეების ზოლი)

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| პოსტების Feed | ✅ | `/feed` — პოსტები, სურათები, ვიდეოები |
| ფოლოვინგის სისტემა | ✅ | მომხმარებლების გამოწერა |
| ლაიქები და რეაქციები | ✅ | Custom emojis (gg, w, clutch...) |
| @-mention rendering | ✅ | `MentionText` component |

### სიახლეები

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Article list | ✅ | `/news` |
| Article detail + comments | ✅ | რეალური კომენტარები |
| Admin CRUD | ✅ | `/admin/news` |
| Comment threading | ✅ | schema + logic მზადაა |

### ჩემპიონატები

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Tournament list | ✅ | `/tournaments` |
| Tournament detail | ✅ | რეალური მონაცემები |
| Single-elim bracket generator | ✅ | `src/lib/tournament/generate-bracket.ts` |
| Bracket renderer | ✅ | `src/components/tournament/bracket.tsx` (SVG) |
| რეგისტრაცია | ✅ | რეალური მონაცემები |
| Check-in | ✅ | რეალური ლოგიკა |
| შედეგების შეტანა | 🟡 UI | UI TODO (player1/player2 აცხადებენ, მეორე ადასტურებს) |
| Admin: tournament wizard | ✅ | `/admin/tournaments` |

### ჩათი & მესენჯერი

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Messenger Bubble | ✅ | ყველგან ჩანს, real-time მესიჯები |
| Working input + send | ✅ | Real-time (Supabase Realtime) |
| Mention parsing | ✅ | `MentionText` |
| Direct messages | ✅ | `/messages/[id]` |
| Preview popup | ✅ | ახალი მესიჯის დროს ამოხტომა |

### თამაშების კატალოგი

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Games list (homepage + `/games`) | ✅ | რეალური მონაცემები |
| Game detail (`/games/[slug]`) | ✅ | `/games/[slug]` |
| Admin CRUD | ✅ | `/admin/games` |

### Admin

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Admin layout | ✅ | `/admin` — role guard მუშაობს |
| Dashboard | 🟡 UI | რეალური მეტრიკები TODO |
| Users management (ban) | ✅ | პროფილის დაბლოკვა |
| Grant Coins | ✅ | ადმინის მიერ NC/PRO-ს დარიცხვა |

### შეტყობინებები

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Bell icon + dropdown header-ში | ✅ | Real-time notifications |
| Push notifications | 🔮 | Phase 2 (PWA) |

## Phase 2 — Growth (MVP-ის შემდეგ)

- გუნდები / კლანები (შექმნა, რეკრუტინგი, გვერდი)
- Reputation / Trust Score (post-match rating)
- Double-elim + round-robin ბრეკეტები
- Email notifications (Resend ან Supabase)
- Push notifications (PWA + Web Push)
- Discord webhook ინტეგრაცია (ჩემპიონატის გამოცხადება Discord channel-ში)
- სტრიმინგი (Twitch/YouTube embed tournament detail-ში)
- კალენდარი (.ics export)
- Markdown editor (Tiptap) ფორუმისთვის

## Phase 3 — Monetization & Scale

- Premium ანგარიში (badges, ფერადი ნიქი, მეტი filter)
- Sponsored ჩემპიონატები (ჯილდოს ფონდი)
- ბანერ რეკლამა (game studios)
- Highlights / Clips (video upload + Cloudflare Stream)
- მობილური PWA + push
- ენების multi-support (next-intl — ინგლისური, რუსული)

## Phase 1-ის Definition of Done

1. ✅ ყველა form-ი მიერთებულია real server action-თან ან API-სთან
2. ✅ RLS policies ჩაყრილია
3. ✅ Profile auto-create trigger მუშაობს
4. ✅ Admin role guard `profiles.role`-ის შემოწმებით
5. ✅ ერთი end-to-end flow მუშაობს ლოკალურად
6. 🟡 ერთი ჩემპიონატის flow (შედეგების შეყვანა დასასრულებელია)
