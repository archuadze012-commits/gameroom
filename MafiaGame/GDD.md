# MAFIA — Game Design Document
## 90s Tbilisi Territory Control MMO

**ჟანრი:** Isometric 2D Territory Control Strategy MMO  
**სეთინგი:** 1990-იანი წლების თბილისი — პოსტ-საბჭოთა კრიმინალური სამყარო  
**პლატფორმა:** Browser + Mobile (Unity WebGL + iOS/Android)  
**ვიზუალი:** CRT monitor effect, წითელი/სპილენძისფერი/მუქი ოქრო palette  

---

## 1. CORE LOOP

```
შედი → აირჩიე უბანი → ააშენე შენობა → მიიღე შემოსავალი →
გააძლიერე კლანი → შეუტიე სხვა კლანს → მოიპოვე უბანი → repeat
```

**Session loop (5–15 წუთი):**
1. შეამოწმე პასიური შემოსავალი → ამოიღე ჯიხურებიდან
2. ააშენე/განაახლე ერთი შენობა
3. ჩაატარე 1–2 crime (Nerve ხარჯვა)
4. შეამოწმე კლანის notification-ები
5. ჩატი / სტრატეგიის განხილვა

---

## 2. WORLD STRUCTURE

### 2.1 მაკრო-რუკა — თბილისი

| უბანი | ზომა (Plot-ები) | სპეციფიური ბონუსი (კონტროლისთვის) |
|-------|----------------|--------------------------------------|
| ვაკე | 12 | კაზინო შემოსავალი +20%, VIP-ების მოზიდვა |
| საბურთალო | 16 | XP ბუსტი +15% მთელი კლანისთვის |
| ნაძალადევი | 20 | ფიზიკური ძალა +8%, Defence +5% |
| გლდანი | 18 | მაღაროს yield +25%, Construction cost −10% |
| ისანი | 14 | კონტრაბანდა +20%, Ship speed +15% |
| ავლაბარი | 10 | Crime success rate +10% |
| დიდუბე | 15 | Dirty money laundering speed +30% |
| სამგორი | 18 | ჯარიმის შემცირება −20%, Prison time −25% |
| ჩუღურეთი | 12 | Intel (Spy) accuracy +15% |
| ვარკეთილი | 22 | Mass recruitment bonus, Farm yield +20% |

**კონტროლის წესი:** კლანი, რომელსაც უბანში 51%+ Plot-ი ეკუთვნის, იღებს ამ უბნის ბონუსს.  
**Contested Zone:** 40–60% — ბონუსი გაყოფილია პრო-რატა.

### 2.2 მიკრო-რუკა — Isometric Grid

ყოველი უბნის მიკრო-რუკა:
- **Grid:** 20×20 hex tiles (alternating passable/buildable)
- **ქუჩები:** fixed, unbuilded, სეპარატორები
- **Plot-ები:** buildable tiles, ასე მოაქვს ბეჭედი კლანს
- **Landmark-ები:** ფიქსირებული, ვიზუალური (მტკვარი, მეტროს სადგური, ბაზარი)
- **Fog of War:** კლანის ვიზიბილობა = მათი შენობების რადიუსი

**Isometric Tile Types:**
```
[ქუჩა] — unclaimable, path for movement
[ცარიელი Plot] — claimable, buildable
[ნანგრევი] — reduced cost to claim, lower defense
[Sacred Ground] — ლანდმარკი, კლანისთვის +bonus
```

---

## 3. BUILDING SYSTEM

### 3.1 შენობების კატეგორიები

#### 🔧 ᲟESTIN' GARAGE (ჟesტis garaghe)
_"ეზოს გარაჟი თუჯის კარებით"_
- **ეფექტი:** Plot Defense +15, Reinforcement Speed +10%
- **Upgrade Tree:**
  - Lv1: Basic Garage — 500₾, 10min build
  - Lv2: Reinforced (+Barbed Wire) — 2,000₾, 1h
  - Lv3: Armed Checkpoint — 8,000₾, 4h — adds Attack Bonus to defenders
  - Lv4: Bunker — 25,000₾, 12h — immune to first raid wave
- **Destruction:** კლანს შეუძლია დაანგრიოს — 25% cost returns to attacker as loot

#### 🏪 JIKHURI (ჯიხური/კიოსკი)
_"ლითონის კიოსკი ნათელა-ნათელათი"_
- **ეფექტი:** Passive income 50–500₾/hr (by level)
- **Upgrade Tree:**
  - Lv1: კიოსკი — 300₾, 5min — 50₾/hr
  - Lv2: გამფართოებული — 1,500₾, 30min — 150₾/hr
  - Lv3: ბაზარი — 6,000₾, 2h — 350₾/hr + Dirty Money option
  - Lv4: შავი ბაზარი — 20,000₾, 8h — 500₾/hr + 5% crime chance bonus
- **Raid Loot:** მიმდინარე სეიფი (max 4h income) — lootable on raid

#### 🎰 CASINO (კაზინო)
_"სარდაფის კაზინო ხავერდის ფარდებით"_  
- **ეფექტი:** Dirty Money laundering, Rare item drops
- **Upgrade Tree:**
  - Lv1: Backroom — 5,000₾, 2h — launders 200 dirty₾/hr
  - Lv2: სპეც-ოთახი — 15,000₾, 6h — launders 500/hr + jackpot mechanic
  - Lv3: სრული კაზინო — 50,000₾, 24h — 1,200/hr + rare item daily draw
  - Lv4: VIP Club — 150,000₾, 48h — 3,000/hr + PvP intel gathering
- **Special:** Lv3+ triggers weekly Casino Tournament (PvE mini-game, prizes)

#### 🏘️ COOPERATIVE (კოოპერატივი)
_"ხრუშჩოვკის სარდაფის კოოპი"_
- **ეფექტი:** Gang XP boost, Member recruitment bonus
- **Upgrade Tree:**
  - Lv1: კოოპი — 2,000₾, 45min — XP +5% for all members
  - Lv2: Workshop — 7,000₾, 3h — XP +12%, unlock crafting
  - Lv3: Training Camp — 20,000₾, 10h — XP +20%, stat +2 to all
  - Lv4: Academy — 60,000₾, 36h — XP +30%, unlock special skills

#### 🏢 HEADQUARTERS (შtabi — ხrushchovka)
_"5-სართულიანი ხრუშჩოვკა ჩვენი ფლაგით"_
- **ეფექტი:** Influence radius, Gang member cap +5 per level
- **Max 1 per District per Gang**
- **Upgrade Tree:**
  - Lv1: Apartment Base — 10,000₾, 4h — radius 3 tiles, +5 members
  - Lv2: Secured Floor — 30,000₾, 12h — radius 5, +10 members, -20% enemy intel
  - Lv3: Fortified Block — 80,000₾, 24h — radius 8, +15 members, alert system
  - Lv4: Gang Citadel — 200,000₾, 72h — radius 12, +20 members, cannot be raided without prior intel

### 3.2 Building Synergies

| Combination | Bonus |
|-------------|-------|
| Garage + HQ adjacent | Defense +25 კომბო |
| Casino + Jikhuri same district | Income +15% |
| 3+ Cooperatives | Gang XP ×1.5 |
| Full district control (all plots) | "District Dominance" — double all bonuses |

---

## 4. COMBAT / TERRITORY CAPTURE

### 4.1 Capture Mechanics

**Phase 1 — Declaration of War (5 წუთი)**
- Attacking clan declares war on specific Plot
- Defending clan gets notification
- 5-min preparation window (both sides can reinforce)

**Phase 2 — Raid Wave System**

```
კომბატი = [Attack Power] vs [Defense Power]

Attack Power  = Σ(attacker stats) × Troop multiplier × District bonus
Defense Power = Σ(defender stats) × Building defense × Home territory +20%
```

**Wave Resolution (per 30 seconds):**
```csharp
float damage = AttackPower × Random.Range(0.8f, 1.2f);
float blocked = DefensePower × blockRate; // blockRate 0.3–0.7 by building level
float netDamage = damage - blocked;
plotHP -= netDamage;
if (plotHP <= 0) → Plot captured
```

**Plot HP by building:**
- Empty Plot: 100 HP
- Jikhuri Lv1: 300 HP
- Garage Lv4 (Bunker): 2,000 HP — first wave immune

### 4.2 Troop System

მოთამაშეები არ გადაადგილდებიან მიკრო-რუკაზე — **სტატისტიკა განსაზღვრავს ყველაფერს.**

| Troop Type | Unlock Level | Attack | Defense | Cost/hr |
|------------|-------------|--------|---------|--------|
| ქუჩელი (Street Kid) | 1 | 5 | 3 | 10₾ |
| კუთხელი (Corner Man) | 5 | 12 | 8 | 30₾ |
| ბოევიკი (Enforcer) | 10 | 25 | 15 | 75₾ |
| კვალიფიციური (Specialist) | 20 | 50 | 40 | 200₾ |
| ელიტა (Elite Guard) | 35 | 100 | 90 | 500₾ |

**Troop Cap:** `Base 10 + (5 × HQ level) + (2 × player level)`

### 4.3 Raid Outcomes

| Result | For Attacker | For Defender |
|--------|-------------|-------------|
| Victory | Plot ownership, loot Jikhuri safe | Loses plot, 50% building HP remains |
| Defeat | 30% troops lost, -Nerve | Plot stays, +5% defense buff (24h) |
| Stalemate (>5 waves) | Retreat, -20% troops | -30% building HP, no ownership change |

**Destruction:** attacker can choose to **raze** (destroy building entirely) instead of capture — gets 15% of build cost in scrap.

### 4.4 Anti-Zerg Mechanics

- **Fatigue System:** კლანი ვერ შეუტევს 3+ Plot-ს ერთდროულად
- **Cooldown:** ერთი Plot-ის კვლავ შეტევა — 2h cooldown
- **Defender Buff:** Plot-ის protection 4h after successful defense +50% defense
- **Alliance Cap:** კლანი არ შეიძლება ეკუთვნოდეს 2 alliance-ს

---

## 5. PLAYER PROGRESSION

### 5.1 Level System

```
XP to next level = 100 × level² × 1.15^(level-1)

Level 1→2:   100 XP
Level 5→6:   ~800 XP
Level 10→11: ~4,500 XP
Level 20→21: ~60,000 XP
Level 50→51: ~8,000,000 XP
```

**XP Sources:**
| Action | XP |
|--------|-----|
| Crime (success) | 5–50 |
| Combat (win) | 20–200 |
| Building construction | 10–500 |
| Daily login | 25 |
| District capture | 1,000+ |
| Gang war victory | 500/member |

### 5.2 Player Stats

**Base Stats (per level):**
```
Strength  = 10 + (level × 2) + equipment + district bonus
Defense   = 10 + (level × 1.5) + equipment + building bonus
Speed     = 10 + (level × 1) + vehicle bonus
```

**Consumables (regenerate over time):**
| Stat | Max | Regen | Used For |
|------|-----|-------|----------|
| HP | 10 + (level×2) | 5/10min | Combat survival |
| Energy | 10 + (level×2) | 3/10min | Map movement, building |
| Nerve | 5 + (level) | 1/15min | Crimes |
| Awake | 200 | 10/10min | Special actions |

### 5.3 Profession System (ამoირჩიე level 5-ზე)

| Profession | Bonuses | Playstyle |
|-----------|---------|----------|
| **ქურდი** (Thief) | Crime success +25%, Nerve regen ×1.5 | Solo PvE |
| **მებრძოლი** (Fighter) | Strength +20%, HP max +30% | PvP Combat |
| **ვაჭარი** (Trader) | Income +30%, Dirty money launder +40% | Economy |
| **ჯაშუში** (Spy) | Intel accuracy +35%, invisible on map | Strategy |
| **მშენებელი** (Builder) | Construction time −30%, cost −15% | Territory |
| **კლანის ლიდერი** (Boss) | Gang bonuses +15%, member cap +10 | Leadership |

**Respec Cost:** 500 crystals (premium currency)

### 5.4 Skill Tree (unlock by level milestones)

```
Level 1  ──┬── [ქუჩის ბიჭი] Basic Crime +5%
            └── [ნდობა] Troop loyalty +10%

Level 10 ──┬── [ბანდის ლოიალობა] Gang XP +10%
            └── [ქუჩის ჭკუა] Crime variety unlock

Level 20 ──┬── [კვარტლის ბოსი] District bonus +10%  
            └── [კავშირები] Black market access

Level 35 ──┬── [ლეგენდა] All stats +5%
            └── [ამნესტია] Jail time reduction −50%

Level 50 ── [ავტორიტეტი] — Prestige unlock (reset with permanent bonus)
```

---

## 6. ECONOMY MODEL

### 6.1 Currency System

| Currency | სახელი | მოპოვება | გამოყენება |
|----------|--------|----------|----------|
| ₾ (Clean Money) | ლარი | Jikhuri, salary, missions | Buildings, troops, shops |
| 💀 (Dirty Money) | ბინძური | Crimes, raids, smuggling | Black market, launder→₾ |
| 💎 (Crystals) | ქვები | Premium purchase, rare drops | Speed-ups, VIP, cosmetics |

**Dirty Money Laundering:**
```
Casino Lv1: 200 dirty₾/hr → 160 clean₾/hr (80% rate)
Casino Lv4: 3000 dirty₾/hr → 2700 clean₾/hr (90% rate)
Black Market Building: instant launder, 70% rate
```

### 6.2 Sink/Source Balance

**Money Sources:**
- Passive buildings (Jikhuri): primary source
- Crimes: medium amounts, nerve-limited
- Combat looting: variable
- Daily missions: guaranteed floor
- Gang war rewards: large, infrequent

**Money Sinks:**
- Building construction & upgrades
- Troop hiring & maintenance
- Healing HP
- Refilling stats (energy, nerve via crystals)
- Black market items
- VIP subscription

### 6.3 Inflation Controls
- Troop maintenance cost scales with district size
- Building upkeep (small % of income drained daily)
- Raid destruction permanently removes wealth
- Prison penalties: fine + income pause

---

## 7. MONETIZATION

**Philosophy:** Pay-for-convenience, NOT pay-for-power. Premium players გამოირჩევიან სტილით, არა stat-ებით.

### 7.1 VIP Subscription (₾/month tiers)

| Tier | Price | Benefits |
|------|-------|----------|
| VIP I | $3/mo | Stat regen ×1.2, 10 crystals/day, VIP badge |
| VIP II | $7/mo | Regen ×1.4, 25 crystals/day, private chat rooms, priority support |
| VIP III | $15/mo | Regen ×1.6, 60 crystals/day, exclusive avatar frames, weekly chest |

### 7.2 Crystal Purchases

| Pack | Price | Crystals | Bonus |
|------|-------|---------|-------|
| Starter | $1.99 | 50 | — |
| Popular | $4.99 | 150 | +30 bonus |
| Value | $9.99 | 350 | +100 bonus |
| Big Boss | $19.99 | 800 | +250 bonus |
| Avtoriteti | $49.99 | 2,500 | +1,000 bonus |

**Crystal Spends:**
- Speed-up construction: 1 crystal/minute
- Full stat refill: 10 crystals
- Respec profession: 500 crystals
- Cosmetic items: 50–300 crystals
- Extra building slot: 200 crystals (one-time, max 3)

### 7.3 Battle Pass (Monthly "Saqme")

- Free track: basic rewards
- Paid ($4.99): exclusive 90s Tbilisi cosmetics, avatar skins, gang emblems
- 30 tiers, completable in ~2 weeks casual play

### 7.4 Anti-P2W Safeguards

- Crystal-purchased speed-ups: max 4x faster than free (not instant)
- No crystal-purchased stat boosts
- No crystal-purchased troops
- All game-winning mechanics available free (just slower)
- Max crystal advantage in combat: ~10% (not decisive)

---

## 8. CRIME SYSTEM

| Crime | Nerve Cost | Success Chance | Reward | Unlock Level |
|-------|-----------|---------------|--------|-------------|
| ჯიბის გაჭრა | 1 | 75% | 50–200₾ | 1 |
| მაღაზიის ძარცვა | 2 | 60% | 200–800₾ | 3 |
| მანქანის გატაცება | 3 | 50% | 500–2,000₾ + dirty | 5 |
| საბანკო ყაჩაღობა | 5 | 35% | 2,000–10,000₾ | 10 |
| კონტრაბანდა | 4 | 45% | 1,000–5,000 dirty₾ | 8 |
| პოლიტიკოსის შანტაჟი | 6 | 30% | 5,000–20,000₾ | 15 |
| Casino ქურდობა | 8 | 25% | 10,000–50,000₾ | 25 |

---

## 9. GANG SYSTEM

### 9.1 Gang Structure

```
ბოსი (Boss)
├── ვიცე-ბოსი (Vice Boss) ×2
│   ├── კაპო (Capo) ×3
│   │   └── სოლდატი (Soldier) ×∞
│   └── კონსილიერი (Consiglieri) ×1
└── ასოციეტი (Associate) — probationary
```

**Gang Size Cap:** 10 + (5 × average HQ level) + (2 × gang level)

### 9.2 Gang War Declaration

1. Gang A ირჩევს target district
2. **War Declaration** — 2h prep time
3. **War Window** — 4h active combat
4. **Ceasefire** — 20h cooldown
5. **Rewards:** winning gang gets 24h ownership bonus, XP, loot pool

### 9.3 Gang Progression

- Lv5: Gang Forum
- Lv10: Gang Bank (shared treasury)
- Lv15: Alliance System
- Lv20: Gang Perks tree
- Lv30: Legendary Gang status

---

## 10. VISUAL/AUDIO DESIGN

### 10.1 Color Palette

```
Primary:   #1A0A00 (Almost Black)
Secondary: #8B3A00 (Burnt Orange)  
Accent 1:  #C0392B (Soviet Red)
Accent 2:  #B8860B (Dark Gold/Copper)
Highlight: #FFE1CB (Warm cream)
```

### 10.2 CRT Effect Stack
- Scanlines overlay (15% opacity)
- Chromatic aberration (0.5px)
- Screen curvature vignette
- Phosphor glow on bright elements
- Occasional static flash on notifications

### 10.3 Audio Design

**Ambient:** dogs barking, Soviet trolleybus, Georgian folk radio, rain on tin rooftops  
**UI:** metal clang (build), air-raid siren (raid), cash register (crime success), accordion chord (level up)

---

## 11. TECHNICAL ARCHITECTURE

| Layer | Technology |
|-------|-----------|
| Client | Unity 2022 LTS (WebGL + iOS/Android) |
| Backend | Laravel 11 (PHP) |
| Realtime | Laravel Reverb (WebSocket) |
| Database | PostgreSQL + Redis |
| CDN/Assets | Cloudflare R2 |
| Auth | Laravel Sanctum |

### Realtime Channels

```
district.{id}  → building.built/destroyed, plot.captured, war.declared
gang.{id}      → message, member events, war results  
global         → announcements, leaderboard changes
```

---

## 12. CONTENT ROADMAP

| Phase | Content |
|-------|---------|
| MVP | 3 districts, 5 building types, 5 crimes, basic gang, chat |
| Month 2 | All 10 districts, Casino mini-game, Battle Pass v1 |
| Month 3 | Alliance System, Spy mechanic, Mobile launch |
| Month 6 | Prestige System, second city (ქუთაისი), PvE story missions |
