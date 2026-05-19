# Features

ფიჩერების კატალოგი — სტატუსით (✅ მზადაა, 🟡 UI-ი mock-ზე, ⚠️ TODO, 🔮 Phase 2+).

## Phase 1 — MVP

### Auth & პროფილი

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Email magic link sign-up/login | 🟡 UI | Supabase wiring მზადაა, form action TODO |
| Google OAuth | 🟡 UI | provider Supabase-ში უნდა ჩაირთოს |
| Discord OAuth | 🟡 UI | provider Supabase-ში უნდა ჩაირთოს |
| OAuth callback handler | ✅ | `/auth/callback` ცვლის code-ს session-ად |
| Logout | ✅ | `/auth/logout` server action |
| Profile auto-create | ⚠️ | Supabase trigger უნდა ჩაიყაროს (იხ. DEPLOYMENT.md) |
| Public profile გვერდი | 🟡 UI | `/profile/[username]` mock-ზე |
| Settings (own profile edit) | 🟡 UI | form action TODO |
| Avatar upload | ⚠️ | Supabase Storage bucket setup TODO |

### LFG (Looking For Group)

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| LFG list ფილტრებით (game, region, rank) | 🟡 UI | mock-data |
| ცოცხალი LFG preview homepage-ზე | 🟡 UI | mock-data |
| LFG შექმნა | 🟡 UI | form mock-ზე, server action TODO |
| LFG detail გვერდი | 🟡 UI | mock-data |
| Join request | 🟡 UI | mock-data, server action TODO |
| Author-ი ღებულობს/უარყოფს | ⚠️ | UI ჯერ არ არის |

### ფორუმი

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| კატეგორიების სია | 🟡 UI | mock + seed-ში ჩაიყრება |
| თემების სია | 🟡 UI | mock-data |
| თემის გვერდი (პოსტებით) | 🟡 UI | mock-data |
| ახალი თემის შექმნა | ⚠️ | UI placeholder |
| პოსტი (markdown) | ⚠️ | rich editor TODO (Tiptap?) |
| ლაიქი | ⚠️ | schema მზადაა |
| Threaded replies | ⚠️ | `parent_post_id` schema მზადაა, UI TODO |
| @-mention rendering | ✅ | `MentionText` component (`@` ვერ ჩანს, link-ი `/profile/[name]`-ზე) |

### სიახლეები

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Article list | 🟡 UI | mock-data |
| Article detail + comments | 🟡 UI | mock-data |
| Admin CRUD | 🟡 UI | scaffolding `/admin/news`-ში |
| Rich-text editor | ⚠️ | Tiptap ან MDX setup TODO |
| Comment threading | 🟡 UI | schema მზადაა |

### ჩემპიონატები

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Tournament list | 🟡 UI | mock-data |
| Tournament detail | 🟡 UI | mock-data |
| Single-elim bracket generator | ✅ | `src/lib/tournament/generate-bracket.ts` (power-of-2, byes) |
| Bracket renderer | ✅ | `src/components/tournament/bracket.tsx` (SVG) |
| რეგისტრაცია | ⚠️ | UI placeholder |
| Check-in | ⚠️ | UI placeholder |
| შედეგების შეტანა | ⚠️ | UI TODO (player1/player2 აცხადებენ, მეორე ადასტურებს) |
| Admin: tournament wizard | 🟡 UI | `/admin/tournaments` scaffolding |
| Double-elim bracket | 🔮 | Phase 2 |
| Round-robin | 🔮 | Phase 2 |

### ჩათი

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Channel switching | ✅ | client-side mock-ით |
| Working input + send | ✅ | local state, auto-scroll, unread badges |
| Mention parsing | ✅ | `MentionText` |
| Real-time messages | 🔮 | Phase 2 — Supabase Realtime |
| Per-game channels | 🔮 | schema მზადაა, UI Phase 2 |
| Direct messages | 🔮 | Phase 2 |

### თამაშების კატალოგი

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Games list (homepage + `/games`) | 🟡 UI | mock + seed-ში ჩაიყრება |
| Game detail (`/games/[slug]`) | 🟡 UI | mock-data |
| Admin CRUD | 🟡 UI | `/admin/games` scaffolding |

### Admin

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Admin layout | 🟡 UI | role guard ⚠️ TODO |
| Dashboard | 🟡 UI | mock metrics |
| News CRUD | 🟡 UI | mock |
| Games CRUD | 🟡 UI | mock |
| Tournaments CRUD | 🟡 UI | mock |
| Users management (ban) | 🟡 UI | mock |

### შეტყობინებები

| ფიჩი | სტატუსი | კომენტარი |
|---|---|---|
| Bell icon + dropdown header-ში | 🟡 UI | mock |
| In-app notifications schema | ✅ | `notifications` table |
| Trigger LFG response | ⚠️ | server action TODO |
| Email notifications | 🔮 | Phase 2 |
| Push notifications | 🔮 | Phase 2 (PWA) |

## Phase 2 — Growth (MVP-ის შემდეგ)

- რეალური real-time ჩათი (Supabase Realtime)
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

1. ყველა form-ი მიერთებულია real server action-თან (mock-data → Drizzle)
2. RLS policies ჩაყრილია (იხ. DATABASE.md)
3. Profile auto-create trigger მუშაობს
4. Admin role guard `profiles.role`-ის შემოწმებით
5. ერთი end-to-end flow მუშაობს ლოკალურად:
   - sign-up → profile შეიქმნა → LFG post → მეორე user-მა join request → author-მა accept → notification
6. ერთი ჩემპიონატის flow:
   - admin შექმნა → 8 user რეგისტრაცია → check-in → bracket გენერდება → match results → champion
