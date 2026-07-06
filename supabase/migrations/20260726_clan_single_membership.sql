-- Enforce the single-clan-per-user invariant at the DB level. It was enforced
-- only in app code (clans/[slug]/manage-actions.ts does a non-transactional
-- SELECT-then-INSERT), so two concurrent request-accepts could both pass the
-- "not already in a clan" check and land one user in two clans. clan_members
-- already has a unique on (clan_id, user_id) — that stops the SAME clan twice,
-- but not membership across DIFFERENT clans. A unique index on user_id alone
-- enforces "at most one clan per user" and makes the racing second insert fail
-- atomically (23505) instead of silently corrupting membership.
-- Verified live before adding: 0 users currently in more than one clan.
create unique index if not exists clan_members_user_id_uniq
  on public.clan_members (user_id);
