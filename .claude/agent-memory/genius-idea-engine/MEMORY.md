# Memory Index — გოდერძაი (PlayManager design)

- [PlayManager OVERHAUL session](project_playmanager_overhaul_session.md) — ⭐ MASTER OVERVIEW of the 2026-06-27 mega-overhaul (~20 features) + architecture + git/DB/deploy state (DB=remote Supabase, code pushed to origin/master, commit d46fb177) + pending. START HERE.
- [PlayManager Match v2 vision](project_playmanager_match_v2_vision.md) — agreed roadmap: tactics, talent classes 1–12, traits, behavioral, formation/position-fit, auto-subs, 100k stadium
- [PlayManager real economy](project_playmanager_real_economy.md) — real-players-only overhaul context
- [PlayManager talent classes](project_playmanager_talent_classes.md) — 6 named tiers over talent 1-12; class ageOffset shifts decay thresholds; talent.ts ↔ DB synced
- [PlayManager TAC attribute](project_playmanager_tac_attribute.md) — 7th "tactical IQ" stat; APPLIED (20260628)
- [PlayManager pending migrations](project_playmanager_pending_migrations.md) — all migrations through 20260709 APPLIED to remote DB; none pending

## 2026-06-27 mega-overhaul features (each detailed file)
- [position-fit](project_playmanager_position_fit.md) — out-of-position penalty ×0.5–1.0 (20260630)
- [auto-subs](project_playmanager_auto_subs.md) — pre-match auto-sub of injured starters (20260701)
- [traits](project_playmanager_traits.md) — 8 behavioural specialisms + admin editor (20260702)
- [stadium](project_playmanager_stadium.md) — 100k via arena facility level (20260703)
- [office/scouting](project_playmanager_office_scouting.md) — squad deficit report module
- [match player events](project_playmanager_match_player_events.md) — goalscorers + ratings (20260704)
- [behavioral](project_playmanager_behavioral.md) — 6 behavioural attrs (20260705)
- [skill/weak-foot](project_playmanager_skill_weakfoot.md) — EA stars 1-5 (20260706)
- [psych + formation](project_playmanager_psych_formation.md) — pressure morale + slot persistence (20260707)
- [form-feed + scout](project_playmanager_formfeed_scout.md) — ratings→morale; scout-gated reveal
- [academy](project_playmanager_academy.md) — youth development over time
- [contracts](project_playmanager_contracts.md) — SUPERSEDED by career-end
- [career-end](project_playmanager_career_end.md) — age-based (32-42), renew ½ / release ⅓; free-agent class/division gating (20260708)
- [fitness](project_playmanager_fitness.md) — medical risk module
- [daily reward](project_playmanager_daily_reward.md) — activity streak
- [free agents](project_playmanager_free_agents.md) — activated + class/division gated
- [divisions reset](project_playmanager_divisions_reset.md) — leagues locked, new teams→D, AI+cups wiped (20260709)
