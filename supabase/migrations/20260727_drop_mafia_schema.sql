-- Remove the orphaned "mafia" game schema. It existed as 7 tables + 4 enums with
-- some seed/test rows but ZERO application code anywhere (no route, server
-- action, RPC, or component ever read or wrote them — confirmed by a repo-wide
-- grep). It was flagged by the full-project audit as dead weight; product
-- decision (2026-07-06): drop it rather than build the feature.
--
-- No FK constraints reference these tables from outside (verified: none of the
-- 158 migrations declare a foreign key into mafia_*, and mafia_districts.clan_id
-- / mafia_plots.owner_clan_id are plain uuid columns with no FK to public.clans).
-- CASCADE only to catch each table's own policies/indexes/sequences, not other
-- tables.

drop table if exists public.mafia_action_logs cascade;
drop table if exists public.mafia_battle_logs cascade;
drop table if exists public.mafia_businesses cascade;
drop table if exists public.mafia_feed_events cascade;
drop table if exists public.mafia_players cascade;
drop table if exists public.mafia_plots cascade;
drop table if exists public.mafia_districts cascade;

drop type if exists public.mafia_action_type;
drop type if exists public.mafia_business_type;
drop type if exists public.mafia_class;
drop type if exists public.mafia_feed_type;
