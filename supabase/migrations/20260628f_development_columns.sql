-- Phase 2: player-development schema foundations (additive, non-destructive).
--   xp                 — accumulated development XP earned by playing matches
--   pending_card_stats — XP-raised mini-stats not yet active in matches (null = no pending);
--                        committed to card_stats only when an OVR upgrade is confirmed via Pro fodder
--   skill_moves_cap    — snapshot of original skill_moves (assistant dev ceiling); null until reset
--   skill_dev_pct      — assistant-driven skill_moves development progress, 0..1

alter table public.pm_players
  add column if not exists xp integer not null default 0,
  add column if not exists pending_card_stats jsonb,
  add column if not exists skill_moves_cap smallint,
  add column if not exists skill_dev_pct numeric not null default 0;

alter table public.pm_players drop constraint if exists pm_players_xp_nonneg;
alter table public.pm_players add constraint pm_players_xp_nonneg check (xp >= 0);

alter table public.pm_players drop constraint if exists pm_players_skill_dev_pct_range;
alter table public.pm_players add constraint pm_players_skill_dev_pct_range check (skill_dev_pct >= 0 and skill_dev_pct <= 1);
