# PlayGame Forge — Memory Index

- [Discover page](project_discover_page.md) — /discover people-discovery page shipped 2026-07-13; reuses get_suggested_follows + fallback; don't rebuild
- [Wrapped + XP ledger](project_wrapped_and_xp_ledger.md) — /wrapped/[username] seasonal recap shipped 2026-07-14; which stats are windowed vs cumulative; xp_events ledger is de-facto empty (don't use for XP-delta)
- [Clan tables live-only drift](project_clan_tables_live_only_drift.md) — clan_* tables exist on live but not in migration replay tree; new migrations referencing them must use plpgsql (not sql) to stay replay-clean
