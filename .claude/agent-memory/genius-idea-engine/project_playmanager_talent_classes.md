---
name: playmanager-talent-classes
description: "PlayManager Talent Classes — 6 named tiers over raw talent 1-12, with class-based age-decay offset"
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager talent is now raw 1–12 grouped into **6 named identity classes** (user-chosen names, locked 2026-06-26):

| class | talent | age offset | decay starts | colour |
|-------|--------|-----------|--------------|--------|
| ლეგენდა (legend) | 12 | +4 | 36/40 | gold-bright #fde047 |
| ამომავალი ვარსკვლავი (rising_star) | 11 | +3 | 35/39 | gold #fbbf24 |
| მსოფლიო კლასი (world_class) | 10 | +2 | 34/38 | purple #a855f7 |
| ელიტა (elite) | 7–9 | +1 | 33/37 | blue #38bdf8 |
| ვარსკვლავი (star) | 4–6 | 0 | 32/36 | green #34d399 |
| პრო (pro) | 1–3 | −1 | 31/35 | gray #9aa0aa |

**Mechanic:** one `ageOffset` per class shifts BOTH age-decay thresholds (talent loss + position stat drop) → higher class peaks later and resists the 32/36 decline longer (peak window + decay resistance unified). Offset changes WHEN decay triggers, never the per-position drop magnitude. Transfer value also scales by class (×1.0 pro/star → ×1.35 legend; rising_star keeps historical ×1.202).

**Source of truth:** TS `src/lib/playmanager/talent.ts` (getTalentClass) MUST stay in sync with DB `pm_player_talent_class()` / `pm_player_talent_class_age_offset()`. UI via `TalentClassBadge` (src/components/playmanager/talent-class-badge.tsx). Engine in `pm_advance_time` (migration 20260629). Note: user flagged "ვარსკვლავი" (4–6) sitting below "ელიტა"/"ამომავალი ვარსკვლავი" may confuse players — left as-is for now.

Related: [[playmanager-match-v2-vision]], [[playmanager-tac-attribute]], [[playmanager-pending-migrations]].
