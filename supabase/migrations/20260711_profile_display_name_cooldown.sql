-- Fix: profile saves fail with "permission denied for table profiles".
-- Two columns were being written by /api/profile without an UPDATE grant:
--   1. dm_privacy — added in 20260714 but never added to the column UPDATE
--      whitelist from 20260529_profiles_update_grant_lockdown, so every save
--      that set it silently 500'd (masked while the client showed success on
--      any non-username_taken response).
--   2. display_name_changed_at — new column backing the display-name change
--      cooldown.
--
-- dm_privacy is a user-owned preference → safe to add to the UPDATE grant.
-- display_name_changed_at must NOT be user-writable (a user could zero it out
-- to bypass the cooldown), so it is stamped and enforced by a BEFORE UPDATE
-- trigger instead — column-write privileges don't apply to trigger NEW
-- assignments, so authenticated never needs a grant on it.

grant update (dm_privacy) on table public.profiles to authenticated;

-- Enforce a 14-day cooldown on display_name changes and stamp the change time.
-- Admins (moderation renames) bypass the rate limit. Non-display_name updates
-- (xp, last_seen_at, etc.) are untouched — the branch only fires when the name
-- actually changes.
create or replace function public.enforce_display_name_cooldown()
returns trigger
language plpgsql
as $$
begin
  if new.display_name is distinct from old.display_name then
    if old.display_name_changed_at is not null
       and not private.is_admin()
       and now() - old.display_name_changed_at < interval '14 days' then
      raise exception 'display_name change is rate limited'
        using errcode = 'check_violation';
    end if;
    new.display_name_changed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_display_name_cooldown on public.profiles;
create trigger trg_display_name_cooldown
  before update on public.profiles
  for each row
  execute function public.enforce_display_name_cooldown();
